/* Jahresbalance: wie breit oder spezialisiert ist das Trainingsjahr?
   Jeder Orden verteilt sich auf acht Bereiche: Hauptziel 70 %, Nebenziele teilen sich 30 %.
   Testen zählt gleichmäßig für alle Bereiche. Warm-up und Cool-down zählen anteilig nach ihrer Dauer für Beweglichkeit
   (ruhige Cool-downs mit Atemarbeit für Erholung), das Warm-up zur Hälfte, der Rest für die Ziele des Ordens.
   Die Phasen werden nach Tagen im gewählten Zeitraum gewichtet.
   Balance = normierte Shannon-Entropie der Verteilung: 0 = nur ein Bereich, 1 = alle gleich. */
import { FOCUS_BY_ID } from "../data";
import type { Focus, Goal, PlanBlock } from "../types";
import { EQUIPMENT_PRESETS } from "../store";
import { estimateRole } from "./duration";
import { addDays } from "./plan";

export const AXES = [
  { id: "muskel", name: "Muskelaufbau", goals: ["hypertrophy"] },
  { id: "kraft", name: "Kraft", goals: ["strength"] },
  { id: "schnellkraft", name: "Schnellkraft", goals: ["power", "speed"] },
  { id: "kondition", name: "Kondition", goals: ["conditioning", "fatloss"] },
  { id: "ausdauer", name: "Ausdauer", goals: ["endurance"] },
  { id: "skill", name: "Skill", goals: ["skill"] },
  { id: "beweglichkeit", name: "Beweglichkeit", goals: ["mobility"] },
  { id: "ruhe", name: "Erholung", goals: ["wellbeing"] },
] as const;
export type AxisId = (typeof AXES)[number]["id"];

const PRIMARY = 0.7;
const axisOf = (g: Goal): AxisId | null => AXES.find((a) => (a.goals as readonly string[]).includes(g))?.id ?? null;

function add(v: Record<string, number>, g: Goal, w: number) {
  if (g === "test") { for (const a of AXES) v[a.id] = (v[a.id] ?? 0) + w / AXES.length; return; }
  const a = axisOf(g);
  if (a) v[a] = (v[a] ?? 0) + w;
}

/** Verteilung der Ziele eines Ordens (nur Hauptteil, Summe 1) */
export function goalVector(f: Focus): Record<AxisId, number> {
  const v: Record<string, number> = {};
  const sec = f.goals.secondary.filter((g) => g !== f.goals.primary);
  add(v, f.goals.primary, sec.length ? PRIMARY : 1);
  for (const g of sec) add(v, g, (1 - PRIMARY) / sec.length);
  return Object.fromEntries(AXES.map((a) => [a.id, v[a.id] ?? 0])) as Record<AxisId, number>;
}

const FULL = (() => {
  const p = EQUIPMENT_PRESETS[0].make();
  return { ...p, has: Object.fromEntries(Object.keys(p.has).map((k) => [k, true])) as typeof p.has };
})();
const CALM_COOLDOWNS = ["cd_calm"];
const WARMUP_MOBILITY = 0.5;
const cache = new Map<string, Record<AxisId, number>>();

/** Verteilung eines Ordens auf die Bereiche (Summe 1): Hauptteil nach Zielen, Warm-up und Cool-down nach Dauer. */
export function focusVector(f: Focus): Record<AxisId, number> {
  const hit = cache.get(f.id);
  if (hit) return hit;
  if (f.medley?.length) {
    // Harlequin: Mittel der Orden in der Reihe
    const parts = f.medley.map((id) => FOCUS_BY_ID[id]).filter(Boolean).map(focusVector);
    const avg = Object.fromEntries(AXES.map((a) => [a.id, parts.reduce((s, v) => s + v[a.id], 0) / Math.max(1, parts.length)])) as Record<AxisId, number>;
    cache.set(f.id, avg);
    return avg;
  }
  const goals = goalVector(f);
  const v: Record<string, number> = Object.fromEntries(AXES.map((a) => [a.id, 0]));
  let total = 0;
  for (const rk of f.week_4) {
    const role = f.roles[rk];
    if (!role) continue;
    const e = estimateRole(role, FULL);
    // Warm-up ist zur Hälfte Mobilisation, zur Hälfte Vorbereitung auf den Hauptteil
    for (const a of AXES) v[a.id] += goals[a.id] * (e.main + e.warmup * (1 - WARMUP_MOBILITY));
    v.beweglichkeit += e.warmup * WARMUP_MOBILITY;
    const calm = (role.cooldown ?? []).some((c) => CALM_COOLDOWNS.includes(c));
    v[calm ? "ruhe" : "beweglichkeit"] += e.cooldown;
    total += e.total;
  }
  const out = (total ? Object.fromEntries(AXES.map((a) => [a.id, v[a.id] / total])) : goals) as Record<AxisId, number>;
  cache.set(f.id, out);
  return out;
}

export interface Balance {
  share: Record<AxisId, number>;
  /** 0 = spezialisiert, 1 = allround */
  score: number | null;
  label: string;
  /** Wochen mit geplanter Phase im Zeitraum */
  weeks: number;
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

export function balanceOf(plan: PlanBlock[], from: string, to: string): Balance {
  const sum: Record<string, number> = {};
  let total = 0;
  for (const b of plan) {
    const f = FOCUS_BY_ID[b.focusId];
    if (!f) continue;
    const s = b.start > from ? b.start : from;
    const e = b.end < to ? b.end : to;
    if (s > e) continue;
    const d = days(s, e);
    total += d;
    const v = focusVector(f);
    for (const a of AXES) sum[a.id] = (sum[a.id] ?? 0) + v[a.id] * d;
  }
  const share = Object.fromEntries(AXES.map((a) => [a.id, total ? (sum[a.id] ?? 0) / total : 0])) as Record<AxisId, number>;
  if (!total) return { share, score: null, label: "keine Phasen im Zeitraum", weeks: 0 };
  const h = -Object.values(share).filter((p) => p > 0).reduce((acc, p) => acc + p * Math.log(p), 0);
  const score = h / Math.log(AXES.length);
  const label = score < 0.62 ? "spezialisiert" : score < 0.8 ? "mit Schwerpunkt" : "allround";
  return { share, score, label, weeks: Math.round(total / 7) };
}

/** Zeiträume zur Auswahl: das Planjahr ab der ersten Phase und alle berührten Kalenderjahre */
export function balanceWindows(plan: PlanBlock[]): { id: string; label: string; from: string; to: string }[] {
  if (!plan.length) return [];
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const first = sorted[0].start;
  const yearEnd = addDays(`${parseInt(first.slice(0, 4)) + 1}${first.slice(4)}`, -1);
  const out = [{ id: "plan", label: "Planjahr", from: first, to: yearEnd }];
  const years = new Set<number>();
  for (const b of plan) for (let y = parseInt(b.start.slice(0, 4)); y <= parseInt(b.end.slice(0, 4)); y++) years.add(y);
  for (const y of [...years].sort()) out.push({ id: String(y), label: String(y), from: `${y}-01-01`, to: `${y}-12-31` });
  return out;
}

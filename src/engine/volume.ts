/* Sätze pro Muskel und Woche, aus den abgeschlossenen Einheiten. Wertneutral: ein Richtwert, kein Soll. */
import { allRuns, isHunt } from "./runs";
import { SWAP_GROUPS } from "../data";
import musclesJson from "../../data/modules/muscles.json";
import type { AppState, PlanBlock, UserProfile } from "../types";
import { addDays, beastById, blockAt, blockFocus, isTestBlock, isTestWeek, mondayOf, plannedRoles, weekInBlock } from "./plan";
import { beastDose, cardioRange } from "./dose";
import { isDeloaded } from "./deload";

type Share = Record<string, number>;
const M = musclesJson as unknown as { muscles: string[]; groups: Record<string, Share>; exercises: Record<string, Share>; patterns: [string, Share][] };
export const MUSCLES = M.muscles;
const PATTERNS = M.patterns.map(([rx, s]) => ({ rx: new RegExp(rx, "i"), s }));

export function musclesOf(name: string): Share {
  if (M.exercises[name]) return M.exercises[name];
  for (const [g, members] of Object.entries(SWAP_GROUPS)) if (members.includes(name) && M.groups[g]) return M.groups[g];
  return PATTERNS.find((p) => p.rx.test(name))?.s ?? {};
}

/** Bestien zählen nach Päckchen (dose.ts): Wiederholungen am Stück je Niveau, ein Päckchen = ein halber Satz.
    Laufen, Rudern, Pausen zählen nicht als Sätze. */
export { BEAST_FACTOR } from "./dose";
const DEFAULT_USER = { level: "fortgeschritten" } as UserProfile;
export function beastSets(id: string, user: UserProfile = DEFAULT_USER, state?: Pick<AppState, "packets" | "tests">): Share {
  const b = beastById(id);
  return b ? beastDose(b, user, state) : {};
}

/** Richtwert nach Erfahrung, oder der eigene */
export function volumeRange(u: UserProfile): [number, number] {
  if (u.volumeRange) return u.volumeRange;
  return u.level === "einsteiger" ? [6, 10] : u.level === "erfahren" ? [12, 20] : [10, 16];
}

/** Erhaltung: in etwa die Hälfte des unteren Richtwerts. Erhaltung gelingt meist schon mit einem Drittel bis der Hälfte des Aufbauvolumens, darunter wird Halten von Kraft und Masse knapp. */
export function maintenanceVolume(u: UserProfile): number {
  return volumeRange(u)[0] / 2;
}

export interface WeekVolume { monday: string; sessions: number; sets: Record<string, number>; running: boolean }

/** Wochen mit Einheiten, neueste zuerst */
export function weeklyVolume(state: AppState, today: string): WeekVolume[] {
  const byWeek = new Map<string, WeekVolume>();
  for (const s of state.sessions.filter((x) => x.done)) {
    const mon = mondayOf(s.date);
    const w = byWeek.get(mon) ?? { monday: mon, sessions: 0, sets: {}, running: addDays(mon, 6) >= today };
    if (!isHunt(s)) w.sessions += 1;
    for (const e of Object.values(s.entries)) {
      if (e.prog === "none") continue;
      const n = e.sets.filter((x) => x.done).length;
      if (!n) continue;
      for (const [m, f] of Object.entries(musclesOf(e.name))) w.sets[m] = (w.sets[m] ?? 0) + n * f;
    }
    // Bestien: halb gezählt
    const runs = allRuns(s).filter((x) => !!x.seconds);
    for (const r of runs) for (const [m, v] of Object.entries(beastSets(r.id, state.user, state))) w.sets[m] = (w.sets[m] ?? 0) + v;
    byWeek.set(mon, w);
  }
  return [...byWeek.values()].sort((a, b) => b.monday.localeCompare(a.monday));
}

/* ---------- Volumen Soll-Ist (1.25) ---------- */

/** Geplante Sätze je Muskel der Ordenswoche (alle Rollen, Bestien nach Päckchen). Entlastungs- und Testwochen: null. */
export function plannedVolume(state: AppState, block: PlanBlock, week: number): Record<string, number> | null {
  const f = blockFocus(block);
  if (!f || isTestBlock(block) || isTestWeek(f, block, week) || isDeloaded(state, block, week)) return null;
  const out: Record<string, number> = {};
  for (const r of plannedRoles(state, block, week)) for (const [m, v] of Object.entries(r.sets)) out[m] = (out[m] ?? 0) + v;
  return out;
}

export interface VolumeNow {
  block: PlanBlock; week: number;
  /** "deload" | "test": Volumen zählt diese Woche nicht */
  skip: "deload" | "test" | null;
  planned: Record<string, number>; done: Record<string, number>;
  /** Zielband: Richtwert, im Defizit Erhaltung bis unterer Richtwert */
  band: [number, number]; maint: number; deficit: boolean;
  cardio: { planned: number; done: number; range: [number, number] };
}

/** Die laufende Woche für die Karte im Stand: geplant (Umriss) gegen erledigt (gefüllt) */
export function volumeNow(state: AppState, today: string): VolumeNow | null {
  const block = blockAt(state.plan, today);
  if (!block) return null;
  const week = weekInBlock(block, today);
  const f = blockFocus(block);
  const [lo, hi] = volumeRange(state.user);
  const maint = maintenanceVolume(state.user);
  const deficit = block.kcal === "deficit";
  const base = { block, week, band: (deficit ? [maint, lo] : [lo, hi]) as [number, number], maint, deficit, cardio: { planned: 0, done: 0, range: cardioRange(state.user) } };
  if (isTestBlock(block) || (f && isTestWeek(f, block, week))) return { ...base, skip: "test", planned: {}, done: {} };
  if (isDeloaded(state, block, week)) return { ...base, skip: "deload", planned: {}, done: {} };
  const roles = plannedRoles(state, block, week);
  const planned: Record<string, number> = {};
  for (const r of roles) for (const [m, v] of Object.entries(r.sets)) planned[m] = (planned[m] ?? 0) + v;
  const done = weeklyVolume(state, today).find((w) => w.monday === mondayOf(today))?.sets ?? {};
  const doneRoles = new Set(state.sessions.filter((s) => s.done && s.blockId === block.id && s.week === week).map((s) => s.role));
  const cardio = { planned: roles.reduce((n, r) => n + r.cardio, 0), done: roles.filter((r) => doneRoles.has(r.role)).reduce((n, r) => n + r.cardio, 0), range: cardioRange(state.user) };
  return { ...base, skip: null, planned, done, cardio };
}

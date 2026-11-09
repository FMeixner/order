/* Entlastungswoche: eine Woche halbe Sätze, keine Bestien. Gewichte, Übungen und Trainingstage bleiben, wie sie sind.
   Die App empfiehlt sie nach Rhythmus (alle vier Wochen, ab der fünften Woche, in Phasen ab acht Wochen)
   oder nach Signalen (dreimal „zu schwer“ in vierzehn Tagen) — nie in eine Testwoche hinein und nie dicht
   nach einer Test-, Entlastungs- oder Deload-Woche. Angenommen wird sie als Wochenzustand, widerrufbar. */
import type { AppState, Block, Choice, Focus, PlanBlock, Role, Slot } from "../types";
import { addDays, blockFocus, blockWeeks, isDeloadWeek, isTestBlock, isTestWeek } from "./plan";

export const deloadKey = (b: PlanBlock, week: number) => `${b.id}:${week}`;

/** Läuft diese Blockwoche als Entlastungswoche? */
export function isDeloaded(state: AppState, b: PlanBlock, week: number): boolean {
  return state.deload?.[deloadKey(b, week)] === "ja";
}

/** Entlastungswoche annehmen, ablehnen oder widerrufen („nein“ hält die Empfehlung dieser Woche zurück) */
export function setDeload(state: AppState, b: PlanBlock, week: number, v: "ja" | "nein"): AppState {
  const deload = { ...(state.deload ?? {}) };
  deload[deloadKey(b, week)] = v;
  return { ...state, deload };
}

/** Sätze halbieren, mindestens zwei. Ohne Satzangabe bleibt die Dosis, wie sie ist. */
const half = (n: number | undefined): number | undefined => (n == null ? undefined : Math.max(2, Math.ceil(n / 2)));
const halfChoice = (c: Choice | string | null | undefined): Choice | string | null | undefined =>
  typeof c === "object" && c ? { ...c, sets: half(c.sets) } : c;
const halfSlot = (s: Slot): Slot => ({ ...s, sets: half(s.sets), home: halfChoice(s.home), reise: halfChoice(s.reise) });

/** Bestien ruhen, Supersets behalten ihr Superset (kein Finisher), Module und Kernübungen bleiben. */
function halfBlock(b: Block): Block | null {
  switch (b.type) {
    case "beast": return null;
    case "single": return { ...b, slot: halfSlot(b.slot) };
    case "superset": return { ...b, slots: b.slots.map(halfSlot), finisher: undefined };
    case "contrast": return { ...b, heavy: halfSlot(b.heavy), explosive: halfSlot(b.explosive) };
    default: return b;
  }
}

/** Wochenform einer Entlastungswoche: halbe Sätze, keine Bestien, kein Finisher. Verändert das Original nicht. */
export function deloadShape(f: Focus): Focus {
  const roles: Record<string, Role> = {};
  for (const [k, r] of Object.entries(f.roles)) {
    roles[k] = { ...r, blocks: r.blocks.map(halfBlock).filter((b): b is Block => b !== null) };
  }
  return { ...f, roles };
}

export interface DeloadAdvice { why: "rhythmus" | "signale"; count: number }

/** Empfehlung für diese Blockwoche: null, wenn keine nötig oder schon entschieden ist. */
export function deloadAdvice(state: AppState, b: PlanBlock, week: number, today: string): DeloadAdvice | null {
  const f = blockFocus(b);
  const total = blockWeeks(b);
  if (!f || week < 1 || week > total) return null;
  if (state.deload?.[deloadKey(b, week)] !== undefined) return null;
  if (isDeloadWeek(f, week) || isTestWeek(f, b, week) || isTestWeek(f, b, week + 1) || isTestWeek(f, b, week - 1)) return null;
  // Dichte Ruhe: keine Entlastung dicht nach der letzten (Test-, Entlastungs- oder Deload-Woche)
  for (let w = Math.max(1, week - 3); w < week; w++) {
    if (state.deload?.[deloadKey(b, w)] === "ja" || isDeloadWeek(f, w) || isTestWeek(f, b, w)) return null;
  }
  // Rhythmus: ab der fünften Woche alle vier Wochen (5, 9, 13 …), in Phasen ab acht Wochen.
  // In einer Klammer zählt die Klammer, nicht der Teil: Teile von vier bis sechs Wochen bekämen sonst nie Entlastung.
  const k = klammerWeek(state.plan, b, week);
  const kTotal = k?.total ?? total, kWeek = k?.week ?? week;
  if (kTotal >= 8 && rhythmWeeks(state.plan, b, kTotal).includes(kWeek)) return { why: "rhythmus", count: 0 };
  // Signale: dreimal „zu schwer“ in den letzten vierzehn Tagen
  const cutoff = addDays(today, -14);
  const count = state.sessions
    .filter((s) => s.date >= cutoff)
    .reduce((n, s) => n + Object.values(s.entries ?? {}).filter((e) => e.feedback === "zuschwer").length, 0);
  if (week >= 3 && count >= 3) return { why: "signale", count };
  return null;
}

/** Rhythmus-Wochen einer Klammer (Klammerwochen): ab der fünften alle vier Wochen. Liegt ein Ordenswechsel
    höchstens zwei Wochen daneben, rastet die Entlastung auf die erste Woche des neuen Ordens ein — der Einstieg in
    neue Übungen ist leicht, und kein Orden wird mitten in seinem Aufbau unterbrochen. */
export function rhythmWeeks(plan: PlanBlock[], b: PlanBlock, total: number): number[] {
  const starts: number[] = [];
  let hasTest = false;
  if (b.meso && b.klammer) {
    const parts = plan.filter((x) => x.meso === b.meso && !isTestBlock(x)).sort((x, y) => x.start.localeCompare(y.start));
    let w = 1;
    for (const p of parts) { if (w > 1) starts.push(w); w += blockWeeks(p); }
    hasTest = plan.some((x) => x.meso === b.meso && isTestBlock(x));
  }
  const out: number[] = [];
  for (let w = 5; w <= total; ) {
    const snap = starts.find((s) => Math.abs(s - w) <= 2 && s >= 4 && (out.length === 0 || s - out[out.length - 1] >= 4));
    const at = snap ?? w;
    // Nie direkt vor der Testwoche: Die Testwoche entlastet selbst, und ein Tapering davor würde die Werte schönen
    if (hasTest && at >= total) break;
    out.push(at);
    w = at + 4;
  }
  return out;
}

/** Woche innerhalb der Klammer und deren Trainingswochen (ohne Testwoche); null außerhalb einer Klammer */
export function klammerWeek(plan: PlanBlock[], b: PlanBlock, week: number): { week: number; total: number } | null {
  if (!b.meso || !b.klammer) return null;
  const parts = plan.filter((x) => x.meso === b.meso && !isTestBlock(x)).sort((x, y) => x.start.localeCompare(y.start));
  if (!parts.length) return null;
  const before = parts.filter((x) => x.end < b.start).reduce((s, x) => s + blockWeeks(x), 0);
  return { week: before + week, total: parts.reduce((s, x) => s + blockWeeks(x), 0) };
}

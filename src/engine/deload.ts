/* Entlastungswoche: eine Woche halbe Sätze, keine Bestien. Gewichte, Übungen und Trainingstage bleiben, wie sie sind.
   Die App empfiehlt sie nach Rhythmus (alle vier Wochen, ab der fünften Woche, in Phasen ab acht Wochen)
   oder nach Signalen (dreimal „zu schwer“ in vierzehn Tagen) — nie in eine Testwoche hinein und nie dicht
   nach einer Test-, Entlastungs- oder Deload-Woche. Angenommen wird sie als Wochenzustand, widerrufbar. */
import type { AppState, Block, Choice, Focus, PlanBlock, Role, Slot } from "../types";
import { addDays, blockFocus, blockWeeks, isDeloadWeek, isTestWeek } from "./plan";

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
    case "menu": {
      const options: Record<string, Slot> = {};
      for (const [k, s] of Object.entries(b.options)) options[k] = halfSlot(s);
      return { ...b, options };
    }
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
  // Rhythmus: ab der fünften Woche alle vier Wochen (5, 9, 13 …), in Phasen ab acht Wochen
  if (total >= 8 && week >= 5 && (week - 1) % 4 === 0) return { why: "rhythmus", count: 0 };
  // Signale: dreimal „zu schwer“ in den letzten vierzehn Tagen
  const cutoff = addDays(today, -14);
  const count = state.sessions
    .filter((s) => s.date >= cutoff)
    .reduce((n, s) => n + Object.values(s.entries ?? {}).filter((e) => e.feedback === "zuschwer").length, 0);
  if (week >= 3 && count >= 3) return { why: "signale", count };
  return null;
}

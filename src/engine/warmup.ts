/* Aufwärmsätze nach Last und Verletzungsrisiko, nicht nach Wiederholungen oder Mehrgelenkigkeit:
   - Langhantel ab 50 kg: ein Satz, ab 80 kg zwei (Bench Press mit 90 kg: zwei).
   - Maschine ab 80 kg: ein Satz (Beinpresse mit 90 kg ja, Brustpresse mit 50 kg nein).
   - Kurzhantel oder Kettlebell ab 24 kg je Hantel: ein Satz (DB Deadlift mit 2 × 36 kg ja, Goblet Lunge mit 20 kg nein).
   - Nie: Kabel, Körpergewicht, Bänder und schwungvolle Übungen (Swing, Snatch, Clean, Sprünge, Würfe).
   - Noch kein Arbeitsgewicht bekannt: nur Mehrgelenksübungen mit Langhantel einen Satz. Für die Zeitschätzung (ohne Gewichte) zählt jede Mehrgelenksübung mit Last einen, schwere Langhantel (bis 6 Wdh oder Top-Satz) zwei.
   Je Körperhälfte bekommt nur die erste so schwere Übung des Tages Aufwärmsätze; danach ist man warm.
   Gewicht: 50 % × 8 bei einem Satz; bei zwei 50 % × 5 und 75 % × 3, auf eine vorhandene Last gelegt. */
import type { EquipmentProfile } from "../types";
import type { Resolved } from "./resolve";
import { parseReps } from "./resolve";
import { snapNearest } from "./loads";
import { musclesOf } from "./volume";

const LOADED = new Set(["barbell", "dumbbell", "kettlebell", "machine", "cable"]);
const LOWER = new Set(["Quadrizeps", "Beinbeuger", "Gesäß", "Waden"]);
const UPPER = new Set(["Brust", "Rücken", "Schultern", "Bizeps", "Trizeps"]);
/** Pause zwischen Aufwärmsatz und erstem Arbeitssatz */
export const WARM_REST = 30;

type Half = "unten" | "oben";
/** Körperhälfte einer Mehrgelenksübung (mindestens zwei Muskeln), sonst null */
export function halfOf(name: string): Half | null {
  const m = Object.entries(musclesOf(name)).filter(([k]) => LOWER.has(k) || UPPER.has(k));
  if (m.length < 2) return null;
  const lo = m.filter(([k]) => LOWER.has(k)).reduce((s, [, v]) => s + v, 0);
  const up = m.filter(([k]) => UPPER.has(k)).reduce((s, [, v]) => s + v, 0);
  return lo >= up ? "unten" : "oben";
}

type Slotish = Pick<Resolved, "key" | "name" | "kind" | "equip" | "loadable" | "reps" | "prog">;
const BALLISTIC = /swing|snatch|clean|jerk|jump|throw|slam|push press/i;
/** Aufwärmsätze für diese Übung bei diesem Arbeitsgewicht (kg je Hantel; null: noch unbekannt; undefined: Schätzung ohne Gewichte) */
export function warmCount(r: Slotish, kg: number | null | undefined): number {
  if (r.kind !== "strength" || !r.loadable || !LOADED.has(r.equip) || r.equip === "cable" || BALLISTIC.test(r.name)) return 0;
  // Zeitschätzung ohne Gewichte (undefined): Mehrgelenksübungen mit Last zählen einen Satz
  if (kg === undefined) return !halfOf(r.name) ? 0 : r.equip === "barbell" && ((parseReps(r.reps).hi ?? 99) <= 6 || r.prog === "topset") ? 2 : 1;
  if (kg == null || kg <= 0) return r.equip === "barbell" && halfOf(r.name) ? 1 : 0;
  if (r.equip === "barbell") return kg >= 80 ? 2 : kg >= 50 ? 1 : 0;
  if (r.equip === "machine") return kg >= 80 ? 1 : 0;
  return kg >= 24 ? 1 : 0;
}
/** Körperhälfte für die Frage „schon warm?“: auch Übungen mit nur einem Hauptmuskel */
function sideOf(name: string): Half | null {
  const m = Object.entries(musclesOf(name));
  const lo = m.filter(([k]) => LOWER.has(k)).reduce((s, [, v]) => s + v, 0);
  const up = m.filter(([k]) => UPPER.has(k)).reduce((s, [, v]) => s + v, 0);
  return lo || up ? (lo >= up ? "unten" : "oben") : null;
}
/** Schlüssel der Übungen, die heute Aufwärmsätze bekommen (Reihenfolge der Einheit), mit Anzahl der Sätze */
export function warmupKeys(list: Slotish[], kgOf: (r: Slotish) => number | null | undefined = () => undefined): Map<string, number> {
  const warm = new Set<Half>();
  const out = new Map<string, number>();
  for (const r of list) {
    const n = warmCount(r, kgOf(r));
    const h = sideOf(r.name);
    if (!n || !h || warm.has(h)) continue;
    warm.add(h);
    out.set(r.key, n);
  }
  return out;
}

export interface WarmSet { reps: number; pct: number; kg: number | null }
/** Aufwärmsätze: Wiederholungen und Gewicht (kg null: noch kein Arbeitsgewicht bekannt) */
export function warmupSets(r: Pick<Resolved, "equip">, work: number | null, p: EquipmentProfile, n = 1): WarmSet[] {
  const plan: [number, number][] = n >= 2 ? [[5, 0.5], [3, 0.75]] : [[8, 0.5]];
  return plan.map(([reps, pct]) => ({ reps, pct, kg: work != null && work > 0 ? snapNearest(p, r.equip, work * pct) : null }));
}

/** Geschätzte Sekunden je Aufwärmsatz: Arbeit, Umstecken, 30 s Pause */
export const WARM_SEC = 8 * 3.5 + 20 + WARM_REST;

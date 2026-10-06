/* Aufwärmsatz: ein leichter Satz vor der ersten schweren Mehrgelenksübung jeder Körperhälfte am Tag.
   Montags Beinpresse ja, die Beinbeuger danach nicht. Freitags die erste Brustpresse ja, die übrigen Oberkörperübungen nicht.
   Gewicht: die Hälfte des Arbeitsgewichts × 8, auf eine vorhandene Last gelegt.
   Schwere Langhantel (≤ 6 Wdh oder Top-Satz): zwei Steigerungssätze, 50 % × 5 und 75 % × 3. */
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
/** Schwere Langhantel: zwei Steigerungssätze statt einem */
export const heavyLift = (r: Pick<Resolved, "equip" | "reps" | "prog">) => r.equip === "barbell" && ((parseReps(r.reps).hi ?? 99) <= 6 || r.prog === "topset");
/** Schlüssel der Übungen, die heute Aufwärmsätze bekommen (Reihenfolge der Einheit), mit Anzahl der Sätze */
export function warmupKeys(list: Slotish[]): Map<string, number> {
  const warm = new Set<Half>();
  const out = new Map<string, number>();
  for (const r of list) {
    if (r.kind !== "strength" || !r.loadable || !LOADED.has(r.equip)) continue;
    const h = halfOf(r.name);
    if (!h || warm.has(h)) continue;
    warm.add(h);
    out.set(r.key, heavyLift(r) ? 2 : 1);
  }
  return out;
}

export interface WarmSet { reps: number; pct: number; kg: number | null }
/** Aufwärmsätze: Wiederholungen und Gewicht (kg null: noch kein Arbeitsgewicht bekannt) */
export function warmupSets(r: Pick<Resolved, "equip" | "reps" | "prog">, work: number | null, p: EquipmentProfile): WarmSet[] {
  const plan: [number, number][] = heavyLift(r) ? [[5, 0.5], [3, 0.75]] : [[8, 0.5]];
  return plan.map(([reps, pct]) => ({ reps, pct, kg: work != null && work > 0 ? snapNearest(p, r.equip, work * pct) : null }));
}

/** Geschätzte Sekunden je Aufwärmsatz: Arbeit, Umstecken, 30 s Pause */
export const WARM_SEC = 8 * 3.5 + 20 + WARM_REST;

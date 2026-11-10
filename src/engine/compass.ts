/* Kompass (1.18): Wo stehe ich im Jahr? Eine Zeile auf der Heute-Karte statt eines eigenen Bildschirms:
   Zeichen der Phase, Kalorien-Modus, Alltagslast dieser Woche (nur wenn hoch) und was als Nächstes kommt. */
import type { AppState, Kcal, KlammerId, Load, PlanBlock } from "../types";
import { blockWeeks, focusName, isTestBlock } from "./plan";
import { dauerlast, weekLoad } from "./weekplan";

export interface Compass {
  klammer?: KlammerId;
  kcal?: Kcal;
  load: Load;
  /** Dauerlast: mittlere Last schon lange — der Orden läuft mit mehr geführten Übungen */
  dauer: boolean;
  /** Was nach dieser Phase kommt und in wie vielen Wochen (0 = nächste Woche) */
  next?: { label: string; test: boolean; weeks: number };
}

export function compassOf(state: Pick<AppState, "plan" | "sections">, b: PlanBlock, week: number): Compass {
  const after = [...state.plan].filter((x) => x.start > b.end).sort((a, c) => a.start.localeCompare(c.start))[0];
  const left = Math.max(0, blockWeeks(b) - week);
  return {
    klammer: b.klammer,
    kcal: b.kcal,
    load: weekLoad(state.sections, b, week),
    dauer: dauerlast(state.sections, b),
    next: after ? { label: isTestBlock(after) ? "Testwoche" : focusName(after.focusId), test: isTestBlock(after), weeks: left } : undefined,
  };
}

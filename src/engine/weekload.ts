/* Alltagslast einer Woche, ohne Abhängigkeit vom Wochenplan (auch für deload.ts). */
import type { Load, PlanBlock, Section } from "../types";
import { addDays } from "./plan";

/** Alltagslast einer Woche (1.18): Die Phase trägt eine Last für ihre ganze Dauer (Mehrheit der Wochen). Liegt eine
    einzelne Woche in einem Lebensabschnitt mit höherer Last (Prüfungen mitten in einer ruhigen Phase), gilt für diese
    Woche die höhere. Nie niedriger als die Phase: Wer die Phase von Hand auf hoch stellt, behält hoch. */
const LOAD_RANK: Record<Load, number> = { low: 0, medium: 1, high: 2 };
export function weekLoad(sections: Section[] | undefined, b: PlanBlock, week: number): Load {
  const d = addDays(b.start, 7 * (week - 1));
  const s = sections?.find((x) => x.start <= d && x.end >= d) ?? sections?.find((x) => x.start <= addDays(d, 6) && x.end >= d);
  return s && LOAD_RANK[s.load] > LOAD_RANK[b.load] ? s.load : b.load;
}

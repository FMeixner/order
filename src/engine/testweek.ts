/* Testwoche: wann ein Cup verdient ist (1.36). Ein Cup ist erst erledigt, wenn jeder seiner Tests einen Wert hat
   oder bewusst ausgelassen wurde (z. B. ohne Material); die Bestie auf Zeit zählt nicht. */
import { TESTWEEK } from "../data";
import type { AppState, Cup, PlanBlock } from "../types";

export const testDone = (state: AppState, block: PlanBlock, id: string): boolean =>
  (state.tests[id] ?? []).some((r) => r.blockId === block.id) || !!state.testSkips?.[`${block.id}:${id}`];

export function cupDone(state: AppState, block: PlanBlock, cup: Cup): boolean {
  return cup.tests.every((t) => testDone(state, block, t.id));
}

/** Testwerte im Verlauf der Übungen (1.37): 5RM als Satz mit 5 Wiederholungen und Gewicht (zählt für das 1RM),
    Max-Wiederholungen und Haltezeiten als Satz der Übung. Zuordnung im Test unter `log`. */
export interface TestLogEntry { date: string; exercise: string; sets: { reps?: number; weight?: number | null; seconds?: number; done: true }[]; test: string }
export function testLog(state: AppState): TestLogEntry[] {
  const out: TestLogEntry[] = [];
  for (const cup of TESTWEEK.cups) for (const t of cup.tests) {
    if (!t.log) continue;
    for (const r of state.tests[t.id] ?? []) {
      const ex = typeof t.log.exercise === "string" ? t.log.exercise : t.log.exercise[r.variant ?? t.variants?.[0]?.id ?? ""];
      if (!ex) continue;
      const set = t.unit === "s" ? { seconds: r.value, done: true as const }
        : t.log.reps ? { reps: t.log.reps, weight: r.value, done: true as const }
        : { reps: r.value, done: true as const };
      out.push({ date: r.date, exercise: ex, sets: [set], test: t.name });
    }
  }
  return out;
}

/* Testwoche: wann ein Cup verdient ist (1.36). Ein Cup ist erst erledigt, wenn jeder seiner Tests einen Wert hat
   oder bewusst ausgelassen wurde (z. B. ohne Material); die Bestie auf Zeit zählt nicht.
   Nachholen (1.38): Versäumte Cups lassen sich über den Almanach jederzeit absolvieren — Speichern und
   Auslassen laufen dafür über dieselben Regeln wie in der Testwoche selbst. */
import { TESTWEEK } from "../data";
import type { AppState, Cup, PlanBlock, TestResult } from "../types";
import { addDays, isTestBlock } from "./plan";

export const testDone = (state: AppState, block: PlanBlock, id: string): boolean =>
  (state.tests[id] ?? []).some((r) => r.blockId === block.id) || !!state.testSkips?.[`${block.id}:${id}`];

export function cupDone(state: AppState, block: PlanBlock, cup: Cup): boolean {
  return cup.tests.every((t) => testDone(state, block, t.id));
}

/** Testwert einer Testwoche speichern (1.38, gemeinsame Stelle für Testwoche und Nachholen): ein Wert je Test,
    Variante und Testwoche (blockId) — ein neuer Wert korrigiert den alten, das Auslassen hebt sich auf. */
export function saveTestResult(st: AppState, blockId: string, id: string, value: number, raw: string, date: string, variant?: string): AppState {
  const keep = (st.tests[id] ?? []).filter((r) => !(r.blockId === blockId && (r.variant ?? "") === (variant ?? "")));
  const { [`${blockId}:${id}`]: _drop, ...skips } = st.testSkips ?? {};
  const entry: TestResult = { date, blockId, value, raw, ...(variant ? { variant } : {}) };
  return { ...st, testSkips: skips, tests: { ...st.tests, [id]: [...keep, entry] } };
}

/** Test einer Testwoche auslassen („z. B. ohne Material“) oder das Auslassen zurücknehmen */
export function skipTestResult(st: AppState, blockId: string, id: string, on: boolean): AppState {
  const { [`${blockId}:${id}`]: _drop, ...rest } = st.testSkips ?? {};
  return { ...st, testSkips: on ? { ...rest, [`${blockId}:${id}`]: true } : rest };
}

/** Ziel des Nachholens (1.38): die jüngste begonnene Testwoche mit offenen Cups — die laufende zählt mit,
    ist alles verdient, gibt es nichts nachzuholen. */
export function openCupTarget(state: AppState, today: string): PlanBlock | null {
  const open = state.plan.filter((b) => isTestBlock(b) && b.start <= today && TESTWEEK.cups.some((c) => !cupDone(state, b, c)));
  return open.sort((a, b) => b.start.localeCompare(a.start))[0] ?? null;
}

/** Testwoche vorzeitig abschließen (1.39): Cups verdient oder ausgelassen, aber die Woche läuft noch —
    dann endet sie gestern (frühestens heute, dem Starttag) und der folgende Orden beginnt sofort, als
    Anlaufwoche mit den Einheiten ab heute (1.38). Offene Cups bleiben nachholbar (Almanach › Cups);
    das Urteil des Turniers gibt es nur in der Testwoche selbst. */
export function closeTestWeek(st: AppState, block: PlanBlock, today: string): AppState {
  if (today < block.start || today > block.end) return st;
  const end = today > block.start ? addDays(today, -1) : block.start;
  const start = addDays(end, 1);
  const after = st.plan.filter((b) => b.start > block.end && !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start))[0];
  return { ...st, plan: st.plan.map((b) => (b.id === block.id ? { ...b, end } : after && b.id === after.id && b.start > start ? { ...b, start } : b)) };
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

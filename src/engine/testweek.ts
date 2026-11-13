/* Testwoche: wann ein Cup verdient ist (1.36). Ein Cup ist erst erledigt, wenn jeder seiner Tests einen Wert hat
   oder bewusst ausgelassen wurde (z. B. ohne Material); die Bestie auf Zeit zählt nicht.
   Nachholen (1.38): Versäumte Cups lassen sich über den Almanach jederzeit absolvieren — Speichern und
   Auslassen laufen dafür über dieselben Regeln wie in der Testwoche selbst. */
import { TESTWEEK } from "../data";
import type { AppState, Cup, PlanBlock, TestDef, TestResult, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { addDays, isTestBlock, mondayOf, scheduleFor, trainingDays } from "./plan";

/** Testtage (1.3): auf deine Trainingstage verteilt — Studio zuerst, Zuhause in der Mitte, Park zuletzt (gern am
    Wochenende). Studio ist der Tag, dessen Ort eine Langhantel hat oder „Studio“ heißt. Orte ohne Cup entfallen (1.47). */
export function testDays(state: AppState, block: PlanBlock): { place: string; day: Weekday; date: string }[] {
  const days = trainingDays(state, block);
  const sch = scheduleFor(state, block);
  const prof = (d: Weekday) => state.equipment.find((p) => p.id === sch[d]);
  const isGym = (d: Weekday) => { const p = prof(d); return !!p && (!!p.barbell || /studio|gym/i.test(p.name)); };
  const pool: Weekday[] = days.length >= 3 ? days : (WEEKDAYS.filter((_, i) => i % 2 === 0) as Weekday[]);
  const studio = pool.find(isGym) ?? pool[0];
  const rest = pool.filter((d) => d !== studio);
  const park = [...rest].reverse().find((d) => d === "Sa" || d === "So") ?? rest[rest.length - 1];
  const home = rest.filter((d) => d !== park).find((d) => !isGym(d)) ?? rest.find((d) => d !== park) ?? rest[0];
  const at = (d: Weekday) => addDays(mondayOf(block.start), WEEKDAYS.indexOf(d));
  const places = new Set(TESTWEEK.cups.map((c) => c.place));
  return [{ place: "Studio", day: studio, date: at(studio) }, { place: "Zuhause", day: home, date: at(home) }, { place: "Park", day: park, date: at(park) }]
    .filter((t) => places.has(t.place))
    .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));
}

const CUP_OF_TEST = new Map(TESTWEEK.cups.flatMap((c) => c.tests.map((t) => [t.id, c] as const)));
const GEAR_NAME: Record<string, string> = { medball: "Medizinball", rower: "Rudergerät", bike: "Rad", box: "Box", sprint: "Sprintstrecke", run: "Laufstrecke" };
/** Fehlt die Ausrüstung des Tests im Profil seines Testtags? Dann entfällt er von selbst (1.47) — Klartext oder null. */
export function testMissingGear(state: AppState, block: PlanBlock, t: TestDef): string | null {
  if (!t.needs) return null;
  const cup = CUP_OF_TEST.get(t.id);
  const day = cup && testDays(state, block).find((d) => d.place === cup.place);
  const prof = day ? state.equipment.find((p) => p.id === scheduleFor(state, block)[day.day]) : state.equipment[0];
  if (!prof || prof.has[t.needs]) return null;
  return `Kein ${GEAR_NAME[t.needs] ?? t.needs} im Profil „${prof.name}“ – der Test entfällt.`;
}

export const testDone = (state: AppState, block: PlanBlock, id: string): boolean =>
  (state.tests[id] ?? []).some((r) => r.blockId === block.id) || !!state.testSkips?.[`${block.id}:${id}`]
  || (() => { const t = CUP_OF_TEST.get(id)?.tests.find((x) => x.id === id); return !!t && !!testMissingGear(state, block, t); })();

/** Zeit der Bestie in dieser Testwoche (beim Nachholen zählt auch eine spätere) */
export function benchmarkTime(state: AppState, block: PlanBlock, cup: Cup, today?: string): number | null {
  if (!cup.benchmark) return null;
  const end = today && today > block.end ? today : block.end;
  const hits = cup.benchmark.pool.flatMap((id) => state.beastTimes[id] ?? []).filter((x) => x.date >= block.start && x.date <= end);
  return hits.length ? hits[hits.length - 1].seconds : null;
}

/** Ein Cup ist verdient, wenn jeder Test einen Wert hat oder ausgelassen ist. Ein Cup nur aus einer Bestie auf Zeit
    (Arondight seit 1.47) braucht die Zeit dieser Testwoche oder ein bewusstes Auslassen. */
export function cupDone(state: AppState, block: PlanBlock, cup: Cup, today?: string): boolean {
  if (!cup.tests.length && cup.benchmark) return benchmarkTime(state, block, cup, today) != null || !!state.testSkips?.[`${block.id}:${cup.id}`];
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

/** Für das Nachholen (1.49): Hat der Test einen Wert (oder entfällt mangels Gerät)? Ausgelassenes bleibt offen. */
export const testMeasured = (state: AppState, block: PlanBlock, id: string): boolean =>
  (state.tests[id] ?? []).some((r) => r.blockId === block.id)
  || (() => { const t = CUP_OF_TEST.get(id)?.tests.find((x) => x.id === id); return !!t && !!testMissingGear(state, block, t); })();

/** Cup komplett gemessen (1.49): jeder Test mit Wert; ein Cup nur aus einer Bestie mit Zeit. Für den Almanach. */
export function cupMeasured(state: AppState, block: PlanBlock, cup: Cup, today?: string): boolean {
  if (!cup.tests.length && cup.benchmark) return benchmarkTime(state, block, cup, today) != null;
  return cup.tests.every((t) => testMeasured(state, block, t.id));
}

/** Ziel des Nachholens (1.38): die jüngste begonnene Testwoche mit offenen Tests — die laufende zählt mit.
    Seit 1.49 bleibt auch Ausgelassenes offen (etwa der Cooper-Test bei Eis), bis es einen Wert hat. */
export function openCupTarget(state: AppState, today: string): PlanBlock | null {
  const open = state.plan.filter((b) => isTestBlock(b) && b.start <= today && TESTWEEK.cups.some((c) => !cupMeasured(state, b, c, today)));
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
  for (const t of [...TESTWEEK.cups.flatMap((c) => c.tests), ...(TESTWEEK.retired ?? [])]) {
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

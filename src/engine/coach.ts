/* Coach-Jahres-Füllung: Ziel sagen, Marken setzen — ein Klick füllt das Restjahr mit Mesozyklen.
   Die Form folgt der Alltagslast der Abschnitte (kurze Teile bei hoher Last, das Triple in ruhigen),
   die Orden folgen der Empfehlung mit Ketten-Bindung, Testwochen folgen der eingestellten Regel,
   jeder Teil bekommt einen Kalorien-Vorschlag. Vergangenes und die laufende Phase bleiben unberührt;
   alles dahinter ist ein Vorschlag — jede Phase lässt sich ändern wie immer. */
import { FOCUS_BY_ID } from "../data";
import type { Focus, Load, PlanBlock, Section } from "../types";
import { addDays, isTestBlock, mondayOf } from "./plan";
import { loadOfWindow, newMeso, setTestWeek, testAfter, travelOfWindow } from "./stack";
import { mesoPartFit, rankFor, timeBias, type Aim, type DeficitWeights } from "./sequence";
import { recKcalOf } from "./kcal";

const weeksBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00`).getTime() - new Date(`${a}T12:00`).getTime()) / (7 * 864e5));
const byStart = (p: PlanBlock[]) => [...p].sort((a, b) => a.start.localeCompare(b.start));
/** Ganze Wochen im Fenster [from, to] */
const weeksLeft = (a: string, b: string) => Math.floor(((new Date(`${b}T12:00`).getTime() - new Date(`${a}T12:00`).getTime()) / 864e5 + 1) / 7);

/** Füll-Formen nach Alltagslast — dieselbe Empfehlung wie der Meso-Wizard: kurze Teile bei hoher Last,
    das Triple in ruhigen Abschnitten, dazwischen die Standardform. */
const FORMS_BY_LOAD: Record<Load, number[][]> = {
  high: [[6, 4], [4, 4]],
  medium: [[6, 6], [5, 5], [4, 4]],
  low: [[5, 5, 5], [6, 6], [5, 5], [4, 4]],
};

/** Größte Form, die mit Testwoche ins Fenster passt — sonst die kürzeste (4+4). */
function formFor(weeks: number, load: Load, preferTriple: boolean): number[] {
  const cands = preferTriple ? [[5, 5, 5], ...FORMS_BY_LOAD[load]] : FORMS_BY_LOAD[load];
  return cands.find((f) => f.reduce((a, c) => a + c, 0) + 1 <= weeks) ?? [4, 4];
}

/** Füllt das Jahr hinter der laufenden Phase: Mesozyklen aus den Abschnitten, Orden nach Ziel,
    Uhren und Bilanz (steer), Testwochen nach Regel, Kalorien-Modus als Vorschlag je Teil. */
export function fillYear(plan: PlanBlock[], sections: Section[], today: string, newId: () => string, aim: Aim, deficits: DeficitWeights = [], steer: DeficitWeights = [], testPolicy: "each" | "twice" | "none" = "each", preferTriple = false): PlanBlock[] {
  const sorted = byStart(plan);
  // Vergangenes und laufende Phasen bleiben; Meso-Id eines laufenden Blocks löst sich, wenn seine Partner ersetzt werden
  const goneMesos = new Set(sorted.filter((b) => b.start > today && b.meso).map((b) => b.meso!));
  const kept = sorted.filter((b) => b.start <= today).map((b) => (b.meso && goneMesos.has(b.meso) ? { ...b, meso: undefined, accent: undefined } : b));
  const keptEnd = kept.length ? kept.reduce((m, b) => (b.end > m ? b.end : m), kept[0].end) : null;
  const secSorted = byStart(sections);
  const first = secSorted[0];
  const from = keptEnd ? addDays(keptEnd, 1) : first && first.start > mondayOf(today) ? first.start : mondayOf(today);
  const endOf = secSorted.length ? secSorted[secSorted.length - 1].end : addDays(from, 7 * 52 - 1);

  let out: PlanBlock[] = [...kept];
  let at = from;
  // Mesozyklen anreihen, solange die kürzeste Form (4+4 plus Testwoche) ins Fenster passt
  while (weeksLeft(at, endOf) >= 9) {
    const weeks = weeksLeft(at, endOf);
    const load = loadOfWindow(sections, at, addDays(at, 7 * 16 - 1));
    const form = formFor(weeks, load, preferTriple);
    out = newMeso(out, today, newId, form, sections);
    at = addDays(at, 7 * (form.reduce((a, c) => a + c, 0) + 1));
  }
  // Rest (unter neun Wochen): an den letzten Teil des letzten Mesos anhängen, seine Testwoche rückt mit
  const rest = weeksLeft(at, endOf);
  const lastPart = [...out].filter((b) => b.meso && !isTestBlock(b)).sort((a, b) => a.end.localeCompare(b.end)).pop();
  if (rest > 0 && lastPart && lastPart.end >= from) {
    out = out.map((x) => (x.id === lastPart.id ? { ...x, end: addDays(x.end, 7 * rest) } : x.start > lastPart.end ? { ...x, start: addDays(x.start, 7 * rest), end: addDays(x.end, 7 * rest) } : x));
  } else if (rest > 0) {
    // kein Platz für einen Mesozyklus: eine einzelne Phase bis zum Ende des Jahres
    out.push({ id: newId(), focusId: "", label: "", start: at, end: endOf, load: loadOfWindow(sections, at, endOf), travel: travelOfWindow(sections, at, endOf) });
  }

  // Orden setzen: Empfehlung wie im Meso-Wizard (Last, Länge, Übergang, Wiederholung, Ziel, Uhren),
  // die Kette bindet über Successors — auch über Mesozyklus-Grenzen hinweg, der vorherige Orden führt weiter
  const fresh = byStart(out).filter((b) => b.start >= from && !isTestBlock(b));
  let prev: Focus | undefined;
  const before = kept.filter((b) => !isTestBlock(b) && FOCUS_BY_ID[b.focusId]).pop();
  if (before) prev = FOCUS_BY_ID[before.focusId];
  for (const b of fresh) {
    const ranked = rankFor(out, b.id, aim, deficits, steer)
      .filter((r) => !b.meso || mesoPartFit(r.f))
      .map((r) => ({ ...r, score: r.score + timeBias(b, r.f) }));
    const top = prev ? ranked.find((r) => prev!.successors?.includes(r.f.id)) ?? ranked[0] : ranked[0];
    if (!top) continue;
    out = out.map((x) => (x.id === b.id ? { ...x, focusId: top.f.id } : x));
    prev = top.f;
  }

  // Kalorien-Vorschlag je Teil: Aufbau braucht Energie, Defizit-Fenster in die niedrige Last
  out = out.map((x) => {
    if (x.start < from || isTestBlock(x) || !x.focusId) return x;
    const rec = recKcalOf(x, FOCUS_BY_ID[x.focusId] ?? null);
    return rec ? { ...x, kcal: rec.mode } : x;
  });

  // Testwochen nach Regel: each lässt alle, twice behält die mittlere und die letzte, none hebt alle auf
  if (testPolicy === "none" || testPolicy === "twice") {
    let tests = byStart(out).filter((b) => isTestBlock(b) && b.start >= from);
    if (testPolicy === "twice" && tests.length > 2) {
      const s = tests[0].start, e = tests[tests.length - 1].end;
      const mid = new Date((new Date(`${s}T12:00`).getTime() + new Date(`${e}T12:00`).getTime()) / 2).toISOString().slice(0, 10);
      const half = [...tests.slice(0, -1)].sort((a, b) => Math.abs(weeksBetween(a.end, mid)) - Math.abs(weeksBetween(b.end, mid)))[0];
      tests = tests.filter((t) => t.id !== half.id && t.id !== tests[tests.length - 1].id);
    }
    for (const t of tests) {
      const part = out.find((x) => !isTestBlock(x) && testAfter(out, x)?.id === t.id);
      if (part) out = setTestWeek(out, part.id, false, "");
    }
  }
  return out;
}

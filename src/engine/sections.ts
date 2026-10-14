/* Lebensabschnitte: Ebene über den Phasen. Der Nutzer beschreibt sein Jahr (Name frei, Wochen, Alltagslast),
   die App schlägt daraus Phasen und Orden vor.
   - Kurze Abschnitte (unter 3 Wochen) gehen in der Nachbarphase auf.
   - Gleich belastete Abschnitte hintereinander bilden eine Zone; wie eine Zone geteilt wird (ein langer Orden
     oder mehrere kürzere), entscheidet die Zielerreichung: Beitrag zur Richtung des Jahres plus Passung der Orden.
   - Vergangene und laufende Phasen bleiben, wie sie sind. */
import { FOCUS_BY_ID } from "../data";
import type { Load, PlanBlock, Section } from "../types";
import { addDays, blockWeeks, isTestBlock, mondayOf } from "./plan";
import { aimScore, rankFor, stepScore, suggestSequence, type Aim, type DeficitWeights } from "./sequence";
import { setTestWeek } from "./stack";

const weeksBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00`).getTime() - new Date(`${a}T12:00`).getTime()) / (7 * 864e5));
export const sectionWeeks = (s: Section) => Math.max(1, weeksBetween(mondayOf(s.start), addDays(s.end, 1)));
const byStart = <T extends { start: string }>(x: T[]) => [...x].sort((a, b) => a.start.localeCompare(b.start));
let seq = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Abschnitte aus einem bestehenden Plan ableiten: „Wintersemester, Teil 1“ und „Teil 2“ sind ein Abschnitt, Testwochen gehören zum Abschnitt davor */
export function sectionsFromPlan(plan: PlanBlock[]): Section[] {
  const base = (l: string) => l.replace(/,?\s*Teil\s*\d+\s*$/i, "").trim();
  const out: Section[] = [];
  for (const b of byStart(plan)) {
    const last = out[out.length - 1];
    if (isTestBlock(b)) { if (last) last.end = b.end; continue; }
    const name = base(b.label) || `Abschnitt ${out.length + 1}`;
    if (last && last.name === name && last.load === b.load) { last.end = b.end; continue; }
    out.push({ id: newId("sec"), name, start: b.start, end: b.end, load: b.load, travel: b.travel || undefined });
  }
  return out;
}

/** Um n Wochen länger (n < 0: kürzer); alle späteren Abschnitte rücken mit */
export function resizeSection(list: Section[], id: string, n: number): Section[] {
  const s = list.find((x) => x.id === id);
  if (!s || (n < 0 && sectionWeeks(s) + n < 1)) return list;
  return list.map((x) => (x.id === id ? { ...x, end: addDays(x.end, 7 * n) } : x.start > s.end ? { ...x, start: addDays(x.start, 7 * n), end: addDays(x.end, 7 * n) } : x));
}
export function addSection(list: Section[], start: string, weeks = 4): Section[] {
  const last = byStart(list).pop();
  const s = last ? addDays(last.end, 1) : mondayOf(start);
  return [...list, { id: newId("sec"), name: `Abschnitt ${list.length + 1}`, start: s, end: addDays(s, 7 * weeks - 1), load: "medium" }];
}
export function removeSection(list: Section[], id: string): Section[] {
  const s = list.find((x) => x.id === id);
  if (!s) return list;
  const w = sectionWeeks(s);
  return list.filter((x) => x.id !== id).map((x) => (x.start > s.end ? { ...x, start: addDays(x.start, -7 * w), end: addDays(x.end, -7 * w) } : x));
}

/** Vorlage Semester-Rhythmus (Hochschule): Vorlesungszeit Winter, Ferien, Vorlesungszeit Sommer, Ferien; 52 Wochen ab Start */
export function semesterTemplate(start: string): Section[] {
  const s0 = mondayOf(start);
  const end = addDays(s0, 7 * 52 - 1);
  const y = Number(s0.slice(0, 4));
  const marks: { at: string; name: string; load: Load }[] = [];
  for (const yy of [y - 1, y, y + 1]) {
    marks.push({ at: mondayOf(`${yy}-10-12`), name: "Wintersemester", load: "high" });
    marks.push({ at: mondayOf(`${yy + 1}-02-16`), name: "Semesterferien Winter", load: "low" });
    marks.push({ at: mondayOf(`${yy + 1}-04-13`), name: "Sommersemester", load: "high" });
    marks.push({ at: mondayOf(`${yy + 1}-07-20`), name: "Semesterferien Sommer", load: "medium" });
  }
  marks.sort((a, b) => a.at.localeCompare(b.at));
  const out: Section[] = [];
  for (let i = 0; i < marks.length; i++) {
    const a = marks[i].at > s0 ? marks[i].at : s0;
    const b = addDays(marks[i + 1]?.at ?? addDays(end, 1), -1);
    const e = b < end ? b : end;
    if (e < a) continue;
    out.push({ id: newId("sec"), name: marks[i].name, start: a, end: e, load: marks[i].load });
  }
  return out;
}

type Zone = { start: string; weeks: number; load: Load; travel: boolean; names: string[] };

/** Wochen ab `from` in Zonen gleicher Last; kurze Stücke (< 3 Wochen) gehen in der Nachbarzone auf */
export function zonesOf(sections: Section[], from: string): Zone[] {
  const weeks: { at: string; s: Section }[] = [];
  for (const s of byStart(sections)) for (let d = mondayOf(s.start); d <= s.end; d = addDays(d, 7)) if (d >= from) weeks.push({ at: d, s });
  const zones: Zone[] = [];
  for (const w of weeks) {
    const z = zones[zones.length - 1];
    if (z && z.load === w.s.load && z.travel === !!w.s.travel) { z.weeks++; if (!z.names.includes(w.s.name)) z.names.push(w.s.name); }
    else zones.push({ start: w.at, weeks: 1, load: w.s.load, travel: !!w.s.travel, names: [w.s.name] });
  }
  // Kurze Zonen der vorigen (sonst der nächsten) zuschlagen; ihre Last gilt dort nur als Hinweis
  for (let i = 0; i < zones.length; ) {
    if (zones[i].weeks >= 3 || zones.length === 1) { i++; continue; }
    const host = i > 0 ? zones[i - 1] : zones[i + 1];
    if (i === 0) host.start = zones[0].start;
    host.weeks += zones[i].weeks;
    for (const n of zones[i].names) if (!host.names.includes(n)) host.names.push(n);
    zones.splice(i, 1);
  }
  // Danach gleich belastete Nachbarn wieder zusammenführen (A hoch · 2 Wochen Ferien · B hoch = eine Zone)
  for (let i = 1; i < zones.length; ) {
    const a = zones[i - 1], b = zones[i];
    if (a.load === b.load && a.travel === b.travel) { a.weeks += b.weeks; for (const n of b.names) if (!a.names.includes(n)) a.names.push(n); zones.splice(i, 1); }
    else i++;
  }
  return zones;
}

/** Mögliche Teilungen einer Zone: 1 bis 3 Phasen, je etwa 4 bis 16 Wochen, gleichmäßig */
function partitions(weeks: number): number[][] {
  const out: number[][] = [];
  const lo = Math.max(1, Math.ceil(weeks / 16)), hi = Math.max(lo, Math.min(3, Math.floor(weeks / 4)));
  for (let k = lo; k <= hi; k++) out.push(Array.from({ length: k }, (_, i) => Math.floor(weeks / k) + (i < weeks % k ? 1 : 0)));
  return out;
}

/** Künftige Phasen aus den Abschnitten vorschlagen. Vergangene und laufende Phasen bleiben. */
export function proposePhases(plan: PlanBlock[], sections: Section[], today: string, aim: Aim, deficits: DeficitWeights = [], testPolicy: "each" | "twice" | "none" = "none"): PlanBlock[] {
  const kept = byStart(plan).filter((b) => b.start <= today);
  const keptEnd = kept.length ? kept.reduce((m, b) => (b.end > m ? b.end : m), kept[0].end) : null;
  const first = byStart(sections)[0];
  if (!first) return kept;
  const from = keptEnd ? addDays(keptEnd, 1) : first.start > mondayOf(today) ? first.start : mondayOf(today);
  const zones = zonesOf(sections, from);
  let result = [...kept];
  for (const z of zones) {
    let best: { score: number; blocks: PlanBlock[] } | null = null;
    for (const parts of partitions(z.weeks)) {
      let p = [...result];
      const blocks: PlanBlock[] = [];
      let at = z.start;
      parts.forEach((w) => {
        const id = newId("b");
        // Teil-Nummern fortführen, wenn der Abschnitt schon Phasen hat (z. B. laufendes „Wintersemester, Teil 1“)
        const before = z.names.length === 1 ? p.filter((x) => !isTestBlock(x) && x.label.replace(/,?\s*Teil\s*\d+\s*$/i, "").trim() === z.names[0]).length : 0;
        const label = z.names.length === 1 ? (parts.length > 1 || before ? `${z.names[0]}, Teil ${before + 1}` : z.names[0]) : z.names.join(" / ");
        const b: PlanBlock = { id, focusId: "", label, start: at, end: addDays(at, 7 * w - 1), load: z.load, travel: z.travel };
        p = [...p, b];
        const top = rankFor(p, id, aim, deficits)[0];
        b.focusId = top?.f.id ?? "";
        p = p.map((x) => (x.id === id ? b : x));
        blocks.push(b);
        at = addDays(at, 7 * w);
      });
      // Zielerreichung: Beitrag zur Richtung des Jahres plus mittlere Passung der Orden dieser Zone
      const sorted = byStart(p);
      const steps = blocks.map((b) => {
        const before = sorted.filter((x) => x.start < b.start && !isTestBlock(x));
        const prev = before.length ? FOCUS_BY_ID[before[before.length - 1].focusId] ?? null : null;
        return FOCUS_BY_ID[b.focusId] ? stepScore(FOCUS_BY_ID[b.focusId], b, prev, sorted.filter((x) => x.id !== b.id).map((x) => x.focusId)).score : -10;
      });
      const score = aimScore(sorted, sorted[0].start, sorted[sorted.length - 1].end, aim, deficits) + steps.reduce((a, c) => a + c, 0) / steps.length;
      if (!best || score > best.score) best = { score, blocks };
    }
    result = [...result, ...best!.blocks];
  }
  // Orden über das ganze Jahr noch einmal abstimmen (Übergänge, keine Wiederholung direkt hintereinander)
  const seqRes = suggestSequence(result, today, aim, deficits);
  result = result.map((b) => ({ ...b, focusId: seqRes.items.find((x) => x.id === b.id)?.focusId || b.focusId }));
  // Testwochen: letzte Woche der Phase
  const future = byStart(result).filter((b) => b.start > today && !isTestBlock(b) && blockWeeks(b) >= 3);
  const withTest = testPolicy === "each" ? future : testPolicy === "twice" ? twice(future) : [];
  for (const b of withTest) result = setTestWeek(result, b.id, true, newId("b"));
  return result;
}

/** Zweimal im Jahr: die Phase, die der Jahresmitte am nächsten endet, und die letzte */
function twice(future: PlanBlock[]): PlanBlock[] {
  if (future.length <= 2) return future;
  const s = future[0].start, e = future[future.length - 1].end;
  const mid = new Date((new Date(`${s}T12:00`).getTime() + new Date(`${e}T12:00`).getTime()) / 2).toISOString().slice(0, 10);
  const half = [...future.slice(0, -1)].sort((a, b) => Math.abs(weeksBetween(a.end, mid)) - Math.abs(weeksBetween(b.end, mid)))[0];
  return [half, future[future.length - 1]];
}

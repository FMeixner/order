/* Jahresplan als Stapel: Phasen wochenweise verlängern oder kürzen (alles danach rückt mit),
   Testwoche am Ende an- und abschalten, Phasen teilen und verbinden. Vergangenes bleibt unverändert. */
import type { AxisId, Load, PlanBlock, Section } from "../types";
import { addDays, blockWeeks, isTestBlock, mondayOf, TEST_BLOCK } from "./plan";

const byStart = (p: PlanBlock[]) => [...p].sort((a, b) => a.start.localeCompare(b.start));
/** Ende der laufenden Woche (Sonntag) */
const weekEnd = (today: string) => addDays(mondayOf(today), 6);
/** Phase ist vorbei: nichts mehr zu ändern */
export const isPast = (b: PlanBlock, today: string) => b.end < today;
/** Folgende Testwoche direkt hinter der Phase */
export const testAfter = (plan: PlanBlock[], b: PlanBlock) => plan.find((x) => isTestBlock(x) && x.start === addDays(b.end, 1));

/** Wie weit lässt sich die Phase kürzen? Mindestens eine Woche, laufende Phasen nicht vor das Ende dieser Woche */
export function canShrink(b: PlanBlock, today: string): boolean {
  if (isPast(b, today) || blockWeeks(b) <= 1) return false;
  return addDays(b.end, -7) >= (b.start <= today ? weekEnd(today) : b.start);
}

/** Um n Wochen verlängern (n < 0: kürzen). Alles, was danach beginnt, rückt mit; eine Testwoche direkt dahinter auch. */
export function resizeBlock(plan: PlanBlock[], id: string, n: number, today: string): PlanBlock[] {
  const b = plan.find((x) => x.id === id);
  if (!b || n === 0 || isPast(b, today)) return plan;
  if (n < 0 && !canShrink(b, today)) return plan;
  const d = 7 * n;
  return plan.map((x) => (x.id === id ? { ...x, end: addDays(x.end, d) } : x.start > b.end ? { ...x, start: addDays(x.start, d), end: addDays(x.end, d) } : x));
}

/** Testwoche am Ende: an = letzte Woche wird Testwoche (Phase ab 3 Wochen); aus = Testwoche geht zurück an die Phase */
export function setTestWeek(plan: PlanBlock[], id: string, on: boolean, newId: string): PlanBlock[] {
  const b = plan.find((x) => x.id === id);
  if (!b) return plan;
  const t = testAfter(plan, b);
  if (on === !!t) return plan;
  if (!on) return plan.filter((x) => x.id !== t!.id).map((x) => (x.id === id ? { ...x, end: t!.end } : x));
  if (blockWeeks(b) < 3) return plan;
  const start = addDays(b.end, -6);
  return [...plan.map((x) => (x.id === id ? { ...x, end: addDays(start, -1) } : x)), { id: newId, focusId: TEST_BLOCK, label: "Testwoche", start, end: b.end, load: b.load, travel: false }];
}

/** Mesozyklus-Formen: zwei Teile à vier bis sechs Wochen oder drei Teile à fünf Wochen (z. B. 16-Wochen-Fenster: 5+5+5 + Testwoche). */
export const MESO_FORMS: number[][] = [[4, 4], [5, 5], [6, 4], [4, 6], [6, 5], [6, 6], [5, 5, 5]];
/** Standardform wie seit 0.94: zwei Teile à sechs Wochen */
export const MESO_DEFAULT: number[] = [6, 6];

/** Alltagslast eines Zeitraums aus den Lebensabschnitten: die Last der meisten Wochen gewinnt,
    Gleichstand geht an die höhere Last. Ohne Abschnitte: medium. (Baustein „Alltags“: die Form-
    und Ordensvorschläge folgen dem Alltag, die Last steht schon auf den Teilen.) */
export function loadOfWindow(sections: Section[] | undefined, start: string, end: string): Load {
  if (!sections?.length) return "medium";
  const rank: Record<Load, number> = { low: 0, medium: 1, high: 2 };
  const count: Record<Load, number> = { low: 0, medium: 0, high: 0 };
  for (const s of sections) {
    if (s.end < start || s.start > end) continue;
    let d = mondayOf(s.start < start ? start : s.start);
    for (; d <= s.end && d <= end; d = addDays(d, 7)) count[s.load]++;
  }
  const loads = (Object.keys(count) as Load[]).filter((l) => count[l] > 0);
  if (!loads.length) return "medium";
  return loads.reduce((a, c) => (count[c] > count[a] || (count[c] === count[a] && rank[c] > rank[a]) ? c : a), loads[0]);
}

/** Unterwegs in einem Zeitraum: gilt, wenn die Mehrheit der Abschnittswochen unterwegs ist */
export function travelOfWindow(sections: Section[] | undefined, start: string, end: string): boolean {
  if (!sections?.length) return false;
  let w = 0, t = 0;
  for (const s of sections) {
    if (s.end < start || s.start > end) continue;
    for (let d = mondayOf(s.start < start ? start : s.start); d <= s.end && d <= end; d = addDays(d, 7)) { w++; if (s.travel) t++; }
  }
  return w > 0 && t > w / 2;
}

/** Mesozyklus anlegen: Teile nach der Form mit gemeinsamer Meso-Id und eine Testwoche dahinter.
    Alltagslast und Unterwegs je Teil aus den Lebensabschnitten (sonst medium),
    Akzent-Modus: Ziel-Domäne, die in jedem Teil Hauptziel bleibt. Orden wählt die UI (jeder Teil aus den Successors des vorherigen). */
export function newMeso(plan: PlanBlock[], today: string, newId: () => string, form: number[] = MESO_DEFAULT, sections?: Section[], accent?: AxisId): PlanBlock[] {
  const last = [...plan].sort((a, c) => a.end.localeCompare(c.end)).pop();
  const start = last ? addDays(last.end, 1) : mondayOf(today);
  const meso = newId();
  const out = [...plan];
  let at = start;
  for (const w of form) {
    const end = addDays(at, 7 * w - 1);
    out.push({ id: newId(), focusId: "", label: "", start: at, end, load: sections ? loadOfWindow(sections, at, end) : "medium", travel: sections ? travelOfWindow(sections, at, end) : false, meso, ...(accent ? { accent } : {}) });
    at = addDays(at, 7 * w);
  }
  out.push({ id: newId(), focusId: TEST_BLOCK, label: "Testwoche", start: at, end: addDays(at, 6), load: "medium", travel: false });
  return out;
}

/** Phase in zwei teilen (erste Hälfte aufgerundet); die zweite bekommt denselben Orden, ohne eingefrorenen Stand. Teilen löst einen Mesozyklus komplett auf: Auch der Partner verliert die Meso-Id, sonst bliebe ihm die interne Testwoche für immer unterdrückt. */
export function splitBlock(plan: PlanBlock[], id: string, newId: string, today: string): PlanBlock[] {
  const b = plan.find((x) => x.id === id);
  if (!b || isPast(b, today) || blockWeeks(b) < 2) return plan;
  const first = Math.ceil(blockWeeks(b) / 2);
  const mid = addDays(mondayOf(b.start), 7 * first);
  if (mid <= today) return plan;
  const { frozen: _f, shortRole: _s, meso: _m, accent: _a, ...rest } = b; void _f; void _s; void _m; void _a;
  return [...plan.map((x) => x.id === id ? { ...x, end: addDays(mid, -1), meso: undefined, accent: undefined } : b.meso && x.meso === b.meso ? { ...x, meso: undefined, accent: undefined } : x), { ...rest, id: newId, start: mid }];
}

/** Nächste Phase direkt dahinter (keine Testwoche dazwischen) */
export function nextOf(plan: PlanBlock[], b: PlanBlock): PlanBlock | undefined {
  return byStart(plan).find((x) => x.start === addDays(b.end, 1) && !isTestBlock(x));
}
/** Mit der nächsten Phase verbinden: diese läuft bis zu deren Ende weiter, mit ihrem Orden. Verbinden löst einen Mesozyklus komplett auf — auch der Partner verliert die Meso-Id. */
export function mergeNext(plan: PlanBlock[], id: string, today: string): PlanBlock[] {
  const b = plan.find((x) => x.id === id);
  const n = b && nextOf(plan, b);
  if (!b || !n || isPast(b, today) || n.start <= today) return plan;
  return plan.filter((x) => x.id !== n.id).map((x) => x.id === id ? { ...x, end: n.end, meso: undefined, accent: undefined } : b!.meso && x.meso === b!.meso ? { ...x, meso: undefined, accent: undefined } : x);
}

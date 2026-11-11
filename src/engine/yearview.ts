/* Zeitstrahl (1.23): die Makro-Perspektive. Zwei Fenster (ganzes Trainingsjahr mit Vergangenheit, oder zwei Wochen
   zurück bis ein halbes Jahr voraus), die Last je Woche und die Jahresbilanz der Zeichen. Ohne React. */
import { KLAMMER_BY_ID } from "../data";
import type { KlammerId, Load, PlanBlock, Section } from "../types";
import { addDays, blockAt, daysBetween, fmtDate, isTestBlock, mondayOf, weekInBlock } from "./plan";
import { dauerlast, weekLoad } from "./weekplan";

export type YearView = "year" | "ahead";
export interface Span { start: string; end: string }

export const YEAR_WEEKS = 52;
export const AHEAD_BACK = 2, AHEAD_WEEKS = 26;

/** Jahr: 52 Wochen ab dem Montag des frühesten Starts (Abschnitte und Plan). Liegt heute dahinter, rückt das Fenster
    in ganzen Jahren (52 Wochen) weiter, bis heute darin liegt. */
export function yearWindow(plan: PlanBlock[], sections: Section[] | undefined, today: string): Span {
  const starts = [...plan.map((b) => b.start), ...(sections ?? []).map((s) => s.start)].sort();
  let start = mondayOf(starts[0] ?? today);
  if (start > today) start = mondayOf(today);
  const len = YEAR_WEEKS * 7;
  while (addDays(start, len - 1) < today) start = addDays(start, len);
  return { start, end: addDays(start, len - 1) };
}

/** Ab heute: zwei Wochen zurück bis 26 Wochen voraus */
export function aheadWindow(today: string): Span {
  const start = addDays(mondayOf(today), -7 * AHEAD_BACK);
  return { start, end: addDays(mondayOf(today), 7 * AHEAD_WEEKS - 1) };
}

export const windowOf = (view: YearView, plan: PlanBlock[], sections: Section[] | undefined, today: string): Span =>
  view === "ahead" ? aheadWindow(today) : yearWindow(plan, sections, today);

/** Last je Woche im Fenster: in einer Phase die Last dieser Woche (höhere aus Phase und Abschnitt, `weekLoad`),
    sonst der Abschnitt; ohne beides null. `dauer`: Orden läuft unter Dauerlast. */
export function weekLoads(sections: Section[] | undefined, plan: PlanBlock[], start: string, end: string): { monday: string; load: Load | null; dauer: boolean }[] {
  const out: { monday: string; load: Load | null; dauer: boolean }[] = [];
  for (let m = mondayOf(start); m <= end; m = addDays(m, 7)) {
    const b = blockAt(plan, m) ?? blockAt(plan, addDays(m, 6));
    if (b && !isTestBlock(b)) {
      out.push({ monday: m, load: weekLoad(sections, b, Math.max(1, weekInBlock(b, m))), dauer: dauerlast(sections, b) });
      continue;
    }
    const s = sections?.find((x) => x.start <= addDays(m, 6) && x.end >= m);
    out.push({ monday: m, load: s?.load ?? b?.load ?? null, dauer: false });
  }
  return out;
}

export interface ShareRow { kind: KlammerId | "none"; past: number; ahead: number }
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Trainingswochen je Zeichen im Fenster (Testwochen zählen nicht), geteilt an heute: vor heute = hinter dir.
    Sortiert nach Wochen, größte zuerst; Phasen ohne Zeichen unter "none", nur wenn es sie gibt. */
export function signShare(plan: PlanBlock[], start: string, end: string, today: string): ShareRow[] {
  const acc = new Map<KlammerId | "none", { past: number; ahead: number }>();
  for (const b of plan) {
    if (isTestBlock(b) || !b.focusId) continue;
    const s = b.start < start ? start : b.start, e = b.end > end ? end : b.end;
    if (s > e) continue;
    const days = daysBetween(s, e) + 1;
    const past = today <= s ? 0 : today > e ? days : daysBetween(s, today);
    const k = b.klammer ?? "none";
    const a = acc.get(k) ?? { past: 0, ahead: 0 };
    a.past += past / 7; a.ahead += (days - past) / 7;
    acc.set(k, a);
  }
  return [...acc.entries()].map(([kind, a]) => ({ kind, past: r1(a.past), ahead: r1(a.ahead) }))
    .sort((x, y) => y.past + y.ahead - (x.past + x.ahead) || (x.kind === "none" ? 1 : y.kind === "none" ? -1 : 0));
}

const weeksTxt = (w: number) => `${String(Math.round(w))} ${Math.round(w) === 1 ? "Woche" : "Wochen"}`;

/** Der Satz unter der Jahresbilanz, nur wenn die laufende Phase ein Defizit hat oder auf Reisen liegt:
    „Dieses Jahr: 22 Wochen Masse, 8 Wochen Kraft. Das Nächste: Bär · Masse ab 30.11.“ Das Zeichen der laufenden Phase
    bleibt weg, höchstens drei; das Nächste ist das erste künftige Zeichen anderer Art. */
export function macroLine(plan: PlanBlock[], today: string, share: ShareRow[]): string | null {
  const cur = blockAt(plan, today);
  if (!cur || isTestBlock(cur) || (cur.kcal !== "deficit" && !cur.travel)) return null;
  const others = share.filter((r) => r.kind !== "none" && r.kind !== cur.klammer && r.past + r.ahead >= 0.5).slice(0, 3)
    .map((r) => `${weeksTxt(r.past + r.ahead)} ${KLAMMER_BY_ID[r.kind as KlammerId]?.tag ?? r.kind}`);
  const next = [...plan].sort((a, b) => a.start.localeCompare(b.start))
    .find((b) => b.start > today && !isTestBlock(b) && b.klammer && b.klammer !== cur.klammer);
  const parts: string[] = [];
  if (others.length) parts.push(`Dieses Jahr: ${others.join(", ")}.`);
  if (next?.klammer) {
    const k = KLAMMER_BY_ID[next.klammer];
    parts.push(`Das Nächste: ${k ? `${k.name} · ${k.tag}` : next.klammer} ab ${fmtDate(next.start)}.`);
  }
  return parts.length ? parts.join(" ") : null;
}

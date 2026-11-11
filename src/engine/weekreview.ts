/* Wochenrückblick (1.27): die zuletzt abgeschlossene Trainingswoche (oder die laufende, wenn sie geschafft ist) in einer
   Zeile — Einheiten, verdichtet oder entfallen (nie „verpasst“), Befinden, gesteigerte Gewichte. Lebt im Stand. */
import type { AppState, PlanBlock, SessionEntry } from "../types";
import { addDays, blockAt, dayRoleMap, isTestBlock, mondayOf, weekdayOf, weekInBlock } from "./plan";
import { focusFor } from "./weekplan";
import { bestProduct, trendOf } from "./progression";
export { bestProduct };

export interface ReviewSession { role: string; name: string; day: string; date: string; minutes: number | null; feeling: number | null }
export interface WeekReview {
  block: PlanBlock; week: number; monday: string;
  planned: number; done: number; condensed: number; dropped: number;
  feeling: number | null;
  sessions: ReviewSession[];
  /** Übungen mit besserem Satzprodukt als in der Einheit davor */
  up: string[];
  /** Übungen, die das Satzprodukt der Einheit davor gehalten haben */
  held: string[];
  /** Phase im Defizit: Halten ist das Ziel und zählt mit */
  deficit: boolean;
}

/** Vergleich mit der Einheit davor, in der dieselbe Übung vorkam: up, held oder down (null ohne Vorlauf) */
export function trendAgainstPrev(state: AppState, sessionDate: string, sessionId: string, e: SessionEntry): "up" | "held" | "down" | null {
  const cur = bestProduct(e);
  if (cur == null || e.prog === "none") return null;
  const prev = state.sessions.filter((s) => s.done && s.id !== sessionId && s.date < sessionDate && Object.values(s.entries).some((x) => x.name === e.name && x.sets.some((y) => y.done)))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prev) return null;
  const pe = Object.values(prev.entries).find((x) => x.name === e.name && x.sets.some((y) => y.done))!;
  return trendOf(pe, e);
}

const allDone = (state: AppState, b: PlanBlock, week: number): boolean => {
  const f = focusFor(state, b, week);
  if (!f) return false;
  const days = dayRoleMap(state, b, f, week);
  const done = new Set(state.sessions.filter((s) => s.blockId === b.id && s.week === week && s.done).map((s) => s.role));
  return days.length > 0 && days.every((d) => done.has(d.role) || !!f.roles[d.role]?.skipped);
};

/** Welche Woche der Rückblick zeigt: die laufende, wenn sie geschafft ist, sonst die davor (auch über eine Phasengrenze) */
export function reviewWeek(state: AppState, today: string): { block: PlanBlock; week: number } | null {
  const b = blockAt(state.plan, today);
  if (b && !isTestBlock(b) && allDone(state, b, weekInBlock(b, today))) return { block: b, week: weekInBlock(b, today) };
  const prev = addDays(mondayOf(today), -7);
  const pb = blockAt(state.plan, prev) ?? blockAt(state.plan, addDays(prev, 6));
  if (!pb || isTestBlock(pb)) return null;
  return { block: pb, week: Math.max(1, weekInBlock(pb, prev < pb.start ? pb.start : prev)) };
}

export function weekReview(state: AppState, block: PlanBlock, week: number): WeekReview | null {
  const f = focusFor(state, block, week);
  if (!f) return null;
  const days = dayRoleMap(state, block, f, week);
  const sess = state.sessions.filter((s) => s.blockId === block.id && s.week === week && s.done).sort((a, b) => a.date.localeCompare(b.date));
  const doneRoles = new Set(sess.map((s) => s.role));
  const condensed = days.filter((d) => !!f.roles[d.role]?.skipped && !doneRoles.has(d.role)).length;
  const dropped = days.filter((d) => !doneRoles.has(d.role) && !f.roles[d.role]?.skipped).length;
  const feel = new Map(state.feeling.map((x) => [x.sessionId, x.value]));
  const fs = sess.map((s) => feel.get(s.id)).filter((x): x is number => x != null);
  const up = new Set<string>(), held = new Set<string>();
  for (const s of sess) for (const e of Object.values(s.entries)) {
    const t = trendAgainstPrev(state, s.date, s.id, e);
    if (t === "up") up.add(e.name);
    else if (t === "held") held.add(e.name);
  }
  for (const n of up) held.delete(n);
  const sessions: ReviewSession[] = sess.map((s) => {
    const at = Object.values(s.entries).flatMap((e) => e.sets.map((x) => x.doneAt)).filter((x): x is string => !!x).sort();
    const minutes = at.length >= 2 ? Math.max(1, Math.round((Date.parse(at[at.length - 1]) - Date.parse(at[0])) / 60000)) : null;
    return { role: s.role, name: f.roles[s.role]?.name ?? s.role, day: weekdayOf(s.date), date: s.date, minutes, feeling: feel.get(s.id) ?? null };
  });
  return {
    block, week, monday: addDays(mondayOf(block.start), 7 * (week - 1)),
    planned: days.length, done: sess.length, condensed, dropped,
    feeling: fs.length ? Math.round((fs.reduce((a, b) => a + b, 0) / fs.length) * 10) / 10 : null,
    sessions, up: [...up], held: [...held], deficit: block.kcal === "deficit",
  };
}

/** Die Zeile: „3 von 4 Einheiten · 1 verdichtet · Befinden +2 · 2 Gewichte gesteigert“ */
export function reviewLine(r: WeekReview): string {
  const sign = (x: number) => (x > 0 ? `+${x}` : String(x).replace("-", "−")).replace(".", ",");
  return [
    `${r.done} von ${r.planned} Einheiten`,
    r.condensed ? `${r.condensed} verdichtet` : null,
    r.dropped ? `${r.dropped} entfallen` : null,
    r.feeling != null ? `Befinden ${sign(r.feeling)}` : null,
    r.deficit && r.held.length ? `${r.held.length} ${r.held.length === 1 ? "Übung" : "Übungen"} gehalten` : null,
    r.up.length ? (r.deficit ? `${r.up.length} gesteigert` : `${r.up.length} ${r.up.length === 1 ? "Gewicht" : "Gewichte"} gesteigert`) : null,
  ].filter(Boolean).join(" · ");
}

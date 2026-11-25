/* Wiedereinstieg (1.51.8, Friedrich): nach Ausfällen (etwa Krankheit) als zweite Option neben der kurzen Woche.
   Läuft rollend, nicht an die Woche gebunden: ab der ersten erledigten Einheit nach dem Annehmen vier Tage lang
   (diese Einheit eingeschlossen), egal wie viele Einheiten darin liegen. Vor der ersten Einheit gilt er schon,
   höchstens 14 Tage lang. Einheiten im Fenster laufen wie in der Entlastungswoche (halbe Sätze, keine Bestien,
   Gewichte bleiben); fällt eine davon aus, wird nichts verschoben. Abwählbar über „Normal weiter“. */
import type { AppState } from "../types";
import { addDays } from "./plan";

export const REENTRY_DAYS = 4;
export const REENTRY_WAIT = 14;

/** Fenster des Wiedereinstiegs: von der Annahme bis drei Tage nach der ersten Einheit (oder bis zum Warteende) */
export function reentryWindow(state: Pick<AppState, "reentry" | "sessions">): { from: string; first: string | null; end: string } | null {
  const r = state.reentry;
  if (!r || r.off) return null;
  const first = state.sessions.filter((s) => s.done && s.date >= r.from).map((s) => s.date).sort()[0] ?? null;
  return { from: r.from, first, end: first ? addDays(first, REENTRY_DAYS - 1) : addDays(r.from, REENTRY_WAIT) };
}
export function inReentry(state: Pick<AppState, "reentry" | "sessions">, date: string): boolean {
  const w = reentryWindow(state);
  return !!w && date >= w.from && date <= w.end;
}

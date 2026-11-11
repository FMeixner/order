/* Wohlbefinden (WHO-5, 1.37): kein Cup mehr, sondern alle zwei Wochen am Ende einer Trainingswoche – in Woche 2, 4, 6 …
   eines Ordens, sobald alle Einheiten der Woche erledigt (oder ausgefallen) sind. Die Fragen beziehen sich auf die
   letzten zwei Wochen. Die Auswertung der Testwoche nimmt den jüngsten Wert der vier Wochen davor. */
import type { AppState, PlanBlock } from "../types";
import { dayRoleMap, isTestBlock } from "./plan";
import { focusFor } from "./weekplan";

/** Alle Trainingstage dieser Woche erledigt? Ausgefallene Einheiten zählen als erledigt. */
export function weekDone(state: AppState, b: PlanBlock, week: number): boolean {
  if (isTestBlock(b)) return false;
  const f = focusFor(state, b, week);
  if (!f) return false;
  const days = dayRoleMap(state, b, f, week);
  const done = new Set(state.sessions.filter((s) => s.blockId === b.id && s.week === week && s.done).map((s) => s.role));
  return days.length > 0 && days.every((d) => done.has(d.role) || !!f.roles[d.role]?.skipped);
}

export const isWho5Week = (b: PlanBlock, week: number) => !isTestBlock(b) && week >= 2 && week % 2 === 0;
export const who5Of = (state: AppState, b: PlanBlock, week: number) => state.who5.find((w) => w.blockId === b.id && w.week === week);
/** Fällig: WHO-5-Woche, alle Einheiten erledigt, noch nicht beantwortet */
export const who5Due = (state: AppState, b: PlanBlock, week: number) => isWho5Week(b, week) && !who5Of(state, b, week) && weekDone(state, b, week);

/** Wert für die Auswertung einer Testwoche: eigener Eintrag (alt), sonst der jüngste der vier Wochen davor */
export function who5For(state: AppState, testBlock: PlanBlock | undefined, blockId: string): number | null {
  const valid = state.who5.filter((w) => w.score >= 0); // −1: „Diesmal nicht“
  const own = valid.filter((w) => w.blockId === blockId);
  if (own.length) return own[own.length - 1].score;
  if (!testBlock) return null;
  const from = new Date(`${testBlock.start}T12:00:00Z`); from.setUTCDate(from.getUTCDate() - 28);
  const lo = from.toISOString().slice(0, 10);
  const near = valid.filter((w) => w.date >= lo && w.date <= testBlock.end).sort((a, c) => a.date.localeCompare(c.date));
  return near.length ? near[near.length - 1].score : null;
}

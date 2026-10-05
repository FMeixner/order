/* Bestien-Ergebnisse einer Einheit lesen, egal ob alt (beast/beastParts) oder neu (beastRuns je Block). */
import type { BeastResult, BeastRun, Session } from "../types";

/** Alle Läufe einer Einheit, gruppiert: je Bestien-Block die Einzelbestie oder die Teile einer Serie */
export function runGroups(s: Session): BeastRun[] {
  const out: BeastRun[] = [];
  if (s.beast || s.beastParts?.length) out.push({ beast: s.beast, parts: s.beastParts });
  for (const r of Object.values(s.beastRuns ?? {})) out.push(r);
  return out;
}
/** Alle einzelnen Läufe (Einzelbestien und Serienteile) */
export function allRuns(s: Session): BeastResult[] {
  return runGroups(s).flatMap((g) => (g.parts?.length ? g.parts : g.beast ? [g.beast] : []));
}

/** Freie Jagd: eine Bestie aus dem Almanach, außerhalb des Plans. Zählt für Bestzeiten, Log und Flugblatt, nicht als Trainingseinheit. */
export const HUNT = "jagd";
export const isHunt = (s: Session) => s.blockId === HUNT;

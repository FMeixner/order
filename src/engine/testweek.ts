/* Testwoche: wann ein Cup verdient ist (1.36). Ein Cup ist erst erledigt, wenn jeder seiner Tests einen Wert hat
   oder bewusst ausgelassen wurde (z. B. ohne Material); der WHO-5 zählt im Joyeuse-Cup mit, die Bestie auf Zeit nicht. */
import type { AppState, Cup, PlanBlock } from "../types";

export const testDone = (state: AppState, block: PlanBlock, id: string): boolean =>
  (state.tests[id] ?? []).some((r) => r.blockId === block.id) || !!state.testSkips?.[`${block.id}:${id}`];

export function cupDone(state: AppState, block: PlanBlock, cup: Cup): boolean {
  if (!cup.tests.every((t) => testDone(state, block, t.id))) return false;
  if (cup.who5 && !state.who5.some((w) => w.blockId === block.id)) return false;
  return true;
}

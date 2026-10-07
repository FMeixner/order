import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import type { AppState, Focus } from "../types";
import { freezePlan, newerFocus, refreeze } from "./plan";
import { focusFor } from "./weekplan";

const state = (): AppState => {
  const s = emptyState();
  return { ...s, equipment: [{ ...EQUIPMENT_PRESETS[0].make(), id: "g" }], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
    plan: [
      { id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium", travel: false },
      { id: "b2", focusId: "witcher", label: "", start: "2026-12-07", end: "2027-02-21", load: "medium", travel: false },
    ] };
};

describe("Phase einfrieren", () => {
  it("nur gestartete Phasen bekommen einen Stand, einmal", () => {
    const s = state();
    const p = freezePlan(s.plan, "2026-10-07")!;
    expect(p[0].frozen?.foci.assassin).toEqual(FOCUS_BY_ID.assassin);
    expect(p[1].frozen).toBeUndefined();
    expect(freezePlan(p, "2026-10-07")).toBeNull();
  });
  it("die Phase läuft mit ihrem Stand, auch wenn sich die Orden-Daten ändern", () => {
    const s = state();
    const p = freezePlan(s.plan, "2026-10-07")!;
    // alter Stand: Dienstag noch mit drei Übungen
    const old: Focus = JSON.parse(JSON.stringify(FOCUS_BY_ID.assassin));
    old.roles.arme_schultern.blocks = old.roles.arme_schultern.blocks.slice(0, 3);
    const b = { ...p[0], frozen: { at: "2026-09-28", foci: { assassin: old } } };
    const f = focusFor({ ...s, plan: [b, p[1]] }, b, 2)!;
    expect(f.roles.arme_schultern.blocks.length).toBe(3);
    expect(newerFocus(b)).toBe(true);
    const nb = refreeze(b, "2026-10-07");
    expect(newerFocus(nb)).toBe(false);
    expect(focusFor({ ...s, plan: [nb, p[1]] }, nb, 2)!.roles.arme_schultern.blocks.length).toBe(FOCUS_BY_ID.assassin.roles.arme_schultern.blocks.length);
  });
  it("Medley: die Orden der Rotation werden mit eingefroren", () => {
    const s = state();
    const h = Object.values(FOCUS_BY_ID).find((f) => f.medley?.length)!;
    const p = freezePlan([{ ...s.plan[0], focusId: h.id }], "2026-10-07")!;
    for (const id of h.medley!) expect(p[0].frozen?.foci[id]).toBeTruthy();
  });
});

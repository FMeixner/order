import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState } from "../types";
import { collectItems } from "../ui/session/items";
import { swapKey } from "./resolve";
import { focusFor } from "./weekplan";

describe("Superset aus zwei festen Geräten", () => {
  it("wird nach einem Tausch zur Maschine nacheinander gezeigt", () => {
    const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const base: AppState = { ...emptyState(), onboarded: true, equipment: [gym], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
      plan: [{ id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium", travel: false }] };
    const items = (st: AppState) => collectItems({ state: st, block: st.plan[0], focus: focusFor(st, st.plan[0], 1)!, week: 1, roleKey: "kraft_a", profile: gym, date: "2026-10-19", reduced: false } as never);
    const sup = (st: AppState) => items(st).filter((i) => i.block.type === "superset").length;
    expect(FOCUS_BY_ID.assassin.roles.kraft_a.blocks.some((b) => b.type === "superset")).toBe(true);
    expect(sup(base)).toBe(1);
    const swapped: AppState = { ...base, swaps: { [swapKey("kb-2c", "g")]: "Leg Extension" } };
    expect(sup(swapped)).toBe(0);
    expect(items(swapped).some((i) => i.resolved.some((r) => r.name === "Leg Extension"))).toBe(true);
  });
});

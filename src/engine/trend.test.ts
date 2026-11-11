import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { AppState, Block, SessionEntry, Slot } from "../types";
import { slippingCore, trendOf } from "./progression";

const entry = (sets: [number | null, number][], name = "Bench Press", slotId = "x"): SessionEntry =>
  ({ key: `${slotId}|${name}`, slotId, name, prog: "double", sets: sets.map(([weight, reps]) => ({ done: true, weight, reps })) });

describe("Trend (Defizit: gehalten zählt)", () => {
  it("up, held, down über das beste Satzprodukt", () => {
    expect(trendOf(entry([[60, 8], [60, 8]]), entry([[60, 9], [60, 8]]))).toBe("up");
    expect(trendOf(entry([[60, 8], [60, 8]]), entry([[60, 8], [60, 7]]))).toBe("held");
    expect(trendOf(entry([[60, 8]]), entry([[57.5, 8]]))).toBe("down");
    expect(trendOf(entry([[null, 12]]), entry([[null, 11]]))).toBe("down");
  });
  it("Kernübung gibt nach: erst nach zwei Rückgängen in Folge, nur an Slots mit core", () => {
    const f = FOCUS_BY_ID.knight;
    const slots: Slot[] = Object.values(f.roles).flatMap((r) => r.blocks.flatMap((b: Block) => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : [])));
    const core = slots.find((s) => s.core)!;
    const other = slots.find((s) => !s.core)!;
    const mk = (kgs: number[], slot: Slot): AppState["sessions"] => kgs.map((kg, i) => ({
      id: `${slot.id}${i}`, date: `2026-11-0${i + 1}`, blockId: "b", focusId: "knight", week: 1, role: "a", profileId: "g",
      entries: { k: entry([[kg, 8]], slot.name, slot.id) }, drills: {}, done: true,
    }));
    const st = (s: AppState["sessions"]): AppState => ({ ...emptyState(), sessions: s });
    expect(slippingCore(st(mk([60, 57.5, 55], core)), f)).toEqual([core.name]);
    expect(slippingCore(st(mk([60, 57.5, 60], core)), f)).toEqual([]);
    expect(slippingCore(st(mk([60, 60, 57.5], core)), f)).toEqual([]);
    expect(slippingCore(st(mk([60, 57.5, 55], other)), f)).toEqual([]);
    expect(slippingCore(st(mk([60, 57.5, 55], core)), f, "2026-11-05")).toEqual([]);
  });
});

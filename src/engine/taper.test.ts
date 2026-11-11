import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Block, Focus, PlanBlock, Slot } from "../types";
import { addDays, blockFocus } from "./plan";
import { focusFor, isTaperWeek, taperShape } from "./weekplan";

const slot = (name: string, sets: number, extra: Partial<Slot> = {}): Slot => ({ id: name, name, sets, reps: "8", ...extra });
const F = (blocks: Block[]): Focus => ({ ...blockFocus({ focusId: "knight" } as PlanBlock)!, roles: { a: { name: "A", location: "gym", minutes: 60, blocks } } });

describe("Zuspitzung vor der Testwoche (1.31)", () => {
  it("Sätze auf 60 % (aufgerundet, mindestens zwei), Satzende aus, Power-Slots unverändert, Bestien eine Klasse kürzer", () => {
    const f = taperShape(F([
      { type: "single", slot: slot("Back Squat", 5, { finish: { kind: "myo" } }) },
      { type: "single", slot: slot("Bench Press", 3) },
      { type: "single", slot: slot("Box Jump", 4) },
      { type: "single", slot: slot("Sprint 30 m", 6) },
      { type: "contrast", heavy: slot("Trap Bar Deadlift", 4), explosive: slot("Broad Jump", 4) },
      { type: "single", slot: slot("Curl", 1) },
      { type: "beast", id: "x", classes: ["bestie", "ungeheuer"] },
    ]));
    const b = f.roles.a.blocks;
    const s = (i: number) => (b[i] as Extract<Block, { type: "single" }>).slot;
    expect(s(0).sets).toBe(3);
    expect(s(0).finish).toBeUndefined();
    expect(s(0).reps).toBe("8");
    expect(s(1).sets).toBe(2);
    expect(s(2).sets).toBe(4);
    expect(s(3).sets).toBe(6);
    const c = b[4] as Extract<Block, { type: "contrast" }>;
    expect(c.heavy.sets).toBe(3);
    expect(c.explosive.sets).toBe(4);
    expect(s(5).sets).toBe(1);
    expect((b[6] as Extract<Block, { type: "beast" }>).classes).toEqual(["plage", "bestie"]);
  });
  it("greift in der Woche vor einer eigenen Testwoche, nicht davor", () => {
    const s = emptyState();
    const start = "2026-10-05";
    const knight: PlanBlock = { id: "b1", focusId: "knight", label: "", start, end: addDays(start, 8 * 7 - 1), load: "medium", travel: false };
    const test: PlanBlock = { id: "t", focusId: "test", label: "", start: addDays(start, 8 * 7), end: addDays(start, 9 * 7 - 1), load: "medium", travel: false };
    const st: AppState = { ...s, equipment: [{ ...EQUIPMENT_PRESETS[0].make(), id: "g" }], schedule: { Mo: "g", Mi: "g", Fr: "g", Sa: "g" }, plan: [knight, test] };
    expect(isTaperWeek(st, knight, 8)).toBe(true);
    expect(isTaperWeek(st, knight, 7)).toBe(false);
    const sets = (w: number) => Object.values(focusFor(st, knight, w)!.roles).flatMap((r) => r.blocks).flatMap((x) => (x.type === "single" ? [x.slot] : x.type === "superset" ? x.slots : [])).map((x) => x.sets ?? 0);
    const sum = (xs: number[]) => xs.reduce((a, c) => a + c, 0);
    expect(sum(sets(8))).toBeLessThan(sum(sets(6)) * 0.8);
  });
});

import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { guidedKeys, resolveSlot, swapOptions, toGuided } from "./resolve";

describe("Geführte Variante: freies Original bleibt wählbar (1.50)", () => {
  const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
  const slot = { id: "w-mo-2a", name: "Dip", sets: 3, reps: "8-10", prog: "double" } as never;
  it("statt Seated Dip Machine lässt sich Dip wählen", () => {
    const g = toGuided(resolveSlot(slot, gym)!, gym)!;
    expect(g.name).toBe("Seated Dip Machine");
    expect(swapOptions(g, gym).map((o) => o.name)).toContain("Dip");
  });
  it("die Wahl „Dip“ bleibt frei, auch an einem Tag mit geführten Varianten", () => {
    const r = resolveSlot(slot, gym, false, "Dip")!;
    expect(r.freeChosen).toBe(true);
    const first = resolveSlot({ id: "a", name: "Bench Press", sets: 3, reps: "8-10", prog: "double" } as never, gym)!;
    const keys = guidedKeys([{ r: first, contrast: false }, { r, contrast: false }], gym, 5);
    expect(keys.has(r.key)).toBe(false);
  });
});

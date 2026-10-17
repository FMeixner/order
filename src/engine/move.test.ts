import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { resolveSlot } from "./resolve";
import { suggest } from "./progression";

describe("Ortswechsel auf leichtere Last", () => {
  const p = { ...EQUIPMENT_PRESETS[1].make(), kettlebells: [20] } as never;
  it("KB Swing im Studio, zuhause nur 20 kg: 24 × 15 → 20 × 24, 28 × 15 → 20 × 30 (Grenze)", () => {
    const r = resolveSlot({ id: "kb-1", name: "KB Swing", sets: 4, reps: "15", prog: "double" }, p)!;
    const at = (w: number) => suggest(r, { weight: w, target: 15, fb: ["ok"], stage: 0, topHits: 0, updated: "" }, 4, p);
    expect([at(24).weight, at(24).targetReps]).toEqual([20, 24]);
    expect([at(28).weight, at(28).targetReps]).toEqual([20, 30]);
  });
  it("Goblet Squat 24 × 10 → 20 × 18", () => {
    const r = resolveSlot({ id: "x", name: "Goblet Squat", sets: 3, reps: "8-10", prog: "double" }, p)!;
    const s = suggest(r, { weight: 24, target: 10, fb: ["ok"], stage: 0, topHits: 0, updated: "" }, 4, p);
    expect([s.weight, s.targetReps]).toEqual([20, 18]);
  });
  it("gleiche Last wie gespeichert: nichts ändert sich", () => {
    const r = resolveSlot({ id: "kb-1", name: "KB Swing", sets: 4, reps: "15", prog: "double" }, p)!;
    expect(suggest(r, { weight: 20, target: 15, fb: ["ok"], stage: 0, topHits: 0, updated: "" }, 4, p).targetReps).toBe(15);
  });
});

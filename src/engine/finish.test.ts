import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import { deloadShape } from "./deload";
import { resolveSlot } from "./resolve";
import { highLoadFinish } from "./weekplan";
import type { Block, PlanBlock, Slot } from "../types";

const slot = (order: string, role: string, id: string): Slot => FOCUS_BY_ID[order].roles[role].blocks.flatMap((b: Block) => (b.type === "single" ? [b.slot] : [])).find((s) => s.id === id)!;
const home = EQUIPMENT_PRESETS[1].make();

describe("Satzende: Myo-Reps, Drop-Set, mechanischer Drop", () => {
  it("mechanischer Drop läuft ab der aufgelösten Übung weiter", () => {
    const r = resolveSlot(slot("barbarian", "oben_a", "ba-oa-1"), home)!;
    expect(r.finish?.kind).toBe("mech");
    expect(r.finish?.chain?.[0]).toBe(r.name);
  });
  it("Drop-Set nur mit Gewicht in Stufen; Myo-Reps an Kraftübungen", () => {
    expect(resolveSlot(slot("barbarian", "oben_b", "ba-ob-0"), home)!.finish?.kind).toBe("drop");
    expect(resolveSlot(slot("barbarian", "oben_a", "ba-oa-0"), home)!.finish?.kind).toBe("myo");
  });
  it("Entlastungswoche: kein Satzende", () => {
    const f = deloadShape(FOCUS_BY_ID.barbarian);
    expect(JSON.stringify(f.roles)).not.toContain('"finish":{');
  });
  it("hohe Alltagslast: Satzende nur an Ergänzungsübungen", () => {
    const b = { id: "x", focusId: "barbarian", label: "", start: "2026-11-09", end: "2026-12-31", load: "high" } as PlanBlock;
    const f = highLoadFinish(FOCUS_BY_ID.barbarian, b);
    const slots = Object.values(f.roles).flatMap((r) => r.blocks.flatMap((x) => (x.type === "single" ? [x.slot] : [])));
    expect(slots.some((s) => s.core && s.finish)).toBe(false);
    expect(slots.some((s) => !s.core && s.finish)).toBe(true);
  });
  it("Skirmisher (Power) hat keine Satzende-Techniken", () => {
    expect(JSON.stringify(FOCUS_BY_ID.skirmisher.roles)).not.toContain('"finish"');
  });
});

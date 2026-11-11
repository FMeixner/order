import { describe, expect, it } from "vitest";
import { BEAST_BY_ID, FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import { beastLocSub } from "./cardio";
import { resolveSlot } from "./resolve";
import type { Block } from "../types";

const [gym, , reise] = EQUIPMENT_PRESETS.map((p) => p.make());
const slot = (fid: string, role: string, name: string) => {
  const b = FOCUS_BY_ID[fid].roles[role].blocks.find((x: Block) => x.type === "single" && x.slot.name === name) as Extract<Block, { type: "single" }>;
  return b.slot;
};

describe("Springseil: fester Ersatz ohne Seil", () => {
  it("Seilsprints → High Knees, Seilspringen → Pogo Hops, Mischformen → die seilfreie Hälfte", () => {
    expect(reise.has.rope).toBe(false);
    expect(resolveSlot(slot("scout", "seil", "Seilsprints"), gym)?.name).toBe("Seilsprints");
    expect(resolveSlot(slot("scout", "seil", "Seilsprints"), reise)?.name).toBe("High Knees auf der Stelle");
    expect(resolveSlot(slot("olympian", "bonus", "Seilspringen"), reise)?.name).toBe("Pogo Hops");
    expect(resolveSlot(slot("gladiator", "spiel", "Sprint oder Seilspringen 10 × 30 s"), reise)?.name).toBe("Sprints 10 × 30 s");
    // Leise: Sprünge fallen weg, Mountain Climber bleibt
    expect(resolveSlot(slot("olympian", "bonus", "Seilspringen"), { ...reise, quiet: true })?.name).toBe("Mountain Climber");
  });
  it("Bestien: Single Unders ohne Seil als Pogo Hops (mutiert)", () => {
    const b = beastLocSub(BEAST_BY_ID["ng-solveig"], reise)!;
    expect(b.work).toContain("100 Pogo Hops");
    expect(b.work).not.toMatch(/single unders/i);
    expect(b.name.endsWith("mutiert")).toBe(true);
    expect(beastLocSub(BEAST_BY_ID["ng-solveig"], gym)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { TESTWEEK } from "../data";
import { emptyState } from "../store";
import { cupDone } from "./testweek";
import { tournamentOf } from "./saga";

const block = { id: "t1", focusId: "test", label: "", start: "2026-11-09", end: "2026-11-15", load: "medium" as const, travel: false };
const durendal = TESTWEEK.cups.find((c) => c.id === "durendal")!;

describe("Testwoche: Cup verdient", () => {
  it("nicht nach einem Test; erst wenn jeder Test einen Wert hat oder ausgelassen ist", () => {
    const st = { ...emptyState(), plan: [block], tests: { "t-deadhang": [{ date: "2026-11-11", blockId: "t1", value: 70, raw: "70" }] } };
    expect(cupDone(st, block, durendal)).toBe(false);
    const all = Object.fromEntries(durendal.tests.filter((t) => t.id !== "t-wallsit").map((t) => [t.id, [{ date: "2026-11-11", blockId: "t1", value: 10, raw: "10" }]]));
    expect(cupDone({ ...st, tests: all }, block, durendal)).toBe(false);
    expect(cupDone({ ...st, tests: all, testSkips: { "t1:t-wallsit": true } }, block, durendal)).toBe(true);
  });
  it("Urteil des Turniers erst für vollständige Cups (oder nach der Woche)", () => {
    const st = { ...emptyState(), plan: [block], narrative: { on: true }, tests: { "t-pullups": [{ date: "2026-11-11", blockId: "t1", value: 12, raw: "12" }] } };
    expect(tournamentOf(st, block, "2026-11-11").cups.find((c) => c.cupId === "durendal")!.text).toBeNull();
    expect(tournamentOf(st, block, "2026-11-20").cups.find((c) => c.cupId === "durendal")!.text).not.toBeNull();
  });
  it("jeder Test hat genau einen Versuch; Halte-Tests haben einen Timer", () => {
    const tests = TESTWEEK.cups.flatMap((c) => c.tests);
    expect(tests.every((t) => t.attempts === 1)).toBe(true);
    expect(tests.find((t) => t.id === "t-deadhang")!.timer).toEqual({ mode: "hold" });
    expect(tests.find((t) => t.id === "t-burpees")!.timer).toEqual({ mode: "fixed", seconds: 60 });
  });
});

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

describe("Testwerte im Verlauf", () => {
  it("5RM als Satz mit Gewicht (fließt ins 1RM), Max-Wiederholungen und Haltezeit als Satz der Übung", async () => {
    const { testLog } = await import("./testweek");
    const { oneRM } = await import("./loadbeast");
    const st = { ...emptyState(), tests: {
      "t-5rm-squat": [{ date: "2026-11-09", blockId: "t1", value: 100, raw: "100", variant: "squat" }],
      "t-pullups": [{ date: "2026-11-11", blockId: "t1", value: 12, raw: "12" }],
      "t-deadhang": [{ date: "2026-11-11", blockId: "t1", value: 75, raw: "75" }],
    } };
    const log = testLog(st);
    expect(log.find((e) => e.exercise === "Back Squat")!.sets[0]).toMatchObject({ reps: 5, weight: 100 });
    expect(log.find((e) => e.exercise === "Pull-Up")!.sets[0]).toMatchObject({ reps: 12 });
    expect(log.find((e) => e.exercise === "Dead Hang")!.sets[0]).toMatchObject({ seconds: 75 });
    expect(oneRM(st, "Back Squat")?.kg).toBeCloseTo(116.5, 0);
  });
});

describe("WHO-5 alle zwei Wochen", () => {
  it("in Woche 2, 4 … eines Ordens, nicht in der Testwoche; Auswertung nimmt den jüngsten Wert der vier Wochen davor", async () => {
    const { isWho5Week, who5For } = await import("./who5");
    const b = { id: "b1", focusId: "knight", label: "", start: "2026-09-28", end: "2026-10-25", load: "medium" as const, travel: false };
    expect([1, 2, 3, 4].map((w) => isWho5Week(b, w))).toEqual([false, true, false, true]);
    expect(isWho5Week(block, 2)).toBe(false);
    expect(TESTWEEK.cups.some((c) => c.who5)).toBe(false);
    const st = { ...emptyState(), plan: [b, block], who5: [{ date: "2026-10-04", blockId: "b1", week: 2, score: 40 }, { date: "2026-10-25", blockId: "b1", week: 4, score: 64 }, { date: "2026-11-01", blockId: "b2", week: 2, score: -1 }] };
    expect(who5For(st, block, "t1")).toBe(64);
  });
});

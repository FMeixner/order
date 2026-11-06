import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import type { Focus, PlanBlock } from "../types";
import { blockWeeks, isTestBlock, isTestWeek } from "./plan";
import { fillMeso, stepScore, suggestSequence } from "./sequence";
import { mergeNext, newMeso, splitBlock } from "./stack";

const T = "2026-11-04";
const blk = (id: string, focusId: string, start: string, end: string, meso?: string): PlanBlock => ({ id, focusId, label: "", start, end, load: "medium", travel: false, ...(meso ? { meso } : {}) });
const contiguous = (p: PlanBlock[]) => [...p].sort((x, y) => x.start.localeCompare(y.start)).every((b, i, a) => i === 0 || new Date(a[i - 1].end + "T12:00").getTime() + 864e5 === new Date(b.start + "T12:00").getTime());

describe("Mesozyklen", () => {
  it("Anlage: zwei 6-Wochen-Hälften mit gemeinsamer Meso-Id und eine Testwoche dahinter (12+1)", () => {
    let n = 0;
    const p = newMeso([], T, () => `b${n++}`);
    expect(p.length).toBe(3);
    const [a, b, t] = p;
    expect(blockWeeks(a)).toBe(6);
    expect(blockWeeks(b)).toBe(6);
    expect(a.meso).toBeTruthy();
    expect(a.meso).toBe(b.meso);
    expect(t.meso).toBeUndefined();
    expect(isTestBlock(t)).toBe(true);
    expect(blockWeeks(t)).toBe(1);
    expect(contiguous(p)).toBe(true);
    // mit bestehendem Plan: der Mesozyklus beginnt hinter dem letzten Ende
    const q = newMeso([blk("x", "assassin", "2026-10-05", "2026-11-15")], T, () => `b${n++}`);
    expect(q[1].start).toBe("2026-11-16");
  });

  it("Füllung: Hälfte 1 nach Empfehlung, Hälfte 2 aus deren Successors", () => {
    let n = 0;
    const filled = fillMeso(newMeso([], T, () => `b${n++}`), "allround");
    const [a, b] = filled;
    expect(FOCUS_BY_ID[a.focusId]).toBeTruthy();
    expect(FOCUS_BY_ID[b.focusId]).toBeTruthy();
    expect(FOCUS_BY_ID[a.focusId].successors).toContain(b.focusId);
  });

  it("Interne Testwoche entfällt auf einer Meso-Hälfte, Verlaufstests bleiben", () => {
    const assassin = FOCUS_BY_ID.assassin;
    expect(assassin.test_week).toBe(true);
    const mesoHalf = blk("h", "assassin", "2026-11-16", "2026-12-27", "m");
    const solo = blk("s", "assassin", "2026-11-16", "2026-12-27");
    expect(isTestWeek(assassin, solo, 6)).toBe(true);
    expect(isTestWeek(assassin, mesoHalf, 6)).toBe(false);
    const verlauf = { ...assassin, test_weeks: [3] } as Focus;
    expect(isTestWeek(verlauf, mesoHalf, 3)).toBe(true);
  });

  it("Sechs Wochen sind im Mesozyklus ein Akzent ohne Abstrafe, alleinstehend weiterhin unter der Empfehlung", () => {
    const assassin = FOCUS_BY_ID.assassin;
    const mesoHalf = blk("h", "assassin", "2026-11-16", "2026-12-27", "m");
    const solo = blk("s", "assassin", "2026-11-16", "2026-12-27");
    const inMeso = stepScore(assassin, mesoHalf, null, []);
    const alone = stepScore(assassin, solo, null, []);
    expect(inMeso.reasons).toContain("Akzent im Mesozyklus");
    expect(inMeso.score).toBe(alone.score + (assassin.weeks.min - 6) * 0.6);
    expect(alone.reasons).toContain(`eigentlich ab ${assassin.weeks.min} Wochen`);
  });

  it("Blockfolge bindet Hälfte 2 auf die Successors der gewählten Hälfte 1", () => {
    const plan = [
      blk("a", "assassin", "2026-10-05", "2026-11-15", "m"),
      blk("b", "", "2026-11-16", "2026-12-27", "m"),
    ];
    const res = suggestSequence(plan, T, "allround");
    const second = res.items.find((x) => x.id === "b")!;
    expect(second.locked).toBe(false);
    expect(FOCUS_BY_ID.assassin.successors).toContain(second.focusId);
  });

  it("Teilen und Verbinden lösen das Paar auf", () => {
    let n = 0;
    const p = newMeso([blk("x", "assassin", "2026-09-07", "2026-10-18")], T, () => `b${n++}`);
    const [a, b] = p.filter((x) => x.meso);
    const sp = splitBlock(p, a.id, "sp", T);
    expect(sp.filter((x) => x.meso)).toEqual([]);
    const mg = mergeNext(p, a.id, T);
    const merged = mg.find((x) => x.id === a.id)!;
    expect(merged.meso).toBeUndefined();
    expect(merged.end).toBe(b.end);
    expect(mg.find((x) => x.id === b.id)).toBeUndefined();
  });
});

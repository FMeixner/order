import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { AppState, Session } from "../types";
import { addDays } from "./plan";
import { affectSummary, affectWord } from "./affect";

const START = "2026-10-05";
const TODAY = "2026-11-11";
function st(vals: [string, string, number][]): AppState {
  const s = emptyState();
  const roles = Object.keys(FOCUS_BY_ID.knight.roles);
  const sessions: Session[] = vals.map(([date, role], i) => ({ id: `s${i}`, date, blockId: "b", focusId: "knight", week: 1, role: role === "A" ? roles[0] : roles[1], profileId: "g", entries: {}, drills: {}, done: true }));
  return {
    ...s,
    plan: [{ id: "b", focusId: "knight", label: "", start: START, end: addDays(START, 69), load: "medium", travel: false }],
    sessions,
    feeling: vals.map(([date, , value], i) => ({ date, sessionId: `s${i}`, value })),
  };
}

describe("Befinden", () => {
  it("Mittelwert der letzten vier Wochen, ältere zählen nicht", () => {
    const a = affectSummary(st([["2026-10-06", "A", -5], ["2026-10-20", "A", 2], ["2026-11-02", "B", 4]]), TODAY);
    expect(a.n).toBe(3);
    expect(a.mean4w).toBe(3);
  });
  it("je Tagestyp die letzten sechs Werte, sortiert vom besten zum schwächsten", () => {
    const vals: [string, string, number][] = [];
    for (let i = 0; i < 8; i++) vals.push([addDays("2026-10-06", i * 3), "A", i]);
    vals.push(["2026-11-01", "B", 4], ["2026-11-03", "B", 5]);
    const a = affectSummary(st(vals), TODAY);
    const A = a.byRole.find((r) => r.role === Object.keys(FOCUS_BY_ID.knight.roles)[0])!;
    expect(A.values).toEqual([2, 3, 4, 5, 6, 7]);
    expect(A.name).toBe(Object.values(FOCUS_BY_ID.knight.roles)[0].name);
    expect(a.byRole[0].mean).toBeGreaterThanOrEqual(a.byRole[1].mean);
  });
  it("Hinweis erst ab drei zähen Werten eines Tages", () => {
    const two = affectSummary(st([["2026-11-01", "A", -3], ["2026-11-03", "A", -2], ["2026-11-04", "B", 3]]), TODAY);
    expect(two.flag).toBeNull();
    const three = affectSummary(st([["2026-10-30", "A", -3], ["2026-11-01", "A", -2], ["2026-11-03", "A", -2], ["2026-11-04", "B", 3]]), TODAY);
    expect(three.flag).toMatch(/fühlt sich seit drei Einheiten zäh an/);
    const mixed = affectSummary(st([["2026-10-30", "A", -3], ["2026-11-01", "A", 2], ["2026-11-03", "A", -2]]), TODAY);
    expect(mixed.flag).toBeNull();
  });
  it("Wörter: zäh, neutral, gut", () => {
    expect(affectWord(-1.5)).toBe("zäh");
    expect(affectWord(1)).toBe("neutral");
    expect(affectWord(1.2)).toBe("gut");
  });
});

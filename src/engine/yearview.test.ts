import { describe, expect, it } from "vitest";
import type { PlanBlock, Section } from "../types";
import { addDays } from "./plan";
import { aheadWindow, macroLine, signShare, weekLoads, yearWindow } from "./yearview";

const blk = (id: string, start: string, weeks: number, extra: Partial<PlanBlock> = {}): PlanBlock =>
  ({ id, focusId: "knight", label: "", start, end: addDays(start, weeks * 7 - 1), load: "medium", travel: false, ...extra });

// 2026-09-07 ist ein Montag
const A = "2026-09-07";
const plan: PlanBlock[] = [
  blk("a", A, 8, { klammer: "muskel", meso: "m1", kcal: "surplus" }),
  blk("t1", addDays(A, 56), 1, { focusId: "test" }),
  blk("b", addDays(A, 63), 8, { klammer: "kraft", meso: "m2", kcal: "deficit" }),
  blk("c", addDays(A, 119), 6, { klammer: "athletik", meso: "m3" }),
  blk("d", addDays(A, 161), 10, { klammer: "muskel", meso: "m4" }),
];

describe("Zeitstrahl", () => {
  it("Jahr beginnt am Montag des frühesten Starts und umfasst 52 Wochen", () => {
    const sections: Section[] = [{ id: "s", name: "Sommer", start: "2026-08-12", end: "2026-09-30", load: "low" }];
    const w = yearWindow(plan, sections, "2026-11-10");
    expect(w.start).toBe("2026-08-10");
    expect(w.end).toBe(addDays("2026-08-10", 52 * 7 - 1));
  });
  it("rückt in ganzen Jahren weiter, wenn heute hinter dem Ende liegt", () => {
    const w = yearWindow(plan, [], addDays(A, 52 * 7 + 3));
    expect(w.start).toBe(addDays(A, 52 * 7));
  });
  it("Ab heute: zwei Wochen zurück, 26 voraus", () => {
    const w = aheadWindow("2026-11-11");
    expect(w.start).toBe("2026-10-26");
    expect(w.end).toBe(addDays("2026-11-09", 26 * 7 - 1));
  });
  it("signShare summiert die Trainingswochen, teilt an heute, Testwochen zählen nicht", () => {
    const today = addDays(A, 63 + 14); // Woche 3 der Kraftphase
    const w = yearWindow(plan, [], today);
    const s = signShare(plan, w.start, w.end, today);
    const total = s.reduce((n, r) => n + r.past + r.ahead, 0);
    expect(total).toBeCloseTo(8 + 8 + 6 + 10, 1);
    const muskel = s.find((r) => r.kind === "muskel")!;
    expect(muskel).toEqual({ kind: "muskel", past: 8, ahead: 10 });
    const kraft = s.find((r) => r.kind === "kraft")!;
    expect(kraft.past).toBe(2);
    expect(kraft.ahead).toBe(6);
    expect(s[0].kind).toBe("muskel");
    expect(s.some((r) => r.kind === "none")).toBe(false);
  });
  it("Phasen ohne Zeichen zählen unter ohne Zeichen", () => {
    const p = [...plan, blk("e", addDays(A, 231), 4)];
    const w = yearWindow(p, [], A);
    expect(signShare(p, w.start, w.end, A).find((r) => r.kind === "none")?.ahead).toBe(4);
  });
  it("macroLine nur bei Defizit oder Reise, ohne das laufende Zeichen", () => {
    const inDeficit = addDays(A, 70);
    const w = yearWindow(plan, [], inDeficit);
    const line = macroLine(plan, inDeficit, signShare(plan, w.start, w.end, inDeficit));
    expect(line).toContain("18 Wochen Masse");
    expect(line).toContain("6 Wochen Explosiv");
    expect(line).not.toContain("Kraft");
    expect(line).toMatch(/Das Nächste: Falke · Explosiv ab 4\.1\./);
    const surplus = addDays(A, 10);
    expect(macroLine(plan, surplus, signShare(plan, w.start, w.end, surplus))).toBeNull();
    const travel = plan.map((b) => (b.id === "a" ? { ...b, travel: true } : b));
    expect(macroLine(travel, surplus, signShare(travel, w.start, w.end, surplus))).toMatch(/^Dieses Jahr: /);
  });
  it("weekLoads: Last je Woche, Dauerlast markiert", () => {
    const sections: Section[] = [{ id: "s", name: "Semester", start: A, end: addDays(A, 20 * 7 - 1), load: "medium" }];
    const p = [blk("x", A, 6, { load: "medium" }), blk("y", addDays(A, 42), 6, { load: "medium" })];
    const wl = weekLoads(sections, p, A, addDays(A, 12 * 7 - 1));
    expect(wl).toHaveLength(12);
    expect(wl[0]).toMatchObject({ load: "medium", dauer: false });
    expect(wl[7]).toMatchObject({ load: "medium", dauer: true });
  });
});

import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import type { Load, PlanBlock, Section } from "../types";
import { addDays, blockWeeks, isTestBlock } from "./plan";
import { newMeso } from "./stack";
import { fillYear } from "./coach";

const T = "2027-01-04"; // Montag
const sec = (start: string, weeks: number, load: Load, name = "Abschnitt"): Section => ({ id: `${name}-${start}`, name, start, end: addDays(start, 7 * weeks - 1), load });
const contiguous = (p: PlanBlock[]) => [...p].sort((x, y) => x.start.localeCompare(y.start)).every((b, i, a) => i === 0 || new Date(a[i - 1].end + "T12:00").getTime() + 864e5 === new Date(b.start + "T12:00").getTime());
const parts = (p: PlanBlock[]) => p.filter((b) => b.meso && !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start));
const ids = () => { let n = 0; return () => `b${n++}`; };

describe("Coach: Jahr füllen", () => {
  it("füllt das Jahr lückenlos mit Mesozyklen aus den Abschnitten", () => {
    const S = [sec(T, 26, "medium"), sec("2027-07-05", 26, "high")];
    const out = fillYear([], S, T, ids(), "allround");
    expect(contiguous(out)).toBe(true);
    expect(out[0].start).toBe(T);
    expect(out[out.length - 1].end).toBe(S[1].end);
    expect(out.filter((b) => !isTestBlock(b)).every((b) => FOCUS_BY_ID[b.focusId])).toBe(true);
    expect(out.filter(isTestBlock)).toHaveLength(4);
    expect(new Set(out.filter((b) => b.meso).map((b) => b.meso)).size).toBe(4);
  });

  it("hohe Alltagslast: kurze Teile (6+4), Rest verlängert den letzten Teil", () => {
    const S = [sec(T, 16, "high")];
    const out = fillYear([], S, T, ids(), "allround");
    const ps = parts(out);
    expect(ps).toHaveLength(2);
    expect(blockWeeks(ps[0])).toBe(6);
    expect(blockWeeks(ps[1])).toBe(9); // 4 Wochen plus 5 Rest
    expect(contiguous(out)).toBe(true);
    expect(out[out.length - 1].end).toBe(S[0].end);
  });

  it("Ziel Kraft: der erste Teil trägt — Herald bleibt hinten", () => {
    const S = [sec(T, 26, "medium")];
    const out = fillYear([], S, T, ids(), "kraft");
    const first = out.find((b) => !isTestBlock(b))!;
    expect(["smith", "troubadour"]).toContain(first.focusId);
    expect(first.kcal).toBe("surplus"); // Aufbau braucht Energie
  });

  it("Rest unter neun Wochen hängt an den letzten Teil (20 Wochen: 6+6+1, dann 7 dran)", () => {
    const S = [sec(T, 20, "medium")];
    const out = fillYear([], S, T, ids(), "allround");
    const ps = parts(out);
    expect(ps).toHaveLength(2);
    expect(blockWeeks(ps[1])).toBe(13); // 6 Wochen plus 7 Rest
    expect(contiguous(out)).toBe(true);
    expect(out[out.length - 1].end).toBe(S[0].end);
  });

  it("Testwochen-Regel „zweimal im Jahr“ lässt zwei, „keine“ hebt alle auf", () => {
    const S = [sec(T, 40, "medium")];
    const twice = fillYear([], S, T, ids(), "allround", [], [], "twice");
    expect(twice.filter(isTestBlock)).toHaveLength(2);
    expect(contiguous(twice)).toBe(true);
    const none = fillYear([], S, T, ids(), "allround", [], [], "none");
    expect(none.filter(isTestBlock)).toHaveLength(0);
    expect(contiguous(none)).toBe(true);
  });

  it("Vergangenes bleibt unberührt; die Meso-Id eines laufenden Blocks löst sich, wenn sein Partner ersetzt wird", () => {
    const S = [sec("2026-12-07", 26, "medium")];
    let n = 0;
    const oldMeso = newMeso([], "2026-12-07", () => `b${n++}`, [6, 6]);
    const withF = oldMeso.map((b, i) => (i === 0 ? { ...b, focusId: "assassin" } : b));
    const out = fillYear(withF, S, "2026-12-20", () => `b${n++}`, "allround");
    const t1 = out.find((b) => b.id === withF[0].id)!;
    expect(t1.focusId).toBe("assassin");
    expect(t1.meso).toBeUndefined();
    expect(out.some((b) => b.id === withF[1].id || b.id === withF[2].id)).toBe(false);
    expect(out.some((b) => b.meso === withF[0].meso)).toBe(false);
    const fresh = out.filter((b) => b.start > t1.end);
    expect(fresh.length).toBeGreaterThan(2);
    expect(contiguous(out)).toBe(true);
  });

  it("kein Orden direkt hintereinander — die Kette rotiert", () => {
    const S = [sec(T, 30, "medium")];
    const out = fillYear([], S, T, ids(), "allround");
    const seq = out.filter((b) => !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < seq.length; i++) {
      if (new Date(seq[i - 1].end + "T12:00").getTime() + 864e5 !== new Date(seq[i].start + "T12:00").getTime()) continue;
      expect(seq[i].focusId).not.toBe(seq[i - 1].focusId);
    }
  });

  it("Signal aus Bilanz und Uhren: das Triple zuerst (5+5+5)", () => {
    const S = [sec(T, 20, "medium")];
    const out = fillYear([], S, T, ids(), "allround", [], [], "each", true);
    const ps = parts(out);
    expect(ps).toHaveLength(3);
    expect(blockWeeks(ps[0])).toBe(5);
    expect(blockWeeks(ps[1])).toBe(5);
    expect(blockWeeks(ps[2])).toBe(8); // 5 Wochen plus 3 Rest
    expect(contiguous(out)).toBe(true);
  });

  it("ohne Abschnitte: 52 Wochen Standardform (vier Mesozyklen)", () => {
    const out = fillYear([], [], T, ids(), "allround");
    expect(contiguous(out)).toBe(true);
    expect(out.filter(isTestBlock)).toHaveLength(4);
    expect(out[out.length - 1].end).toBe(addDays(T, 7 * 52 - 1));
  });
});

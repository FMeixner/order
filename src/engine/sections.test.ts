import { describe, expect, it } from "vitest";
import type { PlanBlock, Section } from "../types";
import { blockWeeks, isTestBlock } from "./plan";
import { proposePhases, resizeSection, sectionsFromPlan, semesterTemplate, zonesOf } from "./sections";

const blk = (id: string, focusId: string, label: string, start: string, end: string, load: PlanBlock["load"] = "high"): PlanBlock => ({ id, focusId, label, start, end, load, travel: false });
const sec = (id: string, name: string, start: string, end: string, load: Section["load"]): Section => ({ id, name, start, end, load });
const contiguous = (p: PlanBlock[]) => [...p].sort((a, b) => a.start.localeCompare(b.start)).every((b, i, a) => i === 0 || new Date(a[i - 1].end + "T12:00").getTime() + 864e5 === new Date(b.start + "T12:00").getTime());

describe("Lebensabschnitte", () => {
  it("aus dem Plan abgeleitet: Teil 1 und 2 sind ein Abschnitt, Testwoche gehört dazu", () => {
    const plan = [blk("a", "assassin", "Wintersemester, Teil 1", "2026-09-28", "2026-12-06"), blk("w", "slayer", "Wintersemester, Teil 2", "2026-12-07", "2027-02-14"),
      blk("t", "test", "Testwoche", "2027-02-15", "2027-02-21"), blk("s", "soldier", "Semesterferien Winter", "2027-02-22", "2027-03-28", "low")];
    const s = sectionsFromPlan(plan);
    expect(s.map((x) => [x.name, x.start, x.end, x.load])).toEqual([["Wintersemester", "2026-09-28", "2027-02-21", "high"], ["Semesterferien Winter", "2027-02-22", "2027-03-28", "low"]]);
    const r = resizeSection(s, s[0].id, 1);
    expect(r[1].start).toBe("2027-03-01");
  });
  it("Vorlage Semester-Rhythmus: 52 Wochen lückenlos, wechselnde Last", () => {
    const t = semesterTemplate("2026-10-14");
    expect(t[0].start).toBe("2026-10-12");
    expect(t[t.length - 1].end).toBe("2027-10-10");
    expect(t.map((x) => x.load).slice(0, 4)).toEqual(["high", "low", "high", "medium"]);
    for (let i = 1; i < t.length; i++) expect(new Date(t[i - 1].end + "T12:00").getTime() + 864e5).toBe(new Date(t[i].start + "T12:00").getTime());
  });
  it("kurze Abschnitte gehen in der Nachbarzone auf, gleiche Last wird eine Zone", () => {
    const z = zonesOf([sec("1", "A", "2027-01-04", "2027-02-14", "high"), sec("2", "Weihnachten", "2027-02-15", "2027-02-28", "low"), sec("3", "B", "2027-03-01", "2027-04-11", "high")], "2027-01-04");
    expect(z.length).toBe(1);
    expect(z[0].weeks).toBe(14);
  });
  it("Vorschlag: laufende Phase bleibt, künftige lückenlos mit Orden, Testwoche je Phase", () => {
    const today = "2026-10-14";
    const plan = [blk("a", "assassin", "Wintersemester", "2026-09-28", "2026-12-06")];
    const sections = semesterTemplate("2026-09-28");
    const p = proposePhases(plan, sections, today, "allround", [], "each");
    expect(p.find((b) => b.id === "a")).toEqual(plan[0]);
    expect(contiguous(p)).toBe(true);
    const fut = p.filter((b) => b.start > today && !isTestBlock(b));
    expect(fut.every((b) => b.focusId && blockWeeks(b) >= 2)).toBe(true);
    expect(p.filter(isTestBlock).length).toBeGreaterThan(0);
    // keine zwei gleichen Orden direkt hintereinander
    const real = p.filter((b) => !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < real.length; i++) expect(real[i].focusId).not.toBe(real[i - 1].focusId);
  });
  it("Richtung zählt: Ausdauer bringt mehr Ausdauer-Orden als Kraft", () => {
    const sections = semesterTemplate("2027-01-04");
    const share = (aim: "ausdauer" | "kraft") => proposePhases([], sections, "2026-12-01", aim).filter((b) => ["pilgrim", "conqueror", "troubadour"].includes(b.focusId)).length;
    expect(share("ausdauer")).toBeGreaterThanOrEqual(share("kraft"));
  });
});

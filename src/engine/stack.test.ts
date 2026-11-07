import { describe, expect, it } from "vitest";
import type { PlanBlock } from "../types";
import { blockWeeks, isTestBlock } from "./plan";
import { mergeNext, resizeBlock, setTestWeek, splitBlock } from "./stack";

const blk = (id: string, focusId: string, start: string, end: string): PlanBlock => ({ id, focusId, label: "", start, end, load: "medium", travel: false });
const plan = [blk("a", "assassin", "2026-09-28", "2026-12-06"), blk("w", "slayer", "2026-12-07", "2027-02-21"), blk("s", "troubadour", "2027-02-22", "2027-03-28")];
const T = "2026-10-14";
const contiguous = (p: PlanBlock[]) => [...p].sort((x, y) => x.start.localeCompare(y.start)).every((b, i, a) => i === 0 || a[i - 1].end < b.start && new Date(a[i - 1].end + "T12:00").getTime() + 864e5 === new Date(b.start + "T12:00").getTime());

describe("Stapel", () => {
  it("+1 Woche schiebt alles danach, −1 zieht nach; laufende Phase nicht vor diese Woche", () => {
    const p = resizeBlock(plan, "w", 1, T);
    expect(blockWeeks(p.find((x) => x.id === "w")!)).toBe(12);
    expect(p.find((x) => x.id === "s")!.start).toBe("2027-03-01");
    expect(contiguous(p)).toBe(true);
    expect(resizeBlock(plan, "a", -1, T).find((x) => x.id === "a")!.end).toBe("2026-11-29");
    let q = plan;
    for (let i = 0; i < 20; i++) q = resizeBlock(q, "a", -1, T);
    expect(q.find((x) => x.id === "a")!.end).toBe("2026-10-18");
    expect(contiguous(q)).toBe(true);
  });
  it("Testwoche an und aus, ohne dass sich etwas verschiebt", () => {
    const on = setTestWeek(plan, "w", true, "t1");
    expect(on.length).toBe(4);
    expect(on.find((x) => isTestBlock(x))!.start).toBe("2027-02-15");
    expect(contiguous(on)).toBe(true);
    const off = setTestWeek(on, "w", false, "x");
    expect(off).toEqual(plan);
    // Testwoche wandert beim Verlängern mit
    const grown = resizeBlock(on, "w", 2, T);
    expect(grown.find((x) => isTestBlock(x))!.start).toBe("2027-03-01");
    expect(contiguous(grown)).toBe(true);
  });
  it("Teilen und Verbinden", () => {
    const sp = splitBlock(plan, "w", "w2", T);
    expect(sp.filter((x) => x.focusId === "slayer").map(blockWeeks)).toEqual([6, 5]);
    expect(contiguous(sp)).toBe(true);
    const mg = mergeNext(sp, "w", T);
    expect(mg.find((x) => x.id === "w")!.end).toBe("2027-02-21");
    expect(mg.length).toBe(3);
    // laufende Phase nicht mit sich selbst vor heute teilen, vergangene gar nicht
    expect(mergeNext(plan, "a", T).find((x) => x.id === "a")!.end).toBe("2027-02-21");
  });
  it("Teilen und Verbinden lösen den Akzent mit dem Mesozyklus auf", () => {
    const acc = [
      blk("a", "assassin", "2026-09-28", "2026-12-06"),
      { ...blk("w", "slayer", "2026-12-07", "2027-02-21"), meso: "m", accent: "muskel" },
      { ...blk("w2", "knight", "2027-02-22", "2027-04-05"), meso: "m", accent: "muskel" },
    ];
    const sp = splitBlock(acc, "w", "w3", T);
    expect(sp.every((x) => x.accent === undefined)).toBe(true);
    expect(sp.every((x) => x.meso === undefined)).toBe(true);
    const mg = mergeNext([{ ...blk("w", "slayer", "2026-12-07", "2027-02-21"), meso: "m", accent: "kraft" }, blk("w2", "knight", "2027-02-22", "2027-04-05")], "w", T);
    expect(mg.every((x) => x.accent === undefined)).toBe(true);
  });
  it("newMeso übernimmt Alltagslast und Reisen aus den Lebensabschnitten je Teil", () => {
    const sections = [
      { id: "s1", name: "Semesterferien", start: "2026-11-02", end: "2026-12-06", load: "low" as const },
      { id: "s2", name: "Wintersemester", start: "2026-12-07", end: "2027-03-01", load: "high" as const },
    ];
    let n = 0;
    const p = newMeso([], "2026-11-04", () => `b${n++}`, [6, 6], sections);
    const [a, b] = p;
    // Teil 1 läuft sechs Wochen niedrig, Teil 2 sechs Wochen hoch — Mehrheit je Teil gewinnt
    expect(a.load).toBe("low");
    expect(b.load).toBe("high");
    // ohne Abschnitte bleibt es bei medium, wie bisher
    const q = newMeso([], "2026-11-04", () => `c${n++}`);
    expect(q[0].load).toBe("medium");
  });
});

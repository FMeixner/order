import { describe, expect, it } from "vitest";
import { addDays } from "./plan";
import { bereiche, bereicheSummary, freshOf, planCoverage } from "./bereiche";
import type { ResidualClock } from "./residual";
import type { AppState, PlanBlock } from "../types";

const T = "2026-11-09";
const clock = (id: ResidualClock["id"], days: number | null, budget: number): ResidualClock => ({ id, name: id, budget, days, last: null, over: days === null ? true : days > budget });

describe("Bereiche", () => {
  it("Frische: frisch, bald (ab 70 %), fällig, noch nie", () => {
    expect(freshOf(clock("kraft", 5, 30), true)).toBe("fresh");
    expect(freshOf(clock("kraft", 22, 30), true)).toBe("soon");
    expect(freshOf(clock("kraft", 31, 30), true)).toBe("due");
    expect(freshOf(clock("kraft", null, 30), true)).toBe("never");
    expect(freshOf(clock("kraft", null, 30), false)).toBe("none");
  });

  it("Im Plan: Hauptziel voll, Nebenziel halb, nur das nächste halbe Jahr", () => {
    const plan: PlanBlock[] = [{ id: "a", focusId: "smith", label: "", start: T, end: addDays(T, 7 * 8 - 1), load: "medium", travel: false }];
    const cov = planCoverage(plan, T);
    expect(cov.strength).toBe(8);
    const late: PlanBlock[] = [{ id: "b", focusId: "smith", label: "", start: addDays(T, 7 * 30), end: addDays(T, 7 * 38 - 1), load: "medium", travel: false }];
    expect(planCoverage(late, T).strength ?? 0).toBe(0);
  });

  it("Zusammenfassung: fehlende Pflichtbereiche als Lücke, Muskel und Sehnen ohne Pflicht", () => {
    const plan: PlanBlock[] = [{ id: "a", focusId: "smith", label: "", start: T, end: addDays(T, 7 * 26 - 1), load: "medium", travel: false }];
    const st = { plan, sessions: [] } as unknown as AppState;
    const rows = bereiche(st, T, plan, []);
    const sum = bereicheSummary(rows);
    expect(rows.find((r) => r.def.id === "kraft")?.cover).toBe("ok");
    expect(sum.gaps.map((r) => r.def.id)).toContain("aerob");
    expect(sum.gaps.map((r) => r.def.id)).not.toContain("masse");
    expect(sum.gaps.map((r) => r.def.id)).not.toContain("sehnen");
  });
});

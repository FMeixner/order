import { describe, expect, it } from "vitest";
import { BEAST_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import { loadAdjust, suggestLoad } from "./loadbeast";

const tiamat = BEAST_BY_ID["pg-tiamat"];
const prof = (sandbags?: number[]) => { const p = EQUIPMENT_PRESETS[1].make(); return { ...p, has: { ...p.has, sandbag: true }, sandbags }; };

describe("Mutierte Lastbestie", () => {
  it("Tiamat: keine Übung zweimal hintereinander über die Runden", () => {
    const parts = tiamat.work.split(" · ").filter((x) => !/^Rest/.test(x));
    expect(new Set(parts.map((x) => x.replace(/^\d+\s/, ""))).size).toBe(parts.length);
  });
  it("passender Sack: keine Mutation; schwerer Sack: weniger Wiederholungen, leichter: mehr", () => {
    const st = emptyState();
    expect(loadAdjust(st, tiamat, prof([20]))).toBeNull();
    expect(suggestLoad(st, tiamat, prof([25]))?.kg).toBe(25);
    const heavy = loadAdjust(st, tiamat, prof([25]))!;
    expect(heavy.factor).toBeCloseTo(0.8);
    expect(heavy.work).toBe("12 Sandbag Bent-Over Row · 8 Sandbag Romanian Deadlift · 8 Sandbag Ground-to-Shoulder · Rest 60s");
    const light = loadAdjust(st, tiamat, prof([15]))!;
    expect(light.factor).toBeCloseTo(1.33);
    expect(light.work.startsWith("20 Sandbag Bent-Over Row · 13 Sandbag Romanian Deadlift · 14 Sandbag Ground-to-Shoulder")).toBe(true);
  });
  it("eigenes Gewicht eingetragen: Mutation folgt dem Eintrag; ohne Sackliste keine Mutation", () => {
    const st = emptyState();
    expect(loadAdjust(st, tiamat, prof(), 30)!.factor).toBeCloseTo(0.67);
    expect(loadAdjust(st, tiamat, prof())).toBeNull();
  });
  it("mutierte Läufe zählen nicht als Rekord und steuern die Progression nicht", () => {
    const st = { ...emptyState(), beastTimes: { "pg-tiamat": [{ date: "2026-11-01", seconds: 600, kg: 20, tech: "gut" as const }, { date: "2026-11-05", seconds: 500, kg: 25, tech: "gut" as const, adj: 0.8 }] } };
    // letzter echter Lauf: 20 kg sauber → eine Stufe höher (25), nicht 30
    expect(suggestLoad(st, tiamat, prof())?.kg).toBe(25);
  });
});

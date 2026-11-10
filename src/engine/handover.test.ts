import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import type { SlotState } from "../types";
import { advance, estimateFrom, rangeShift, sharedState, suggest } from "./progression";
import type { Resolved } from "./resolve";

const gym = EQUIPMENT_PRESETS[0].make();
const res = (key: string, reps: string, prog: Resolved["prog"] = "double"): Resolved => ({ key, slotId: key.split("|")[0], name: "Bench Press", kind: "strength", equip: "barbell", loadable: true, sets: 4, reps, prog, missingEquipment: false } as unknown as Resolved);
const st = (weight: number, target: number, updated: string): SlotState => ({ weight, target, stage: 0, fb: ["ok"], topHits: 0, updated });

describe("Übergabe zwischen Wiederholungsbereichen", () => {
  it("Aufbau 4 × 8–12 → Kraft 4 × 4–6: schwerer, vorsichtig, Start am unteren Ende", () => {
    const slots = { "a|Bench Press": st(60, 12, "2026-11-01") };
    const r = res("b|Bench Press", "4-6");
    const s = sharedState(slots, r)!;
    expect(s.shifted).toEqual({ kg: 60, reps: 12 });
    const sug = suggest(r, s, 1, gym);
    expect(sug.weight!).toBeGreaterThan(60);
    // Leistung 60 × (1 + 12/30) = 84; für 6 Wdh gerechnet: 70 → nicht mehr als das
    expect(sug.weight!).toBeLessThanOrEqual(70);
    expect(sug.targetReps).toBeLessThanOrEqual(6);
    expect(sug.hint).toMatch(/umgerechnet/);
  });
  it("Kraft 5er → Aufbau 8–12: leichter", () => {
    const s = rangeShift(res("b|Bench Press", "8-12"), st(100, 5, "2026-11-01"));
    expect(s.weight!).toBeLessThan(100);
    expect(s.weight!).toBeGreaterThan(75);
    expect(s.target).toBe(8);
  });
  it("gleicher Bereich: Stand wird geteilt wie bisher", () => {
    const slots = { "a|Bench Press": st(60, 10, "2026-11-01") };
    const s = sharedState(slots, res("b|Bench Press", "8-12"))!;
    expect(s.weight).toBe(60);
    expect(s.shifted).toBeUndefined();
  });
  it("eigener Stand der Stelle gewinnt gegen einen fremden Bereich (kein Pendeln zwischen schwerem und leichtem Tag)", () => {
    const slots = { "heavy|Bench Press": st(80, 5, "2026-11-02"), "light|Bench Press": st(60, 12, "2026-11-06") };
    expect(sharedState(slots, res("heavy|Bench Press", "4-6"))!.weight).toBe(80);
    expect(sharedState(slots, res("light|Bench Press", "8-12"))!.weight).toBe(60);
  });
  it("die Umrechnung wird nie gespeichert", () => {
    const r = res("b|Bench Press", "4-6");
    const s = sharedState({ "a|Bench Press": st(60, 12, "2026-11-01") }, r)!;
    const next = advance(r, s, { feedback: "ok", sets: [{ done: true, reps: 5, weight: 67.5 }] } as never, gym, "2026-11-10");
    expect(next.shifted).toBeUndefined();
  });
});

describe("Schätzung aus verwandten Übungen", () => {
  const r2 = (name: string, reps: string, equip = "machine"): Resolved => ({ ...res(`x|${name}`, reps), name, equip } as Resolved);
  it("Chest Press startet aus Bench Press: leichter als gerechnet, nie bei null", () => {
    const slots = { "a|Bench Press": st(80, 8, "2026-11-01") };
    const r = r2("Chest Press Machine", "8-12");
    const s = sharedState(slots, r)!;
    expect(s.estimated?.from).toBe("Bench Press");
    // 80 × (1 + 8/30) × 0,9 / (1 + 12/30) × 0,85 ≈ 55
    expect(s.weight!).toBeGreaterThan(45);
    expect(s.weight!).toBeLessThan(65);
    const sug = suggest(r, s, 1, gym);
    expect(sug.weight).not.toBeNull();
    expect(sug.hint).toMatch(/Schätzung aus Bench Press/);
  });
  it("Kurzhantel je Hantel: DB Bench Press aus Bench Press", () => {
    const s = estimateFrom({ "a|Bench Press": st(80, 8, "2026-11-01") }, r2("DB Bench Press", "8-12", "dumbbell"))!;
    expect(s.weight!).toBeGreaterThan(15);
    expect(s.weight!).toBeLessThan(30);
  });
  it("eigener Stand gewinnt; fremde Familie schätzt nichts; die Schätzung wird nie gespeichert", () => {
    const slots = { "a|Bench Press": st(80, 8, "2026-11-01"), "c|Chest Press Machine": st(70, 10, "2026-10-01") };
    expect(sharedState(slots, r2("Chest Press Machine", "8-12"))!.weight).toBe(70);
    expect(estimateFrom({ "a|Bench Press": st(80, 8, "2026-11-01") }, r2("Leg Press", "8-12"))).toBeUndefined();
    const r = r2("Chest Press Machine", "8-12");
    const next = advance(r, sharedState({ "a|Bench Press": st(80, 8, "2026-11-01") }, r), { feedback: "ok", sets: [{ done: true, reps: 10, weight: 55 }] } as never, gym, "2026-11-10");
    expect(next.estimated).toBeUndefined();
  });
});

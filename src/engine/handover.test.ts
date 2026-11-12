import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import type { SlotState } from "../types";
import { advance, estimateFrom, ownBridges, ownRatios, rangeShift, sharedState, suggest } from "./progression";
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
  it("Lückenleiter-Ziel über dem neuen Bereich (Back Squat 5–6, Ziel 7) wird umgerechnet statt übernommen (1.40)", () => {
    const slots = { "a|Bench Press": st(40, 7, "2026-11-01") };
    const r = res("b|Bench Press", "5-6");
    const s = sharedState(slots, r)!;
    expect(s.shifted).toEqual({ kg: 40, reps: 7 });
    expect(s.target).toBe(5);
    const sug = suggest(r, s, 1, gym);
    expect(sug.targetReps!).toBeLessThanOrEqual(6);
    expect(sug.hint).toMatch(/umgerechnet/);
  });
  it("Ziel am oberen Ende des neuen Bereichs (6 in 5–6) bleibt, wie er ist", () => {
    const s = rangeShift(res("b|Bench Press", "5-6"), st(40, 6, "2026-11-01"));
    expect(s.shifted).toBeUndefined();
    expect(s.weight).toBe(40);
    expect(s.target).toBe(6);
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

describe("Schätzwerte lernen (1.33)", () => {
  const T = "2026-11-11";
  const r3 = (name: string, reps: string, equip = "machine"): Resolved => ({ ...res(`x|${name}`, reps), name, equip } as Resolved);
  const cap = (kg: number, reps: number) => kg * (1 + reps / 30);
  it("gemessenes Verhältnis: Incline über den gemessenen Anker Bench Press, 10 % Abschlag", () => {
    // Bench 80 × 8 und Chest Press 90 × 10 gemessen (hinterlegt wäre 0,9, gemessen ≈ 1,18)
    const slots = { "a|Bench Press": st(80, 8, "2026-11-01"), "c|Chest Press Machine": st(90, 10, "2026-11-08") };
    const s = estimateFrom(slots, r3("Incline Bench Press", "8-12", "barbell"), { today: T })!;
    expect(s.estimated).toMatchObject({ from: "Bench Press", how: "measured" });
    expect(s.weight!).toBeCloseTo((cap(80, 8) * 0.82 / (1 + 12 / 30)) * 0.9, 1);
    const ratios = ownRatios(slots, T);
    expect(ratios[0].family).toBe("Drücken");
    expect(ratios[0].ratios["Chest Press Machine"].measured).toBeCloseTo(cap(90, 10) / cap(80, 8), 2);
  });
  it("nur hinterlegt: jüngster Stand der Familie, 15 % Abschlag; alte Stände zählen nicht als gemessen", () => {
    const slots = { "a|Bench Press": st(80, 8, "2026-06-01"), "c|Chest Press Machine": st(90, 10, "2026-11-08") };
    const s = estimateFrom(slots, r3("Incline Bench Press", "8-12", "barbell"), { today: T })!;
    expect(s.estimated).toMatchObject({ from: "Chest Press Machine", how: "family" });
    expect(s.weight!).toBeCloseTo((cap(90, 10) * (0.82 / 0.9) / (1 + 12 / 30)) * 0.85, 1);
  });
  it("Brücke: Dips mit Körpergewicht → Trizeps, 25 % Abschlag; ohne Körpergewicht keine Brücke", () => {
    const slots = { "d|Dip": { ...st(0, 12, "2026-11-05"), weight: null } };
    const r = r3("Rope Pushdown", "10-15", "cable");
    expect(estimateFrom(slots, r, { today: T })).toBeUndefined();
    const s = estimateFrom(slots, r, { today: T, bodyweight: 80 })!;
    expect(s.estimated).toMatchObject({ from: "Dip", how: "bridge", bw: true });
    expect(s.weight!).toBeCloseTo((80 * 0.9 * (1 + 12 / 30) * 0.4 / (1 + 15 / 30)) * 0.75, 1);
    const sug = suggest(r, s, 1, gym);
    expect(sug.hint).toMatch(/Schätzung aus Dip mit Körpergewicht × 12, entfernt verwandt/);
  });
  it("Rangfolge: Familie vor Brücke, eigener Stand vor allem", () => {
    const slots = { "d|Dip": { ...st(0, 12, "2026-11-05"), weight: null }, "o|DB Overhead Triceps Extension": st(14, 10, "2026-10-01") };
    const r = r3("Rope Pushdown", "10-15", "cable");
    expect(estimateFrom(slots, r, { today: T, bodyweight: 80 })!.estimated?.how).toBe("family");
    const own = { ...slots, "p|Rope Pushdown": st(30, 12, "2026-11-01") };
    expect(sharedState(own, r, { today: T, bodyweight: 80 })!.estimated).toBeUndefined();
  });
  it("Rudern → Curls, gelernte Brücke gilt, wenn beide Seiten gemessen sind", () => {
    const slots = { "r|Seated Cable Row": st(70, 10, "2026-11-05") };
    const s = estimateFrom(slots, r3("Barbell Curl", "8-12", "barbell"), { today: T })!;
    expect(s.estimated).toMatchObject({ from: "Seated Cable Row", how: "bridge" });
    const both = { ...slots, "c|Barbell Curl": st(40, 10, "2026-11-06") };
    const b = ownBridges(both, { today: T }).find((x) => x.from === "Seated Cable Row")!;
    expect(b.measured).toBeCloseTo(cap(40, 10) / cap(70, 10), 2);
  });
});

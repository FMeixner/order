import { describe, expect, it } from "vitest";
import { warmCount, warmupKeys } from "./warmup";

const r = (name: string, equip: string, key = name) => ({ key, name, kind: "strength", equip, loadable: true, reps: "8-10", prog: "double" }) as never;

describe("Aufwärmsätze nach Last und Risiko", () => {
  it("Beispiele: Bench 90 zwei, DB Deadlift 2×36 einer, Beinpresse 90 einer", () => {
    expect(warmCount(r("Bench Press", "barbell"), 90)).toBe(2);
    expect(warmCount(r("DB Romanian Deadlift", "dumbbell"), 36)).toBe(1);
    expect(warmCount(r("Leg Press", "machine"), 90)).toBe(1);
  });
  it("leicht, schwungvoll oder Kabel: keiner", () => {
    expect(warmCount(r("Goblet Lunge", "dumbbell"), 20)).toBe(0);
    expect(warmCount(r("Bulgarian Split Squat", "dumbbell"), 20)).toBe(0);
    expect(warmCount(r("KB Swing", "kettlebell"), 32)).toBe(0);
    expect(warmCount(r("Chest Press Machine", "machine"), 50)).toBe(0);
    expect(warmCount(r("Cable Row", "cable"), 90)).toBe(0);
  });
  it("Gewicht unbekannt: nur Langhantel-Mehrgelenksübungen", () => {
    expect(warmCount(r("Bench Press", "barbell"), null)).toBe(1);
    expect(warmCount(r("Leg Press", "machine"), null)).toBe(0);
  });
  it("je Körperhälfte nur die erste schwere Übung", () => {
    const list = [r("Leg Press", "machine"), r("Romanian Deadlift", "barbell"), r("Bench Press", "barbell")];
    const kg: Record<string, number> = { "Leg Press": 90, "Romanian Deadlift": 70, "Bench Press": 90 };
    expect([...warmupKeys(list, (x) => kg[(x as { name: string }).name]).entries()]).toEqual([["Leg Press", 1], ["Bench Press", 2]]);
  });
});

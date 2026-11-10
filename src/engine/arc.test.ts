import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID, KLAMMER_BY_ID } from "../data";
import type { PlanBlock, Section } from "../types";
import { compassOf } from "./compass";
import { kindScore, orderScore, planYear } from "./klammer";
import { dauerlast, focusFor, guidedLevel, weekLoad } from "./weekplan";
import { emptyState } from "../store";

const sec = (id: string, start: string, end: string, load: Section["load"], travel = false): Section => ({ id, name: id, start, end, load, travel });
const SECS = [
  sec("Winter", "2026-09-28", "2027-01-31", "medium"), sec("Prüfungen", "2027-02-01", "2027-02-21", "high"),
  sec("Ferien", "2027-02-22", "2027-03-28", "low"), sec("Sommer", "2027-03-29", "2027-07-11", "medium"), sec("Reise", "2027-07-12", "2027-09-12", "low", true),
];
const blk = (p: Partial<PlanBlock>): PlanBlock => ({ id: "b", focusId: "knight", label: "", start: "2027-02-01", end: "2027-03-21", load: "low", travel: false, ...p });
let n = 0;
const year = () => planYear([blk({ id: "b0", focusId: "assassin", start: "2026-09-28", end: "2026-11-29", load: "medium", meso: "m0", klammer: "gpp" })], SECS, "2026-11-10", () => `x${++n}`,
  { aim: "muskel", aims: [{ aim: "muskel", prio: 1 }, { aim: "kraft", prio: 2 }, { aim: "skill", prio: 3 }], testPolicy: "each", gymDays: 3 });

describe("Jahresbogen und Abstimmung der Zeichen", () => {
  it("das vorige Zeichen bereitet das nächste vor: Masse → Kraft bekommt den Bonus", () => {
    const win = { start: "2027-02-01", end: "2027-03-28" };
    const base = { aim: "allround" as const, deficits: [], steer: [], used: [] };
    const after = kindScore(KLAMMER_BY_ID.kraft, "medium", false, win, { ...base, prev: "muskel" });
    const cold = kindScore(KLAMMER_BY_ID.kraft, "medium", false, win, { ...base, prev: "gpp" });
    expect(after - cold).toBeCloseTo(1);
  });
  it("Modelljahr: Masse → Kraft → Masse → Explosiv auf Reisen; der Stier trägt einen Kraft-Orden", () => {
    const p = year().filter((b) => b.klammer && b.start > "2026-11-29");
    const kinds = p.map((b) => b.klammer).filter((k, i, a) => k !== a[i - 1]);
    expect(kinds).toEqual(["muskel", "kraft", "muskel", "athletik"]);
    const stier = p.find((b) => b.klammer === "kraft")!;
    expect(FOCUS_BY_ID[stier.focusId].goals.primary).toBe("strength");
    // Reise: ein Orden ohne Studio
    const reise = p.filter((b) => b.travel);
    expect(reise.length).toBeGreaterThan(0);
    for (const b of reise) expect(Object.values(FOCUS_BY_ID[b.focusId].roles).every((r) => r.location !== "gym")).toBe(true);
  });
  it("drei Orden im Bären: Aufbau, Aufbau, dann die Umwandlung (Smith) vor der Testwoche", () => {
    const parts = year().filter((b) => b.klammer === "muskel" && b.start >= "2027-03-29");
    expect(parts.length).toBe(3);
    expect(parts[2].focusId).toBe("smith");
    expect(new Set(parts.map((b) => b.focusId)).size).toBe(3);
  });
  it("mit zwei Studio-Tagen rücken Orden ohne Studio in Bär und Stier zurück", () => {
    const k = KLAMMER_BY_ID.muskel, b = blk({ klammer: "muskel" });
    const s = (g: number) => orderScore(FOCUS_BY_ID.barbarian, k, b, "early", undefined, [], [], [], [], g);
    expect(s(1) - s(2)).toBeCloseTo(1.5);
  });
});

describe("Alltagslast je Woche", () => {
  it("Prüfungswochen in einer ruhigen Phase zählen als hoch, die Ferien danach nicht", () => {
    const b = blk({});
    expect(weekLoad(SECS, b, 1)).toBe("high");
    expect(weekLoad(SECS, b, 3)).toBe("high");
    expect(weekLoad(SECS, b, 4)).toBe("low");
  });
  it("nie niedriger als die Phase; ohne Abschnitte gilt die Phase", () => {
    expect(weekLoad(SECS, blk({ load: "high" }), 5)).toBe("high");
    expect(weekLoad(undefined, blk({}), 1)).toBe("low");
  });
  it("die Einheit folgt der Woche: Smith läuft in der Prüfungswoche mit Cluster-Sätzen, danach am Stück", () => {
    const st = { ...emptyState(), sections: SECS };
    const b = blk({ focusId: "smith" });
    const dl = (w: number) => focusFor(st, b, w)!.roles.kraft_2.blocks.flatMap((x) => (x.type === "single" ? [x.slot] : [])).find((s) => s.name === "Deadlift");
    expect(dl(1)?.cluster).toBeTruthy();
    expect(dl(5)?.cluster).toBeUndefined();
  });
});

describe("Kompass", () => {
  it("zeigt Zeichen, Kalorien, Last der Woche und was kommt", () => {
    const plan = [blk({ id: "a", klammer: "kraft", kcal: "maintenance" }), blk({ id: "t", focusId: "test", start: "2027-03-22", end: "2027-03-28" })];
    const c = compassOf({ plan, sections: SECS }, plan[0], 2);
    expect(c).toMatchObject({ klammer: "kraft", kcal: "maintenance", load: "high", next: { label: "Testwoche", test: true, weeks: 5 } });
    expect(compassOf({ plan, sections: SECS }, plan[0], 7).next?.weeks).toBe(0);
  });
});

describe("Dauerlast und geführte Übungen", () => {
  const winter = [sec("Winter", "2026-09-28", "2027-01-31", "medium")];
  it("der erste Orden eines mittleren Abschnitts läuft normal, der nächste wechselt auf geführt", () => {
    const first = blk({ start: "2026-09-28", end: "2026-11-01", load: "medium" });
    const second = blk({ start: "2026-11-02", end: "2026-12-06", load: "medium" });
    expect(dauerlast(winter, first)).toBe(false);
    expect(dauerlast(winter, second)).toBe(true);
    expect(guidedLevel(winter, first, 3)).toBe(0);
    expect(guidedLevel(winter, second, 1)).toBe(1);
  });
  it("ein ruhiger Abschnitt setzt zurück; ohne Abschnitte keine Dauerlast", () => {
    const secs = [sec("A", "2026-09-28", "2026-11-29", "medium"), sec("Pause", "2026-11-30", "2026-12-20", "low"), sec("B", "2026-12-21", "2027-03-28", "medium")];
    expect(dauerlast(secs, blk({ start: "2026-12-21", end: "2027-02-14", load: "medium" }))).toBe(false);
    expect(dauerlast(undefined, blk({ load: "medium" }))).toBe(false);
  });
  it("acht Wochen hohe Last: ab der Mitte eine geführte Übung mehr, nie von Anfang an", () => {
    const b = blk({ start: "2027-02-01", end: "2027-03-28", load: "high" });
    expect(guidedLevel(undefined, b, 2)).toBe(1);
    expect(guidedLevel(undefined, b, 5)).toBe(2);
    // kürzer als acht Wochen: bleibt bei der Hälfte
    expect(guidedLevel(undefined, blk({ start: "2027-02-01", end: "2027-03-14", load: "high" }), 6)).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { resolveSlot } from "./resolve";
import { advance, capStage, sharedState, suggest } from "./progression";

// Doppelte Progression seit 1.50 (Friedrich): nach Epley hochzählen, bis der nächste Gewichtssprung am unteren Ende
// des Bereichs oder höchstens 2 darunter landet. Keine feste Obergrenze.
describe("Seitheben 12–15 mit Kurzhanteln in 1,5-kg-Stufen (1.50)", () => {
  const home = { ...EQUIPMENT_PRESETS[1].make(), id: "h", dumbbells: Array.from({ length: 27 }, (_, i) => 2.5 + i * 1.5) };
  const r = resolveSlot({ id: "w-do-5c", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" } as never, home, false)!;
  const st = (target: number, fb = "ok") => ({ weight: 4, target, stage: 0, fb: [fb], topHits: 0, updated: "x" }) as never;
  const e = (reps: number, fb = "ok") => ({ key: r.key, slotId: "w-do-5c", name: r.name, prog: "double", feedback: fb, sets: [1, 2, 3].map(() => ({ done: true, reps, weight: 4 })) }) as never;
  it("mit 4 kg steigen die Wiederholungen bis 25, die Karte nennt den Sprung", () => {
    const sg = suggest(r, st(20), 3, home);
    expect([sg.weight, sg.targetReps]).toEqual([4, 20]);
    expect(sg.gap).toBe("→ bis 3 × 25, dann 5.5 kg".replace("5.5", "5,5"));
    expect(advance(r, st(20), e(20), home, "d")).toMatchObject({ weight: 4, target: 21 });
  });
  it("bei 25 Wdh: Sprung auf 5,5 kg, Ziel höchstens 2 unter dem Bereich", () => {
    const nx = advance(r, st(25), e(25), home, "d");
    expect(nx.weight).toBe(5.5);
    expect(nx.target).toBeGreaterThanOrEqual(10);
    expect(nx.target).toBeLessThanOrEqual(12);
  });
  it("schon über der Grenze gespeichert (4 kg × 28): gleich 5,5 kg", () => {
    const sg = suggest(r, st(28), 3, home);
    expect(sg.weight).toBe(5.5);
    expect(sg.targetReps).toBeGreaterThanOrEqual(10);
    expect(sg.gap).toMatch(/Großer Sprung/);
  });
  it("aus einem anderen Orden übernommen (4 kg × 28): ebenfalls 5,5 kg", () => {
    const sh = sharedState({ "ba-ob-0|DB Lateral Raise": { weight: 4, target: 28, stage: 0, fb: ["ok"], topHits: 0, updated: "2026-11-10" } } as never, r, {});
    expect(suggest(r, sh, 3, home).weight).toBe(5.5);
  });
});

describe("Keine schwerere Hantel am Ort: weiter mit Wiederholungen, ohne Obergrenze (1.50)", () => {
  const top4 = { ...EQUIPMENT_PRESETS[1].make(), id: "h4", dumbbells: [2, 4] };
  const r = resolveSlot({ id: "w-do-5c", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" } as never, top4, false)!;
  const e = (reps: number) => ({ key: r.key, slotId: "w-do-5c", name: r.name, prog: "double", feedback: "ok", sets: [1, 2, 3].map(() => ({ done: true, reps, weight: 4 })) }) as never;
  it("28 Wdh mit der schwersten Hantel: nächstes Ziel 29, nicht 4 kg × 12", () => {
    const st = advance(r, { weight: 4, target: 28, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(28), top4, "d");
    expect(st).toMatchObject({ weight: 4, target: 29 });
    const sg = suggest(r, st, 3, top4);
    expect(sg.targetReps).toBe(29);
    expect(sg.repsLabel).toBe("12+");
    expect(sg.gap).toMatch(/Schwerer gibt es hier nicht/);
  });
  it("auch über 30 geht es weiter", () => {
    expect(advance(r, { weight: 4, target: 30, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(30), top4, "d")).toMatchObject({ weight: 4, target: 31 });
  });
});

describe("Archer Ring Row auf der höchsten Stufe (1.51.4)", () => {
  const gym = EQUIPMENT_PRESETS[0].make();
  const L = ["Ring Row", "Ring Row (Füße erhöht)", "Archer Ring Row"];
  const r = { ...resolveSlot({ id: "w-do-rr", name: "Ring Row", sets: 3, reps: "8-10", prog: "ladder", ladder: L } as never, gym, false)!, ladder: L, prog: "ladder" } as never;
  it("das Zug-Vermögen setzt das Ziel nicht mehr auf den Bereichsanfang zurück", () => {
    expect(capStage(r, { weight: null, target: 10, stage: 2, fb: [], topHits: 1, updated: "x" } as never, 3)).toBeNull();
  });
  it("3 × 12: weiter mit Wiederholungen, je Seite gezählt +2 und gerade (1.51.10)", () => {
    const e = { key: "k", slotId: "w-do-rr", name: "Archer Ring Row", prog: "ladder", stage: 2, feedback: "ok", sets: [12, 12, 12].map((reps) => ({ done: true, reps })) } as never;
    const one = advance(r, { weight: null, target: 10, stage: 2, fb: ["ok"], topHits: 0, updated: "x" } as never, e, gym, "d");
    expect(one.target).toBe(14);
    expect(suggest(r, one, 1, gym)).toMatchObject({ targetReps: 14, repsLabel: "8+" });
    const odd = suggest(r, { ...one, target: 13 }, 1, gym);
    expect(odd.targetReps).toBe(14);
  });
});

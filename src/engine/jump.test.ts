import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { resolveSlot } from "./resolve";
import { advance, sharedState, suggest } from "./progression";

describe("Große Sprünge: schnell aufs höhere Gewicht, Wiederholungen darunter (1.49)", () => {
  const home = { ...EQUIPMENT_PRESETS[1].make(), id: "h" }; // Kurzhanteln in 2-kg-Stufen
  const r = resolveSlot({ id: "w-do-5c", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" } as never, home, false)!;
  it("28 Wdh mit 4 kg: Vorschlag 6 kg mit 9 Wdh, nicht 4 kg × 12–15", () => {
    const sg = suggest(r, { weight: 4, target: 28, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, 3, home);
    expect(sg.weight).toBe(6);
    expect(sg.targetReps).toBe(9);
    expect(sg.gap).toMatch(/Großer Sprung/);
  });
  it("aus einem anderen Bereich übernommen (4 kg × 28): ebenfalls 6 kg", () => {
    const st = sharedState({ "ba-ob-0|DB Lateral Raise": { weight: 4, target: 28, stage: 0, fb: ["ok"], topHits: 0, updated: "2026-11-10" } } as never, r, {});
    expect(suggest(r, st, 3, home).weight).toBe(6);
  });
  it("nach 15 Wdh: Sprung auf 6 kg mit 9 Wdh, im Bereich bleibt es beim Gewicht", () => {
    const e = (reps: number) => ({ key: r.key, slotId: "w-do-5c", name: r.name, prog: "double", feedback: "ok", sets: [1, 2, 3].map(() => ({ done: true, reps, weight: 4 })) }) as never;
    expect(advance(r, { weight: 4, target: 15, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(15), home, "d")).toMatchObject({ weight: 6, target: 9 });
    expect(advance(r, { weight: 4, target: 13, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(13), home, "d").weight).toBe(4);
  });
});

describe("Keine schwerere Hantel am Ort: weiter mit Wiederholungen statt zurück auf 12 (1.49.1)", () => {
  const top4 = { ...EQUIPMENT_PRESETS[1].make(), id: "h4", dumbbells: [2, 4] };
  const r = resolveSlot({ id: "w-do-5c", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" } as never, top4, false)!;
  const e = (reps: number) => ({ key: r.key, slotId: "w-do-5c", name: r.name, prog: "double", feedback: "ok", sets: [1, 2, 3].map(() => ({ done: true, reps, weight: 4 })) }) as never;
  it("28 Wdh mit der schwersten Hantel: nächstes Ziel 29, nicht 4 kg × 12", () => {
    const st = advance(r, { weight: 4, target: 28, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(28), top4, "d");
    expect(st).toMatchObject({ weight: 4, target: 29 });
    const sg = suggest(r, st, 3, top4);
    expect(sg.targetReps).toBe(29);
    expect(sg.gap).toMatch(/Schwerer gibt es hier nicht/);
  });
  it("an der Grenze von 30 bleibt es oben", () => {
    expect(advance(r, { weight: 4, target: 30, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } as never, e(30), top4, "d")).toMatchObject({ weight: 4, target: 30 });
  });
});

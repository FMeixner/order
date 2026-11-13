import { describe, expect, it } from "vitest";
import { capStage, pullCapacity, packetStage } from "./progression";
import type { Resolved } from "./resolve";

const ring = { slotId: "w-do-3", key: "w-do-3|Ring Row", name: "Ring Row", tier: "home", equip: "bodyweight", sets: 4, reps: "8-10", prog: "ladder", kind: "strength", rest: 90, loadable: false, ladder: ["Ring Row", "Ring Row (Füße erhöht)", "Archer Ring Row"] } as unknown as Resolved;
const st = (stage: number) => ({ weight: null, target: 8, stage, fb: [], topHits: 0, updated: "2026-11-01" });

describe("Übertrag auf Leitern (1.44)", () => {
  it("10 Klimmzüge im Test: Ringrudern klar zu leicht → Archer Ring Row", () => {
    const cap = pullCapacity({ tests: { "t-pullups": [{ date: "2026-11-11", blockId: "t", value: 10, raw: "10" }] }, sessions: [], packets: {} }, "2026-11-13");
    const s = capStage(ring, st(0), cap)!;
    expect(s.stage).toBe(2);
    expect(s.reps).toBeLessThanOrEqual(15);
  });
  it("wenige Klimmzüge: bleibt; nie nach unten", () => {
    const cap = pullCapacity({ tests: { "t-pullups": [{ date: "2026-11-11", blockId: "t", value: 2, raw: "2" }] }, sessions: [], packets: {} }, "2026-11-13");
    expect(capStage(ring, st(1), cap)).toBeNull();
  });
  it("eigenes Päckchen „Ring Rows“ zählt (Name wie in den Bestien)", () => {
    const cap = pullCapacity({ tests: {}, sessions: [], packets: { "Ring Rows": 20 } }, "2026-11-13");
    expect(capStage(ring, st(0), cap)?.stage).toBeGreaterThan(0);
    expect(packetStage(ring, undefined, { "Ring Rows": 15 })).toBe(1);
  });
});

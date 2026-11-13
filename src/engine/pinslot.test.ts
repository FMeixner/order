import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import { pinAutoSlots, slotsFor } from "./sharpen";

describe("Automatischer Schwerpunkt bleibt in der laufenden Phase stehen (1.47)", () => {
  it("festgehalten beim Start; Testwerte und eigene Wahl verschieben ihn nicht mehr", () => {
    const s = emptyState();
    const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-13", end: "2027-01-24", load: "medium" as const, travel: false };
    const st0 = { ...s, equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as typeof s.schedule, plan: [b] };
    const before = slotsFor(st0, b).s1.domain;
    const st1 = pinAutoSlots(st0, "2026-11-13")!;
    expect(st1.plan[0].sharpenAuto?.domain).toBe(before);
    // Tests, die die Uhren verschieben (Kraftausdauer, Schnelligkeit frisch)
    const st2 = { ...st1, tests: { "t-pushups": [{ date: "2026-11-13", blockId: "t", value: 40, raw: "40" }], "t-sprint30": [{ date: "2026-11-13", blockId: "t", value: 4.3, raw: "4,3" }] } };
    expect(slotsFor(st2, st2.plan[0]).s1.domain).toBe(before);
    // eigene Wahl und zurück auf Automatisch: wieder dieselbe
    const own = { ...st2, plan: [{ ...st2.plan[0], sharpen: "mobility" }] };
    expect(slotsFor(own, own.plan[0]).s1.domain).toBe("mobility");
    const back = { ...own, plan: [{ ...own.plan[0], sharpen: undefined }] };
    expect(slotsFor(back, back.plan[0]).s1.domain).toBe(before);
    // nicht noch einmal festhalten
    expect(pinAutoSlots(st1, "2026-11-20")).toBeNull();
  });
});

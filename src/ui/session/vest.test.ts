import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { collectItems } from "./items";

describe("Weste im Superset (1.46)", () => {
  it("trägt Ring Row die Weste, bekommen Deficit Push-Ups dieselbe – mit Wiederholungen ab 6, ohne Aufteilen", () => {
    const home = { ...EQUIPMENT_PRESETS[1].make(), id: "h", vest: [5, 10, 15, 20], has: { ...EQUIPMENT_PRESETS[1].make().has, rings: true, handles: true } };
    const s = emptyState();
    const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false };
    const st = { ...s, equipment: [home], plan: [b], slots: { "w-do-3|Ring Row": { weight: 10, target: 8, stage: 2, fb: [], topHits: 0, updated: "2026-11-10", loaded: true } } };
    const items = collectItems({ state: st, block: b, focus: FOCUS_BY_ID.slayer, week: 1, roleKey: "home_hypertrophie", profile: home, date: "2026-11-19", reduced: false } as never);
    const sup = items.find((x) => x.block.type === "superset" && x.resolved.some((r) => /Ring Row/.test(r.name)))!;
    expect(sup).toBeTruthy();
    expect(sup.resolved.every((r) => r.equip === "plate")).toBe(true);
    const push = sup.resolved.find((r) => r.name === "Deficit Push-Up")!;
    expect(push.reps).toBe("6-10");
    expect(push.vestShared?.kg).toBe(10);
    // gleiche Satzzahl im Superset
    const sets = (sup.block as { slots: { sets: number }[] }).slots.map((x) => x.sets);
    expect(new Set(sets).size).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { FOCUS_BY_ID } from "../../data";
import { collectItems } from "./items";
import { dayGear } from "./gear";

describe("Ausrüstung des Tages", () => {
  it("Knight Oberkörper im Studio: Kurzhanteln und Kabelzug; ohne Körpergewicht und Strecke; Reihenfolge große Geräte zuerst", () => {
    const s = emptyState();
    const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const block = { id: "b1", focusId: "knight", label: "", start: "2026-09-28", end: "2026-12-20", load: "medium" as const, travel: false };
    const st = { ...s, equipment: [gym], plan: [block] };
    const gear = dayGear(collectItems({ state: st, block, focus: FOCUS_BY_ID.knight, week: 1, roleKey: "upper_a", profile: gym, date: "2026-09-28", reduced: false } as never));
    expect(gear).toContain("Kabelzug");
    expect(gear).toContain("Kurzhanteln");
    expect(gear).not.toContain("Körpergewicht");
    expect(gear.indexOf("Kurzhanteln")).toBeLessThan(gear.indexOf("Kabelzug"));
  });
});

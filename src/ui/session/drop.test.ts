import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { collectItems, isIsolation } from "./items";

describe("Isolation ohne Ersatz entfällt still (1.49)", () => {
  it("ganz ohne Gerät: Curls und Trizeps fallen weg und stehen als „entfällt“, Mehrgelenkiges bleibt mit Hinweis", () => {
    const base = EQUIPMENT_PRESETS[0].make();
    const bare = { ...base, id: "x", name: "Nichts", dumbbells: [], kettlebells: [], barbell: null, bands: [], vest: [],
      has: Object.fromEntries(Object.keys(base.has).map((k) => [k, false])) as typeof base.has };
    const s = emptyState();
    const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false };
    const items = collectItems({ state: { ...s, equipment: [bare], plan: [b] }, block: b, focus: FOCUS_BY_ID.slayer, week: 1, roleKey: "arme_kurz", profile: bare, date: "2026-11-17", reduced: false } as never);
    const dropped = items.flatMap((x) => x.dropped ?? []);
    expect(dropped.some((n) => /Curl/.test(n))).toBe(true);
    expect(dropped.every(isIsolation)).toBe(true);
    // nichts Isoliertes mit Warnung übrig
    expect(items.flatMap((x) => x.resolved).filter((r) => r.missingEquipment && isIsolation(r.name))).toEqual([]);
  });
  it("Mehrgelenkübungen sind keine Isolation", () => {
    expect(isIsolation("Hammer Curl")).toBe(true);
    expect(isIsolation("Bench Press")).toBe(false);
  });
});

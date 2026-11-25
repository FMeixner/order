import { describe, expect, it } from "vitest";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { dayRoleMap } from "./plan";
import { focusFor } from "./weekplan";

// 1.51.11 (Friedrich): Mo und Di fallen aus, die Donnerstags-Einheit wird am Mittwoch gemacht.
// Vorher sprang sie auf Montag und schob die Ausfälle auf Di und Do.
describe("Nachgeholte Einheit an einem freien Tag", () => {
  const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
  const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-09", end: "2027-01-24", load: "medium" as const, travel: false };
  const st = { ...emptyState(), equipment: [g], plan: [b], schedule: { Mo: "g", Di: "g", Mi: null, Do: "g", Fr: "g", Sa: null, So: null },
    roleOrder: { b1: ["kraft_a", "arme_kurz", "home_hypertrophie", "kraft_contrast"] },
    dayAdj: { "b1:3:kraft_a": { skip: true }, "b1:3:arme_kurz": { skip: true } },
    sessions: [{ id: "b1:3:home_hypertrophie", date: "2026-11-25", blockId: "b1", focusId: "slayer", week: 3, role: "home_hypertrophie", profileId: "g", done: true, drills: {}, entries: {} }] } as never as ReturnType<typeof emptyState>;
  it("bleibt auf ihrem Tag, die Ausfälle bleiben auf Mo und Di", () => {
    const m = dayRoleMap(st, b as never, focusFor(st, b as never, 3)!, 3);
    expect(m.map((d) => `${d.day}:${d.role}`)).toEqual(["Mo:kraft_a", "Di:arme_kurz", "Do:home_hypertrophie", "Fr:kraft_contrast"]);
  });
});

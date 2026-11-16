import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { isAWeek } from "../../engine/plan";
import { collectItems } from "./items";

describe("Slayer Kraft Kontrast bei hoher Last (1.50)", () => {
  const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
  const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "high" as const, travel: false };
  const st = { ...emptyState(), equipment: [gym], plan: [b] };
  const at = (week: number) => collectItems({ state: st, block: b, focus: FOCUS_BY_ID.slayer, week, roleKey: "kraft_contrast", profile: gym, date: "2026-11-20", reduced: false } as never);
  const weekOf = (ab: "A" | "B") => [1, 2, 3, 4].find((w) => isAWeek(w) === (ab === "A"))!;
  it("Kontraste stehen am Anfang der Einheit, A wie B", () => {
    for (const ab of ["A", "B"] as const) {
      const types = at(weekOf(ab)).filter((x) => x.resolved.length).map((x) => x.block.type);
      expect(types.slice(0, 2)).toEqual(["contrast", "contrast"]);
    }
  });
  it("Kniebeuge und Bankdrücken bleiben frei, Rudern wird geführt — auch als Kontrastpartner in der B-Woche", () => {
    for (const ab of ["A", "B"] as const) {
      const names = at(weekOf(ab)).flatMap((x) => x.resolved.map((r) => r.name));
      expect(names).toContain("Back Squat");
      expect(names).toContain("Bench Press");
      expect(names).not.toContain("Barbell Row");
      expect(names).toContain("Seated Cable Row");
    }
  });
});

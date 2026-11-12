import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, PlanBlock, Session } from "../types";
import { blockWeeks, dayRoleMap, defaultRoles, mondayOf } from "./plan";
import { focusFor } from "./weekplan";
import { weekDone } from "./who5";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
function st(b: Partial<PlanBlock> = {}): AppState {
  return {
    ...emptyState(), equipment: [gym], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
    plan: [{ id: "b1", focusId: "assassin", label: "x", start: "2026-09-21", end: "2026-11-01", load: "medium", travel: false, ...b }],
  };
}
const session = (b: PlanBlock, date: string, role: string): Session =>
  ({ id: `s-${date}`, date, blockId: b.id, focusId: b.focusId, week: 1, role, profileId: "g", entries: {}, drills: {}, done: true });

describe("Anlaufwoche (1.38): dayRoleMap schneidet Tage außerhalb des Ordens", () => {
  it("Beginn am Donnerstag: Woche 1 führt nur Do und Fr, in geplanter Rollenfolge", () => {
    const b = st({ start: "2026-09-24" }).plan[0]!; // Do
    const s = st({ start: b.start });
    const f = focusFor(s, b, 1)!;
    const def = defaultRoles(f, 4);
    expect(dayRoleMap(s, b, f, 1).map((d) => d.day)).toEqual(["Do", "Fr"]);
    expect(dayRoleMap(s, b, f, 1).map((d) => d.role)).toEqual([def[2], def[3]]); // die geplanten Rollen der Tage
    // Woche 2 unverändert: alle vier Tage
    expect(dayRoleMap(s, b, focusFor(s, b, 2)!, 2).map((d) => d.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
  });

  it("Beginn am Montag bleibt unangetastet", () => {
    const s = st();
    const b = s.plan[0]!;
    const f = focusFor(s, b, 1)!;
    expect(dayRoleMap(s, b, f, 1).map((d) => d.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
  });

  it("Ende mittendrin kürzt die letzte Woche symmetrisch", () => {
    // Ende Do: blockWeeks rundet auf 3 auf, die Restwoche (Mo–Do) zählt als Woche 3
    const s = st({ start: "2026-09-21", end: "2026-10-08" });
    const b = s.plan[0]!;
    expect(blockWeeks(b)).toBe(3);
    const f = focusFor(s, b, 3)!;
    expect(dayRoleMap(s, b, f, 3).map((d) => d.day)).toEqual(["Mo", "Di", "Do"]);
    // Ende Mi (drei Tage Restwoche, blockWeeks rundet ab): letzte volle Woche bleibt vollständig
    const s2 = st({ start: "2026-09-21", end: "2026-10-07" });
    const b2 = s2.plan[0]!;
    expect(blockWeeks(b2)).toBe(2);
    expect(dayRoleMap(s2, b2, focusFor(s2, b2, 2)!, 2).map((d) => d.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
  });

  it("ohne week bleibt die Karte ungeschnitten (z. B. Vorschau der Rollen)", () => {
    const s = st({ start: "2026-09-24" });
    const b = s.plan[0]!;
    const f = focusFor(s, b, 1)!;
    expect(dayRoleMap(s, b, f).map((d) => d.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
  });

  it("weekDone sieht die Anlaufwoche als erledigt, sobald die offenen Einheiten fertig sind", () => {
    const s0 = st({ start: "2026-09-25" }); // Fr: nur eine Sitzung in Woche 1
    const b = s0.plan[0]!;
    expect(mondayOf(b.start)).not.toBe(b.start);
    const f = focusFor(s0, b, 1)!;
    const days = dayRoleMap(s0, b, f, 1);
    expect(days.map((d) => d.day)).toEqual(["Fr"]);
    expect(weekDone(s0, b, 1)).toBe(false);
    const s1 = { ...s0, sessions: [session(b, "2026-09-25", days[0]!.role)] };
    expect(weekDone(s1, b, 1)).toBe(true); // „1 von 1“
  });
});

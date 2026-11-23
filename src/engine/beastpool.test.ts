import { describe, expect, it } from "vitest";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { focusFor } from "./weekplan";
import { lastWeekBeasts, pickBeast } from "./plan";
import "../ui/session/items";

// 1.51.6 (Friedrich): Ausgefallene Einheiten geben ihre Bestie in den Pool zurück
describe("Bestie einer ausgefallenen Einheit kommt zurück in den Pool", () => {
  const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" }, h = { ...EQUIPMENT_PRESETS[1].make(), id: "h" };
  const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false };
  const base = { ...emptyState(), equipment: [g, h], plan: [b], schedule: { Mo: "g", Di: "g", Mi: null, Do: "h", Fr: "g", Sa: "h", So: null },
    roleOrder: { b1: ["kraft_a", "arme_kurz", "home_hypertrophie", "kraft_contrast", "wochenende_kondition"] } } as never as ReturnType<typeof emptyState>;
  const blk = (st: ReturnType<typeof emptyState>, week: number) => focusFor(st, b as never, week)!.roles.home_hypertrophie.blocks.find((x) => x.type === "beast")!;
  const opts = (st: ReturnType<typeof emptyState>, week: number) => ({ state: st, blockId: "b1", week, profile: h, reduced: false, user: st.user }) as never;
  it("mit Log zählt nur, was lief: die geplante, nicht gelaufene Bestie der Vorwoche ist wieder frei", () => {
    const w1 = pickBeast(blk(base, 1) as never, opts(base, 1))!.id;
    const done = (role: string, date: string) => ({ id: `b1:1:${role}`, date, blockId: "b1", focusId: "slayer", week: 1, role, profileId: "g", done: true, drills: {}, entries: {} });
    const logged = { ...base, sessions: [done("kraft_a", "2026-11-16"), done("arme_kurz", "2026-11-17")] } as never as ReturnType<typeof emptyState>;
    expect(lastWeekBeasts(blk(base, 2) as never, opts(base, 2)).has(w1)).toBe(true);
    expect(lastWeekBeasts(blk(logged, 2) as never, opts(logged, 2)).has(w1)).toBe(false);
  });
});

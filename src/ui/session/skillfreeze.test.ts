import { describe, expect, it } from "vitest";
import { focusFor } from "../../engine/weekplan";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { collectItems } from "./items";
import { sessionId } from "./ctx";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
describe("Skill-Karte bleibt in der laufenden Einheit stehen (1.51.3)", () => {
  it("ein in dieser Einheit geschafftes Kriterium schaltet die Karte nicht um", () => {
    const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false, sharpen: "skill" };
    const base = { ...emptyState(), equipment: [gym], plan: [b] };
    const F = focusFor(base as never, b as never, 1)!;
    const roleOf = Object.keys(F.roles).find((rk) => collectItems({ state: base, block: b, focus: F, week: 1, roleKey: rk, profile: gym, date: "2026-11-16", reduced: false } as never).some((x) => x.fill?.startsWith("Schwerpunkt: Skill")))!;
    const ctx = (st: object) => ({ state: st, block: b, focus: F, week: 1, roleKey: roleOf, profile: gym, date: "2026-11-16", reduced: false }) as never;
    const skill = (st: object) => collectItems(ctx(st)).find((x) => x.fill?.startsWith("Schwerpunkt: Skill"));
    const before = skill(base);
    expect(before).toBeTruthy();
    const r = before!.resolved[0];
    const sid = sessionId("b1", 1, roleOf);
    const s = { id: sid, date: "2026-11-16", blockId: "b1", week: 1, role: roleOf, profileId: "g", done: false, drills: {},
      entries: { [r.key]: { key: r.key, slotId: r.slotId, name: r.name, prog: r.prog, sets: [{ done: true, reps: 99, seconds: 999 }] } } };
    const after = skill({ ...base, sessions: [s] });
    expect(after?.resolved.map((x) => x.name)).toEqual(before!.resolved.map((x) => x.name));
  });
});

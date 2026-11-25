import { describe, expect, it } from "vitest";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { focusFor } from "./weekplan";
import { inReentry, reentryWindow } from "./reentry";
import { slotsOf } from "./shortday";

describe("Wiedereinstieg (1.51.8)", () => {
  const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" }, h = { ...EQUIPMENT_PRESETS[1].make(), id: "h" };
  const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false };
  const base = { ...emptyState(), equipment: [g, h], plan: [b], schedule: { Mo: "g", Di: "g", Mi: null, Do: "h", Fr: "g", Sa: "h", So: null },
    roleOrder: { b1: ["kraft_a", "arme_kurz", "home_hypertrophie", "kraft_contrast", "wochenende_kondition"] } } as never as ReturnType<typeof emptyState>;
  const done = (role: string, date: string) => ({ id: `b1:2:${role}`, date, blockId: "b1", focusId: "slayer", week: 2, role, profileId: "g", done: true, drills: {}, entries: {} });
  it("rollend: ab der ersten Einheit vier Tage, diese eingeschlossen", () => {
    const st = { ...base, reentry: { from: "2026-11-23" }, sessions: [done("arme_kurz", "2026-11-24")] } as never;
    expect(reentryWindow(st)).toMatchObject({ first: "2026-11-24", end: "2026-11-27" });
    expect(inReentry(st, "2026-11-27")).toBe(true);
    expect(inReentry(st, "2026-11-28")).toBe(false);
    expect(inReentry({ ...base, reentry: { from: "2026-11-23", off: true } } as never, "2026-11-24")).toBe(false);
  });
  it("Einheiten im Fenster: halbe Sätze, keine Bestie; danach normal", () => {
    const st = { ...base, reentry: { from: "2026-11-23" }, sessions: [done("kraft_a", "2026-11-23")] } as never;
    const normal = focusFor(base, b as never, 2)!, re = focusFor(st, b as never, 2)!;
    const sets = (f: typeof normal, rk: string) => f.roles[rk].blocks.flatMap(slotsOf).reduce((a, s) => a + (s.sets ?? 0), 0);
    expect(sets(re, "home_hypertrophie")).toBeLessThan(sets(normal, "home_hypertrophie")); // Do 26.11. im Fenster
    expect(re.roles.home_hypertrophie.blocks.some((x) => x.type === "beast")).toBe(false);
    expect(re.roles.kraft_contrast.blocks).toEqual(normal.roles.kraft_contrast.blocks); // Fr 27.11.: Tag 5, normal
  });
  it("fällt im Fenster etwas aus, wird nichts verschoben", () => {
    const st = { ...base, reentry: { from: "2026-11-23" }, sessions: [done("kraft_a", "2026-11-23")], dayAdj: { "b1:2:arme_kurz": { skip: true } } } as never;
    const f = focusFor(st, b as never, 2)!;
    expect(f.roles.arme_kurz.skipped?.moved).toEqual([]);
    const plain = focusFor({ ...base, reentry: { from: "2026-11-23" }, sessions: [done("kraft_a", "2026-11-23")] } as never, b as never, 2)!;
    for (const rk of ["home_hypertrophie", "kraft_contrast"]) expect(f.roles[rk].blocks).toEqual(plain.roles[rk].blocks);
  });
});

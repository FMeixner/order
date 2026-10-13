import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState, migrate } from "../store";
import type { AppState, Block, Slot } from "../types";
import { dayMods, rememberMod, toggleMod } from "./dayadj";
import { dayRoleMap } from "./plan";
import { focusFor } from "./weekplan";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
function st(extra: Partial<AppState> = {}): AppState {
  return {
    ...emptyState(), equipment: [gym], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
    plan: [{ id: "b1", focusId: "assassin", label: "x", start: "2026-09-21", end: "2026-11-29", load: "medium", travel: false }],
    ...extra,
  };
}
const slots = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const sets = (s: AppState, role: string) => focusFor(s, s.plan[0], 2)!.roles[role].blocks.flatMap(slots).reduce((a, x) => a + (x.sets ?? 3), 0);
const days = (s: AppState) => dayRoleMap(s, s.plan[0], focusFor(s, s.plan[0], 2)!, 2);

describe("Tagesanpassung", () => {
  it("Intensiv steht allein, Kurz/Leicht/Leise lassen sich kombinieren", () => {
    const s0 = st();
    const [d] = days(s0);
    let s = toggleMod(s0, s0.plan[0], 2, d.role, d.day, "short");
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "quiet");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toMatchObject({ short: true, quiet: true, intense: false });
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "intense");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toEqual({ short: false, light: false, quiet: false, intense: true });
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "light");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toMatchObject({ light: true, intense: false });
  });
  it("Spontan Kurz am letzten Tag: kein Ausgleich; am ersten Tag gleichen nur die Tage danach aus", () => {
    const s0 = st();
    const ds = days(s0);
    const last = ds[ds.length - 1];
    const sLast = toggleMod(s0, s0.plan[0], 2, last.role, last.day, "short");
    for (const d of ds.slice(0, -1)) expect(sets(sLast, d.role)).toBe(sets(s0, d.role));
    expect(sets(sLast, last.role)).toBeLessThan(sets(s0, last.role));
    const first = ds[0];
    const sFirst = toggleMod(s0, s0.plan[0], 2, first.role, first.day, "short");
    expect(sets(sFirst, first.role)).toBeLessThan(sets(s0, first.role));
  });
  it("Gemerktes Kurz je Wochentag wirkt wie der alte Kurztag der Phase und ersetzt ihn", () => {
    const s0 = st();
    const fr = days(s0).find((d) => d.day === "Fr")!;
    const legacy = st({ plan: [{ ...s0.plan[0], shortRole: fr.role }] });
    const s = rememberMod(legacy, legacy.plan[0], 2, fr.role, "Fr", "short", true);
    expect(s.plan[0].shortRole).toBeUndefined();
    expect(s.dayFlags?.Fr?.short).toBe(true);
    expect(JSON.stringify(focusFor(s, s.plan[0], 2))).toBe(JSON.stringify(focusFor(legacy, legacy.plan[0], 2)));
    // heute aus, gemerkt bleibt
    const off = toggleMod(s, s.plan[0], 2, fr.role, "Fr", "short");
    expect(dayMods(off, off.plan[0], 2, fr.role, "Fr").short).toBe(false);
    expect(dayMods(off, off.plan[0], 3, fr.role, "Fr").short).toBe(true);
  });
  it("Schweißfrei am Ort wird Leise an dessen Wochentagen", () => {
    const office = { ...EQUIPMENT_PRESETS[2].make(), id: "o", sweatFree: true };
    const s = migrate({ ...st(), equipment: [gym, office], schedule: { Mo: "g", Di: "o", Do: "g", Fr: "o" } });
    expect(s.dayFlags).toEqual({ Di: { quiet: true }, Fr: { quiet: true } });
    expect(s.equipment.some((e) => "sweatFree" in e)).toBe(false);
  });
});

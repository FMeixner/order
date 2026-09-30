import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, PlanBlock, TestResult } from "../types";
import { estimateRole } from "./duration";
import { rolesFor } from "./plan";
import { applySlot, deficitsBefore, menuDefault, slotEligible, slotFor } from "./sharpen";
import { suggestSequence } from "./sequence";

const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
const T: PlanBlock = { id: "t1", focusId: "test", label: "", start: "2026-11-30", end: "2026-12-06", load: "low", travel: false };
const blk = (focusId: string, id = "b"): PlanBlock => ({ id, focusId, label: "", start: "2026-12-07", end: "2027-02-21", load: "medium", travel: false });
const r = (value: number): TestResult[] => [{ date: "2026-12-02", blockId: "t1", value, raw: String(value) }];

function base(tests: Record<string, TestResult[]>, extra: PlanBlock[] = []): AppState {
  const s = emptyState();
  return { ...s, onboarded: true, user: { ...s.user, sex: "m", birthYear: 1988 }, equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" }, plan: [T, ...extra], tests };
}
const mobKe = { "t-sitreach": r(-20), "t-pushups": r(10), "t-pullups": r(2), "t-crunches": r(20) };
const aerobKe = { "t-cooper": r(1400), "t-vo2": r(30), "t-pushups": r(10), "t-pullups": r(2), "t-crunches": r(20) };

describe("Schwerpunkt-Slot", () => {
  it("findet Defizite nur deutlich unter der Norm, schwächstes zuerst", () => {
    const d = deficitsBefore(base(mobKe), "2026-12-07")!;
    expect(d.list.map((x) => x.id)).toEqual(["mobility", "ke"]);
    // ohne Testwoche vor der Phase: nichts
    expect(deficitsBefore(base(mobKe), "2026-12-01")).toBeNull();
  });
  it("kein Slot ohne Testwoche vor der Phase, also nichts für die laufende Phase", () => {
    const s = base({}, [blk("assassin")]);
    expect(slotFor(s, s.plan[1]).domain).toBeNull();
  });
  it("Defizit 1, wenn der Orden es nicht selbst trainiert", () => {
    const s = base(mobKe, [blk("witcher")]);
    expect(slotFor(s, s.plan[1]).domain).toBe("mobility");
  });
  it("Defizit 2, wenn der Orden das Hauptdefizit selbst trainiert", () => {
    const s = base(aerobKe, [blk("pilgrim")]);
    const p = slotFor(s, s.plan[1]);
    expect(p.domain).toBe("ke");
    expect(p.reason).toMatch(/Pilgrim selbst/);
  });
  it("Ausdauer stört Muskelaufbau: geht in die Blockfolge statt in den Slot", () => {
    const s = base(aerobKe, [blk("witcher")]);
    const p = slotFor(s, s.plan[1]);
    expect(p.domain).toBe("ke");
    expect(p.deferred.map((d) => d.id)).toContain("aerob");
  });
  it("Spezialist, Aus und eigene Wahl", () => {
    const s = base(mobKe, [blk("witcher")]);
    expect(slotFor({ ...s, user: { ...s.user, focusMode: "special" } }, s.plan[1]).domain).toBeNull();
    expect(slotFor(s, { ...s.plan[1], sharpen: "off" }).source).toBe("off");
    expect(slotFor(s, { ...s.plan[1], sharpen: "power" }).domain).toBe("power");
  });
  it("Kurzorden, Harlequin und Soldier haben keinen Slot", () => {
    for (const id of ["herald", "harlequin", "soldier", "initiate"]) expect(slotEligible(FOCUS_BY_ID[id]), id).toBe(false);
    for (const id of ["witcher", "gladiator", "assassin", "smith", "knight", "olympian", "conqueror"]) expect(slotEligible(FOCUS_BY_ID[id]), id).toBe(true);
  });
  it("Beweglichkeit jeden Tag am Ende, Schnelligkeit zweimal am Anfang, höchstens etwa 15 % der Woche", () => {
    const s = base(mobKe, [blk("witcher")]);
    const f = FOCUS_BY_ID.witcher;
    const roles = rolesFor(s, s.plan[1], f);
    const withMob = applySlot(f, s, s.plan[1]);
    expect(roles.every((rk) => withMob.roles[rk].blocks.at(-1)?.type === "module")).toBe(true);
    const withSpeed = applySlot(f, s, { ...s.plan[1], sharpen: "speed" });
    const first = roles.filter((rk) => { const b0 = withSpeed.roles[rk].blocks[0]; return b0.type === "module" && b0.module === "sharpen"; });
    expect(first.length).toBe(2);
    for (const dom of ["speed", "power", "mobility", "ke", "anaerob"]) {
      const x = applySlot(f, s, { ...s.plan[1], sharpen: dom });
      const week = (ff: typeof f) => roles.reduce((sum, rk) => sum + estimateRole(ff.roles[rk], g).total, 0);
      const extra = (week(x) - week(f)) / week(x);
      expect(extra, dom).toBeLessThan(0.16);
    }
  });
  it("Soldier: Schwerpunkt-Plätze nach den Defiziten vorbelegt", () => {
    const s = base(mobKe, [blk("soldier")]);
    const f = FOCUS_BY_ID.soldier;
    const menus = Object.values(f.roles).flatMap((ro) => ro.blocks).filter((b) => b.type === "menu");
    const picks = menus.map((m) => (m.type === "menu" ? menuDefault(s, s.plan[1], m) : null));
    expect(picks[0]).toBe("Mobility");
    expect(picks).toContain("Kraftausdauer");
  });
  it("Kraft-Ziel: Smith schlägt Herald bei 12 Wochen und mittlerer Alltagslast", () => {
    const plan: PlanBlock[] = [{ id: "p", focusId: "", label: "", start: "2027-04-05", end: "2027-06-27", load: "medium", travel: false }];
    expect(suggestSequence(plan, "2026-12-10", "kraft").items[0].focusId).toBe("smith");
  });
  it("Blockfolge „Defizite zuerst“ bevorzugt Orden für die schwachen Bereiche", () => {
    const plan: PlanBlock[] = [{ ...blk("witcher", "p1"), start: "2027-01-04", end: "2027-03-07" }];
    const allround = suggestSequence(plan, "2026-12-10", "allround");
    const def = suggestSequence(plan, "2026-12-10", "deficits", [{ axis: "ausdauer", w: 1 }]);
    const ae = (id: string) => FOCUS_BY_ID[id].goals.primary === "endurance" || FOCUS_BY_ID[id].goals.secondary.includes("endurance");
    expect(ae(def.items[0].focusId)).toBe(true);
    expect(def.items[0].focusId).toBeDefined();
    expect(allround.items.length).toBe(1);
  });
});

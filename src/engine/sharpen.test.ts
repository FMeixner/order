import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, PlanBlock, TestResult } from "../types";
import { estimateRole } from "./duration";
import { rolesFor } from "./plan";
import { SLOT_BUDGET, applySlots, deficitsBefore, slotEligible, slotsFor } from "./sharpen";
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
const aerobKe = { "t-cooper": r(1400), "t-pushups": r(10), "t-pullups": r(2), "t-crunches": r(20) };

describe("Schwerpunkt-Slot", () => {
  it("findet Defizite nur deutlich unter der Norm, schwächstes zuerst", () => {
    const d = deficitsBefore(base(mobKe), "2026-12-07")!;
    expect(d.list.map((x) => x.id)).toEqual(["mobility", "ke"]);
    // ohne Testwoche vor der Phase: nichts
    expect(deficitsBefore(base(mobKe), "2026-12-01")).toBeNull();
  });
  it("Ein Schwerpunkt je Orden: ohne Testwoche greift der Jahresplan (Erhalt oder Ziel), Slot 2 gibt es nicht", () => {
    const s = base({}, [blk("assassin")]);
    const p = slotsFor(s, s.plan[1]);
    expect(p.s1.domain).not.toBeNull();
    expect(["erhalt", "double", "sekundaer"]).toContain(p.s1.purpose);
    expect(p.s2.domain).toBeNull();
  });
  it("Testdefizit geht vor: schwächster Bereich, den der Orden nicht selbst trainiert", () => {
    const s = base(mobKe, [blk("slayer")]);
    const p = slotsFor(s, s.plan[1]);
    expect(p.s1.domain).toBe("mobility");
    expect(p.s1.purpose).toBe("defizit");
    const s2 = base(aerobKe, [blk("pilgrim")]);
    const p2 = slotsFor(s2, s2.plan[1]);
    expect(p2.s1.domain).toBe("ke"); // Pilgrim trainiert Ausdauer selbst
  });
  it("Nie gegen den Orden: Ausdauer stört Muskelaufbau und geht in die Blockfolge", () => {
    const s = base(aerobKe, [blk("slayer")]);
    const p = slotsFor(s, s.plan[1]);
    expect(p.s1.domain).not.toBe("aerob");
    expect(p.deferred.map((d) => d.id)).toContain("aerob");
  });
  it("Jahresgesamtschau: Folgephasen wechseln den Bereich, wenn kein Testdefizit drängt", () => {
    const b1: PlanBlock = { id: "p1", focusId: "smith", label: "", start: "2026-12-07", end: "2027-01-17", load: "medium", travel: false };
    const b2: PlanBlock = { id: "p2", focusId: "knight", label: "", start: "2027-01-18", end: "2027-02-28", load: "medium", travel: false };
    const s = base({}, [b1, b2]);
    const x = slotsFor(s, b1).s1, y = slotsFor(s, b2).s1;
    expect(x.domain).not.toBeNull();
    expect(y.domain).not.toBeNull();
    expect(y.domain).not.toBe(x.domain);
  });
  it("Aus und eigene Wahl", () => {
    const s = base(mobKe, [blk("slayer")]);
    expect(slotsFor(s, { ...s.plan[1], sharpen: "off" }).s1.source).toBe("off");
    expect(slotsFor(s, { ...s.plan[1], sharpen: "power" }).s1.domain).toBe("power");
  });
  it("Kurzorden und Harlequin haben keinen Slot", () => {
    for (const id of ["herald", "harlequin"]) expect(slotEligible(FOCUS_BY_ID[id]), id).toBe(false);
    for (const id of ["slayer", "assassin", "smith", "knight", "olympian", "conqueror"]) expect(slotEligible(FOCUS_BY_ID[id]), id).toBe(true);
  });
  it("Beweglichkeit jeden Tag am Ende, Schnelligkeit zweimal am Anfang, Slot unter dem Budget", () => {
    const s = base(mobKe, [blk("slayer")]);
    const f = FOCUS_BY_ID.slayer;
    const roles = rolesFor(s, s.plan[1], f);
    const withMob = applySlots(f, s, { ...s.plan[1], sharpen: "mobility" });
    expect(roles.every((rk) => withMob.roles[rk].blocks.at(-1)?.type === "module")).toBe(true);
    const withSpeed = applySlots(f, s, { ...s.plan[1], sharpen: "speed" });
    const first = roles.filter((rk) => { const b0 = withSpeed.roles[rk].blocks[0]; return b0.type === "module" && b0.module === "sharpen"; });
    expect(first.length).toBe(2);
    expect(SLOT_BUDGET).toBe(0.25);
    for (const dom of ["speed", "power", "mobility", "ke", "anaerob"]) {
      const x = applySlots(f, s, { ...s.plan[1], sharpen: dom });
      const week = (ff: typeof f) => roles.reduce((sum, rk) => sum + estimateRole(ff.roles[rk], g).total, 0);
      const extra = (week(x) - week(f)) / week(x);
      expect(extra, dom).toBeLessThan(SLOT_BUDGET + 0.01);
    }
  });
  it("Ein Slot je Rolle", () => {
    const s = base(mobKe, [blk("slayer")]);
    const f = FOCUS_BY_ID.slayer;
    const roles = rolesFor(s, s.plan[1], f);
    const x = applySlots(f, s, s.plan[1]);
    for (const rk of roles) expect(x.roles[rk].blocks.filter((b0) => b0.type === "module" && b0.module === "sharpen").length).toBeLessThanOrEqual(1);
  });
  it("Kraft-Ziel: Smith schlägt Herald bei 12 Wochen und mittlerer Alltagslast", () => {
    const plan: PlanBlock[] = [{ id: "p", focusId: "", label: "", start: "2027-04-05", end: "2027-06-27", load: "medium", travel: false }];
    expect(suggestSequence(plan, "2026-12-10", "kraft").items[0].focusId).toBe("smith");
  });
  it("Blockfolge „Defizite zuerst“ bevorzugt Orden für die schwachen Bereiche", () => {
    const plan: PlanBlock[] = [{ ...blk("slayer", "p1"), start: "2027-01-04", end: "2027-03-07" }];
    const allround = suggestSequence(plan, "2026-12-10", "allround");
    const def = suggestSequence(plan, "2026-12-10", "deficits", [{ axis: "ausdauer", w: 1 }]);
    const ae = (id: string) => FOCUS_BY_ID[id].goals.primary === "endurance" || FOCUS_BY_ID[id].goals.secondary.includes("endurance");
    expect(ae(def.items[0].focusId)).toBe(true);
    expect(def.items[0].focusId).toBeDefined();
    expect(allround.items.length).toBe(1);
  });
});

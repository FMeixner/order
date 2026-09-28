import { describe, expect, it } from "vitest";
import { FOCI, FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState } from "../types";
import type { EquipmentProfile, SessionEntry, Slot } from "../types";
import { parseWeightList, snapDown, stepLoad } from "./loads";
import { advance, suggest } from "./progression";
import { parseReps, resolveSlot } from "./resolve";
import { blockAt, dayRoleMap, defaultRoles, expandDrills, isTestWeek, pickBeast, weekInBlock } from "./plan";

const gym = EQUIPMENT_PRESETS[0].make();
const home = EQUIPMENT_PRESETS[1].make();
const reise = EQUIPMENT_PRESETS[2].make();

/** Anonymes Beispieljahr für die Tests */
function sample(): AppState {
  const s = emptyState();
  const g = { ...gym, id: "g" }, h = { ...home, id: "h" }, r = { ...reise, id: "r" };
  return {
    ...s,
    user: { ...s.user, asym: { hip: "L", neck: null, shoulder_ir: null, shoulder_er: null } },
    equipment: [g, h, r],
    schedule: { Mo: "g", Di: "g", Do: "h", Fr: "g" },
    plan: [
      { id: "b1", focusId: "assassin", label: "Herbst", start: "2026-09-22", end: "2026-11-30", load: "high", travel: false },
      { id: "b2", focusId: "soldier", label: "Ferien", start: "2027-02-24", end: "2027-03-31", load: "low", travel: false, schedule: { Mo: "g", Mi: "h", Fr: "g", Sa: "h" } },
    ],
  };
}

describe("Lasten", () => {
  it("liest Hantelstaffeln mit Bereichen und Dezimalkomma", () => {
    expect(parseWeightList("2; 4; 6-10/2; 12,5")).toEqual([2, 4, 6, 8, 10, 12.5]);
    expect(parseWeightList("4 8 12 16")).toEqual([4, 8, 12, 16]);
  });
  it("steigert Kurzhanteln auf die nächste vorhandene Hantel", () => {
    const p: EquipmentProfile = { ...home, dumbbells: [10, 12.5, 15, 20] };
    expect(stepLoad(p, "dumbbell", 15, 1)).toBe(20);
    expect(stepLoad(p, "dumbbell", 15, 2)).toBe(20);
    expect(stepLoad(p, "dumbbell", 12.5, 2)).toBe(20);
    expect(snapDown(p, "dumbbell", 14)).toBe(12.5);
  });
  it("Langhantel in Schritten von zwei kleinsten Scheiben", () => {
    expect(stepLoad(gym, "barbell", 60, 1)).toBe(62.5);
    expect(snapDown(gym, "barbell", 61.9)).toBe(60);
  });
  it("Kabel mit fester Schrittweite", () => {
    expect(stepLoad(gym, "cable", 30, 1)).toBe(32.5);
  });
});

describe("Übungsauswahl", () => {
  const slot: Slot = { id: "x", name: "Bench Press", home: "DB Bench Press", reise: { name: "Push-Up", reps: "AMRAP", prog: "reps" }, sets: 3, reps: "8-10", prog: "double" };
  it("wählt je Profil die passende Stufe", () => {
    expect(resolveSlot(slot, gym)!.name).toBe("Bench Press");
    expect(resolveSlot(slot, home)!.name).toBe("DB Bench Press");
    expect(resolveSlot(slot, reise)!.name).toBe("Push-Up");
    expect(resolveSlot(slot, reise)!.prog).toBe("reps");
  });
  it("fällt auf eine machbare Stufe zurück, wenn Equipment fehlt", () => {
    const labor: EquipmentProfile = { ...gym, barbell: null, dumbbells: [], kettlebells: [], has: { ...gym.has, bench: false } };
    expect(resolveSlot(slot, labor)!.name).toBe("Push-Up");
  });
  it("−1 Satz", () => {
    expect(resolveSlot(slot, gym, true)!.sets).toBe(2);
  });
  it("zerlegt Wiederholungsangaben", () => {
    expect(parseReps("8-10/Seite")).toMatchObject({ lo: 8, hi: 10, suffix: "/Seite" });
    expect(parseReps("AMRAP-2")).toMatchObject({ amrap: true, minus: 2 });
    expect(parseReps("12")).toMatchObject({ lo: 12, hi: 12 });
  });
});

describe("Progression", () => {
  const slot: Slot = { id: "s", name: "DB Bench Press", sets: 3, reps: "8-10", prog: "double" };
  const r = resolveSlot(slot, home)!;
  const entry = (reps: number[], w: number, fb?: SessionEntry["feedback"]): SessionEntry => ({
    key: r.key, slotId: "s", name: r.name, prog: "double", feedback: fb,
    sets: reps.map((x) => ({ done: true, reps: x, weight: w })),
  });
  it("oberes Ende in allen Sätzen: eine Stufe hoch, Wiederholungen unten", () => {
    const s = advance(r, undefined, entry([10, 10, 10], 16), home, "2026-10-01");
    expect(s.weight).toBe(18);
    expect(s.target).toBe(8);
  });
  it("sonst Wiederholungen hocharbeiten, Gewicht halten", () => {
    const s = advance(r, undefined, entry([9, 8, 8], 16, "ok"), home, "2026-10-01");
    expect(s.weight).toBe(16);
    expect(s.target).toBe(9);
    expect(suggest(r, s).targetReps).toBe(9);
  });
  it("zweimal schwer: −5 % auf die nächste vorhandene Hantel darunter", () => {
    const s1 = advance(r, undefined, entry([8, 7, 6], 20, "schwer"), home, "d1");
    const s2 = advance(r, s1, entry([8, 7, 6], 20, "schwer"), home, "d2");
    expect(s2.weight).toBe(18);
  });
  it("Leiter steigt nach zwei Einheiten am oberen Ende", () => {
    const ls: Slot = { id: "l", name: "Incline Push-Up", sets: 2, reps: "8-12", prog: "ladder", ladder: ["Incline Push-Up", "Knee Push-Up", "Push-Up"] };
    const lr = resolveSlot(ls, home)!;
    const e: SessionEntry = { key: lr.key, slotId: "l", name: lr.name, prog: "ladder", sets: [{ done: true, reps: 12 }, { done: true, reps: 12 }] };
    const a = advance(lr, undefined, e, home, "d1");
    expect(a.stage).toBe(0);
    const b = advance(lr, a, e, home, "d2");
    expect(b.stage).toBe(1);
    expect(suggest(lr, b).name).toBe("Knee Push-Up");
  });
});

describe("Orden und Plan", () => {
  it("lädt alle 18 Orden", () => {
    expect(FOCI.length).toBe(18);
  });
  it("jede Rolle ist mit jedem Standardprofil auflösbar", () => {
    for (const f of FOCI) for (const role of Object.values(f.roles)) for (const b of role.blocks) {
      const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : [];
      for (const s of slots) for (const p of [gym, home, reise]) expect(resolveSlot(s, p), `${f.id}/${s.id}`).not.toBeNull();
    }
  });
  it("Rollen für 3, 4 und 5 Tage", () => {
    const w = FOCUS_BY_ID.witcher;
    expect(defaultRoles(w, 3)).toEqual(w.week_3);
    expect(defaultRoles(w, 4)).toEqual(w.week_4);
    expect(defaultRoles(w, 5)).toContain("wochenende_kondition");
  });
  it("Beispieljahr: Block, Woche, Tage", () => {
    const s = { ...sample(), onboarded: true };
    const b = blockAt(s.plan, "2026-09-28")!;
    expect(b.focusId).toBe("assassin");
    expect(weekInBlock(b, "2026-09-28")).toBe(2);
    expect(dayRoleMap(s, b).map((x) => x.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
    expect(isTestWeek(FOCUS_BY_ID.assassin, b, 10)).toBe(true);
    const soldier = s.plan.find((x) => x.focusId === "soldier")!;
    expect(dayRoleMap(s, soldier).map((x) => x.day)).toEqual(["Mo", "Mi", "Fr", "Sa"]);
  });
  it("Asymmetrie verlängert die schwache Seite", () => {
    const s = sample();
    const d = expandDrills(["base"], s.user, 1).find((x) => x.id === "wu-9090")!;
    expect(d.groups[0]).toMatchObject({ label: "Links", value: 40 });
    expect(d.groups[1]).toMatchObject({ label: "Rechts", value: 25 });
  });
  it("Bestie passt zum Equipment", () => {
    const st = emptyState();
    const b = pickBeast({ type: "beast", id: "t", classes: ["bestie"], draw: "rotate" }, { blockId: "x", week: 1, profile: reise, state: st, reduced: false, downgrade: false });
    expect(b).not.toBeNull();
    expect(b!.equipment.every((t) => ["bodyweight_only", "wall_or_open", "band"].includes(t))).toBe(true);
  });
});

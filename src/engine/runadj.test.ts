import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Block, Focus, PlanBlock, RunEntry, Session, Slot } from "../types";
import { addDays, followedByTest, TEST_BLOCK } from "./plan";
import { setDeload } from "./deload";
import { easeTargets, hardRunNear, isHardRun, legShare, runEaseShape } from "./runadj";
import { focusFor } from "./weekplan";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
/** Ritter: 8 Wochen, week_4 = upper_a, lower_a, upper_b, lower_b */
const KNIGHT: PlanBlock = { id: "b1", focusId: "knight", label: "", start: "2026-10-19", end: "2026-12-13", load: "medium", travel: false };
/** Assasine: letzte Woche ist Testwoche */
const ASSASSIN: PlanBlock = { id: "b1", focusId: "assassin", label: "", start: "2026-10-19", end: "2026-12-13", load: "medium", travel: false };

function st(plan: PlanBlock | PlanBlock[] = KNIGHT, extra: Partial<AppState> = {}): AppState {
  return { ...emptyState(), onboarded: true, equipment: [gym], schedule: { Mo: "g", Mi: "g", Do: "g", Fr: "g" }, plan: Array.isArray(plan) ? plan : [plan], ...extra };
}

const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy] : []);
const byName = (f: Focus, role: string, name: string): Slot | undefined =>
  f.roles[role].blocks.flatMap(slotsOf).find((s) => s.name === name);

/** Erster Beintag der Woche 1 (Mi = 2026-10-21, lower_a), zweiter Fr = 2026-10-23 (lower_b) */
const LEG_DAY = "2026-10-21";

describe("Cardio erfassen", () => {
  it("hart gewertet: Pace „hart“ oder ab 60 Minuten", () => {
    expect(isHardRun({ date: "2026-10-20", minutes: 30, pace: "hart" })).toBe(true);
    expect(isHardRun({ date: "2026-10-20", minutes: 70, pace: "locker" })).toBe(true);
    expect(isHardRun({ date: "2026-10-20", minutes: 45, pace: "zügig" })).toBe(false);
    expect(hardRunNear([{ date: "2026-10-20", minutes: 70, pace: "locker" }], "2026-10-21")!.minutes).toBe(70);
    expect(hardRunNear([{ date: "2026-10-20", minutes: 70, pace: "locker" }], "2026-10-22")).toBeNull();
    expect(hardRunNear([{ date: "2026-10-21", minutes: 45, pace: "zügig" }], "2026-10-21")).toBeNull();
  });

  it("Beintag-Erkennung: Anteil der Beinarbeit an den Sätzen", () => {
    const s = st();
    const f = focusFor(s, KNIGHT, 1)!;
    expect(legShare(f.roles.lower_a)).toBeGreaterThanOrEqual(0.5);
    expect(legShare(f.roles.upper_a)).toBeLessThan(0.5);
  });

  it("Vorschau: erfasster Lauf senkt die Sätze des offenen Beintags (Waden und Beinbeuger −1, Oberschenkel ab vier, Gesäß bleibt), Bestie als Plage", () => {
    const s0 = st();
    const f0 = focusFor(s0, KNIGHT, 1)!;
    const s = st(KNIGHT, { runs: [{ date: addDays(LEG_DAY, -1), minutes: 70, pace: "locker" }] });
    const f = focusFor(s, KNIGHT, 1)!;
    // Mi (lower_a) ist der Beintag; Mo (upper_a) bleibt unberührt
    expect(f.roles.upper_a).toEqual(f0.roles.upper_a);
    expect(byName(f, "lower_a", "Back Squat")!.sets).toBe(3); // Oberschenkel, vorher 4
    expect(byName(f, "lower_a", "Romanian Deadlift")!.sets).toBe(3); // Beinbeuger, vorher 4
    expect(byName(f, "lower_a", "Seated Leg Curl")!.sets).toBe(2); // Beinbeuger, vorher 3
    expect(byName(f, "lower_a", "Standing Calf Raise")!.sets).toBe(2); // Waden, vorher 3
    expect(byName(f, "lower_a", "Cable Crunch")!.sets).toBe(3); // Rumpf bleibt
    expect(byName(f, "lower_a", "Back Squat")!.why?.length).toBeGreaterThan(0);
    // Bestie des Tages: nur noch Plage
    const beast = f.roles.lower_a.blocks.find((b) => b.type === "beast");
    expect(beast && beast.type === "beast" && beast.classes).toEqual(["plage"]);
  });

  it("Tage danach bleiben unberührt; Gesäß bleibt unangetastet", () => {
    // Fr (lower_b) liegt zwei Tage nach dem Lauf: keine Entlastung
    const s = st(KNIGHT, { runs: [{ date: addDays(LEG_DAY, -1), minutes: 70, pace: "locker" }] });
    const f = focusFor(s, KNIGHT, 1)!;
    expect(byName(f, "lower_b", "Leg Press")!.sets).toBe(4);
    expect(byName(f, "lower_b", "Seated Calf Raise")!.sets).toBe(3);
    // Lauf am Freitag selbst: Leg Extension (3 Sätze, Oberschenkel) bleibt, Hip Thrust (Gesäß) bleibt
    const sFri = st(KNIGHT, { runs: [{ date: "2026-10-23", minutes: 40, pace: "hart" }] });
    const fFri = focusFor(sFri, KNIGHT, 1)!;
    expect(byName(fFri, "lower_b", "Leg Extension")!.sets).toBe(3);
    expect(byName(fFri, "lower_b", "Hip Thrust")!.sets).toBe(4);
    expect(byName(fFri, "lower_b", "Lying Leg Curl")!.sets).toBe(2);
  });

  it("Ohne Bestie am Tag: Mobility-Flow als Ausgleich, Finisher wird Plage", () => {
    const s = st(KNIGHT, { runs: [{ date: addDays(LEG_DAY, -1), minutes: 70, pace: "locker" }] });
    const f0 = focusFor(s, KNIGHT, 1)!;
    // lower_a ohne Bestie: Mobility-Flow hängt an
    const noBeast: Focus = { ...f0, roles: { ...f0.roles, lower_a: { ...f0.roles.lower_a, blocks: f0.roles.lower_a.blocks.filter((b) => b.type !== "beast") } } };
    const eased = runEaseShape(s, KNIGHT, 1, noBeast);
    const last = eased.roles.lower_a.blocks[eased.roles.lower_a.blocks.length - 1];
    expect(last.type === "module" && last.module === "flow" && last.variant === "mobility").toBe(true);
    // Superset mit Finisher: Finisher wird Plage
    const withFin: Focus = { ...f0, roles: { ...f0.roles, lower_a: { ...f0.roles.lower_a, blocks: [{ type: "superset", rest: 60, slots: [{ id: "c1", name: "Standing Calf Raise", sets: 3 }], finisher: { pool: ["wampetre"] } }] } } };
    const fin = runEaseShape(s, KNIGHT, 1, withFin);
    const ss = fin.roles.lower_a.blocks[0];
    expect(ss.type === "superset" && ss.finisher?.classes).toEqual(["plage"]);
  });

  it("Nicht auf erledigte Einheiten, nicht bei Leicht, nicht in Testwochen, Entlastungswochen und Wochen vor der Testwoche", () => {
    const doneLeg: Session = { id: "b1:1:lower_a", date: LEG_DAY, blockId: "b1", focusId: "knight", week: 1, role: "lower_a", profileId: "g", entries: {}, drills: {}, menu: {}, done: true };
    const run: RunEntry = { date: addDays(LEG_DAY, -1), minutes: 70, pace: "locker" };
    const sDone = st(KNIGHT, { runs: [run], sessions: [doneLeg] });
    expect(easeTargets(sDone, KNIGHT, 1, focusFor(sDone, KNIGHT, 1)!)).toHaveLength(0);
    // Leicht am Beintag: die Woche läuft ohnehin mit −1 Satz
    const sLight = st(KNIGHT, { runs: [run], reduced: { "b1:1": true } });
    expect(easeTargets(sLight, KNIGHT, 1, focusFor(sLight, KNIGHT, 1)!)).toHaveLength(0);
    // Testwoche des Assasinen (Woche 8, Beintag Mo 30.11.) und die Woche davor: keine Entlastung
    const sA = st(ASSASSIN, { runs: [{ date: "2026-11-29", minutes: 70, pace: "locker" }, { date: "2026-11-22", minutes: 70, pace: "locker" }] });
    expect(easeTargets(sA, ASSASSIN, 8, focusFor(sA, ASSASSIN, 8)!)).toHaveLength(0);
    expect(easeTargets(sA, ASSASSIN, 7, focusFor(sA, ASSASSIN, 7)!)).toHaveLength(0);
    // Eigene Testwoche nach dem Block: die letzte Blockwoche läuft ohnehin mit −1 Satz
    const TEST: PlanBlock = { id: "t1", focusId: TEST_BLOCK, label: "", start: addDays(KNIGHT.end, 1), end: addDays(KNIGHT.end, 1), load: "medium", travel: false };
    const sExt = st([KNIGHT, TEST], { runs: [{ date: "2026-12-08", minutes: 70, pace: "locker" }] });
    expect(followedByTest(sExt.plan, KNIGHT)).toBe(true);
    expect(easeTargets(sExt, KNIGHT, 8, focusFor(sExt, KNIGHT, 8)!)).toHaveLength(0);
    // Entlastungswoche: halbe Sätze, keine Bestien — der Lauf ändert daran nichts
    const sEased = setDeload(st(KNIGHT, { runs: [run] }), KNIGHT, 1, "ja");
    const fEased = focusFor(sEased, KNIGHT, 1)!;
    expect(fEased.roles.lower_a.blocks.some((b) => b.type === "beast")).toBe(false);
    expect(byName(fEased, "lower_a", "Back Squat")!.sets).toBe(2);
  });
});

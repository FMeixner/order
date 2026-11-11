import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Block, PlanBlock, Session, Slot } from "../types";
import { addDays, blockFocus, blockWeeks, dayRoleMap, doseAt } from "./plan";
import { wavePos } from "./dose";
import { deloadAdvice, deloadShape, isDeloaded, setDeload } from "./deload";
import { focusFor } from "./weekplan";
import { chapterOf } from "./saga";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
/** Ritter: 8–12 Wochen, Bestien, keine feste Testwoche */
const KNIGHT: PlanBlock = { id: "b1", focusId: "knight", label: "", start: "2026-10-19", end: "2026-12-13", load: "medium", travel: false };
/** Assasine: letzte Woche ist Testwoche */
const ASSASSIN: PlanBlock = { id: "b1", focusId: "assassin", label: "", start: "2026-10-19", end: "2026-12-13", load: "medium", travel: false };

function st(plan: PlanBlock = KNIGHT, extra: Partial<AppState> = {}): AppState {
  const s = emptyState();
  return { ...s, onboarded: true, equipment: [gym], schedule: { Mo: "g", Mi: "g", Do: "g", Fr: "g" }, plan: [plan], narrative: { on: true, pronoun: "sie" }, ...extra };
}

const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy] : []);
const beastsOf = (s: AppState, week: number) => Object.values(focusFor(s, s.plan[0], week)!.roles).flatMap((r) => r.blocks.filter((b) => b.type === "beast"));
const setsOf = (s: AppState, week: number) => Object.values(focusFor(s, s.plan[0], week)!.roles).flatMap((r) => r.blocks).flatMap(slotsOf).map((x) => x.sets ?? 3);

describe("Entlastungswoche", () => {
  it("Form: halbe Sätze (mindestens zwei), keine Bestien, kein Finisher, Module bleiben", () => {
    const f = blockFocus(KNIGHT)!;
    const shaped = deloadShape(f);
    expect(Object.values(shaped.roles).some((r) => r.blocks.some((b) => b.type === "beast"))).toBe(false);
    expect(Object.values(shaped.roles).some((r) => r.blocks.some((b) => b.type === "superset" && b.finisher))).toBe(false);
    // Modul-Blöcke (Schwert, Flow) bleiben
    const modsOf = (x: typeof f) => Object.values(x.roles).flatMap((r) => r.blocks).filter((b) => b.type === "module").length;
    expect(modsOf(shaped)).toBe(modsOf(f));
    const af = blockFocus(ASSASSIN)!; // Assasine: Schwert-Modul und Bestien
    expect(modsOf(deloadShape(af))).toBe(modsOf(af));
    expect(modsOf(af)).toBeGreaterThan(0);
    // Jeder Satzstand halbiert, mindestens zwei; das Original bleibt unberührt
    const beastsBefore = Object.values(f.roles).flatMap((r) => r.blocks).filter((b) => b.type === "beast").length;
    for (const [k, r] of Object.entries(f.roles)) {
      const a = r.blocks.flatMap(slotsOf).map((x) => x.sets ?? 0).filter(Boolean);
      const b = shaped.roles[k].blocks.flatMap(slotsOf).map((x) => x.sets ?? 0).filter(Boolean);
      expect(a.length).toBe(b.length);
      for (const [i, n] of a.entries()) expect(b[i]).toBe(Math.max(2, Math.ceil(n / 2)));
    }
    expect(Object.values(f.roles).flatMap((r) => r.blocks).filter((x) => x.type === "beast")).toHaveLength(beastsBefore);
    expect(beastsBefore).toBeGreaterThan(0);
  });

  it("Wochenplan: Entlastung halbiert die Sätze, Widerruf stellt alles wieder her", () => {
    const s0 = st();
    expect(beastsOf(s0, 2).length).toBeGreaterThan(0);
    const ja = setDeload(s0, s0.plan[0], 2, "ja");
    expect(isDeloaded(ja, ja.plan[0], 2)).toBe(true);
    expect(beastsOf(ja, 2)).toHaveLength(0);
    expect(setsOf(ja, 2).every((n) => n >= 2)).toBe(true);
    const sum = (s: AppState) => setsOf(s, 2).reduce((a, b) => a + b, 0);
    expect(sum(ja)).toBeLessThan(sum(s0));
    const nein = setDeload(ja, ja.plan[0], 2, "nein");
    expect(isDeloaded(nein, nein.plan[0], 2)).toBe(false);
    expect(setsOf(nein, 2)).toEqual(setsOf(s0, 2));
    expect(beastsOf(nein, 2)).toHaveLength(beastsOf(s0, 2).length);
  });

  it("Rhythmus: ab Woche 5 alle vier Wochen, nur in Phasen ab 8 Wochen", () => {
    expect(blockWeeks(KNIGHT)).toBe(8);
    const s = st();
    expect(deloadAdvice(s, KNIGHT, 5, "2026-11-16")).toEqual({ why: "rhythmus", count: 0, signals: [], quiet: true });
    expect(deloadAdvice(s, KNIGHT, 4, "2026-11-16")).toBeNull();
    expect(deloadAdvice(s, KNIGHT, 6, "2026-11-16")).toBeNull();
    const kurz = { ...KNIGHT, end: "2026-11-30" }; // 6 Wochen
    expect(blockWeeks(kurz)).toBe(6);
    expect(deloadAdvice(s, kurz, 5, "2026-11-16")).toBeNull();
  });

  it("Nie in oder direkt vor einer Testwoche, nie dicht nach der letzten Entlastung", () => {
    const s = st(ASSASSIN);
    expect(deloadAdvice(s, ASSASSIN, 8, "2026-12-07")).toBeNull(); // Testwoche selbst
    expect(deloadAdvice(s, ASSASSIN, 7, "2026-11-30")).toBeNull(); // Woche davor
    const davor = setDeload(s, ASSASSIN, 2, "ja");
    expect(deloadAdvice(davor, ASSASSIN, 5, "2026-11-16")).toBeNull(); // drei Wochen Abstand nicht genug
    const weit = setDeload(s, ASSASSIN, 1, "ja");
    expect(deloadAdvice(weit, ASSASSIN, 5, "2026-11-16")).toMatchObject({ why: "rhythmus", quiet: true });
  });

  it("Signale: dreimal „zu schwer“ in zwei Wochen, sonst nicht", () => {
    const s = st();
    const fb = (date: string, n: number): Session[] =>
      Array.from({ length: n }, (_, i) => ({ id: `s${date}-${i}`, date, blockId: "b1", focusId: "knight", week: 3, role: "mo", profileId: "g", entries: { [`e${i}`]: { key: `k${i}`, slotId: `sl${i}`, name: "Übung", prog: "none", sets: [], feedback: "zuschwer" } }, drills: {}, done: true }));
    const heute = "2026-11-09"; // Woche 4 läuft, Rhythmus greift nicht
    // Ein Signal allein reicht außerhalb des Rhythmus nicht mehr (1.30), zwei schon
    const sOne = { ...s, sessions: [...fb(addDays(heute, -7), 3)] };
    expect(deloadAdvice(sOne, KNIGHT, 4, heute)).toBeNull();
    const zaeh = [-3, -2, -2].map((value, i) => ({ date: addDays(heute, -i - 1), sessionId: `f${i}`, value }));
    const sTooHard = { ...sOne, feeling: zaeh };
    expect(deloadAdvice(sTooHard, KNIGHT, 4, heute)).toEqual({ why: "signale", count: 3, signals: ["dreimal zu schwer", "Befinden zäh"], quiet: false });
    const sAlt = { ...s, sessions: [...fb(addDays(heute, -40), 3)] };
    expect(deloadAdvice(sAlt, KNIGHT, 4, heute)).toBeNull();
    const sWenig = { ...s, sessions: [...fb(addDays(heute, -7), 2)] };
    expect(deloadAdvice(sWenig, KNIGHT, 4, heute)).toBeNull();
    // Abgelehnt für diese Woche: nicht erneut fragen
    const abgelehnt = setDeload(sTooHard, KNIGHT, 4, "nein");
    expect(deloadAdvice(abgelehnt, KNIGHT, 4, heute)).toBeNull();
  });

  it("Rhythmus-Woche: ohne Signal leise, mit einem Signal Empfehlung mit Begründung", () => {
    const s = st();
    const heute = "2026-11-18"; // Woche 5
    expect(deloadAdvice(s, KNIGHT, 5, heute)).toMatchObject({ quiet: true, signals: [] });
    const hoch = { ...s, sections: [{ id: "x", name: "Prüfungen", start: "2026-11-16", end: "2026-11-22", load: "high" as const }] };
    expect(deloadAdvice(hoch, KNIGHT, 5, heute)).toMatchObject({ why: "rhythmus", quiet: false, signals: ["hohe Last diese Woche"] });
  });

  it("Signale: Befinden nur ab drei Werten, zwei Kernübungen mit Rückgang", () => {
    const s = st();
    const heute = "2026-11-09";
    const zwei = [-4, -4].map((value, i) => ({ date: addDays(heute, -i - 1), sessionId: `f${i}`, value }));
    const hoch = { ...s, feeling: zwei, sections: [{ id: "x", name: "Prüfungen", start: "2026-11-09", end: "2026-11-15", load: "high" as const }] };
    expect(deloadAdvice(hoch, KNIGHT, 4, heute)).toBeNull();
    const core = Object.values(blockFocus(KNIGHT)!.roles).flatMap((r) => r.blocks).flatMap(slotsOf).filter((x) => x.core).slice(0, 2);
    const run = (date: string, kg: number): Session => ({ id: `c${date}`, date, blockId: "b1", focusId: "knight", week: 3, role: "x", profileId: "g", done: true, drills: {},
      entries: Object.fromEntries(core.map((c) => [c.id, { key: c.id, slotId: c.id, name: c.name, prog: "double" as const, sets: [{ done: true, weight: kg, reps: 8 }] }])) });
    const down = { ...hoch, sessions: [run("2026-11-02", 60), run("2026-11-06", 55)] };
    expect(deloadAdvice(down, KNIGHT, 4, heute)).toMatchObject({ why: "signale", signals: ["2 Kernübungen geben nach", "hohe Last diese Woche"] });
  });

  it("Übersprungene Entlastung: die Welle wendet trotzdem (Stufe + 1, Start der nächsten Welle)", () => {
    const s = setDeload(st(), KNIGHT, 5, "nein");
    expect(wavePos(s.plan, KNIGHT, 6)).toMatchObject({ stage: 2, pos: 0 });
    const d = doseAt(s, s.plan[0], 6)!;
    expect(d).toMatchObject({ stage: 2, pos: 0, deload: false });
    expect(doseAt(s, s.plan[0], 5)!.deload).toBe(true);
  });

  it("Aschekurier druckt die Entlastungswoche in die Ausgabe", () => {
    const s0 = st();
    const f = focusFor(s0, KNIGHT, 1)!;
    const days = dayRoleMap(s0, KNIGHT, f, 1);
    const sessions: Session[] = days.map((d, i) => ({ id: `w1-${d.role}`, date: addDays(KNIGHT.start, i * 2), blockId: KNIGHT.id, focusId: KNIGHT.focusId, week: 1, role: d.role, profileId: "g", entries: {}, drills: {}, done: true }));
    const heute = addDays(KNIGHT.start, 8); // zweite Woche: Woche 1 ist abgeschlossen
    const c0 = chapterOf({ ...s0, sessions }, KNIGHT, heute);
    expect(c0.weeks[0].lines.some((l) => /ENTLASTUNGSWOCHE|HALBTAKT|KLEINE ANKÜNDIGUNG|VERMERK DER REDAKTION/.test(l.text))).toBe(false);
    const eased = setDeload(s0, KNIGHT, 1, "ja");
    const c1 = chapterOf({ ...eased, sessions }, KNIGHT, heute);
    expect(c1.weeks[0].lines.some((l) => /ENTLASTUNGSWOCHE|HALBTAKT|KLEINE ANKÜNDIGUNG|VERMERK DER REDAKTION/.test(l.text))).toBe(true);
  });
});

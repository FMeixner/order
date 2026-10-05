import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, PlanBlock, Session } from "../types";
import { addDays, blockWeeks, dayRoleMap } from "./plan";
import { chapterOf, checkPack, deck, fill, GENERIC_PACK, tournamentOf } from "./saga";

const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
const A: PlanBlock = { id: "b1", focusId: "witcher", label: "", start: "2026-09-28", end: "2026-11-01", load: "medium", travel: false };
const B: PlanBlock = { id: "b2", focusId: "assassin", label: "", start: "2026-11-02", end: "2026-12-06", load: "medium", travel: false };
const T: PlanBlock = { id: "t1", focusId: "test", label: "", start: "2026-12-07", end: "2026-12-13", load: "low", travel: false };

function base(): AppState {
  const s = emptyState();
  return { ...s, onboarded: true, equipment: [g], schedule: { Mo: "g", Mi: "g", Fr: "g" }, plan: [A, B, T], narrative: { on: true, pronoun: "sie" } };
}
/** Trainiert jede Woche einen Anteil der geplanten Einheiten */
function train(s: AppState, b: PlanBlock, share: number): AppState {
  const sessions: Session[] = [...s.sessions];
  for (let w = 1; w <= blockWeeks(b); w++) {
    const days = dayRoleMap(s, b);
    const n = Math.round(days.length * share);
    days.slice(0, n).forEach((d, i) => sessions.push({ id: `${b.id}-${w}-${d.role}`, date: addDays(b.start, (w - 1) * 7 + i * 2), blockId: b.id, focusId: b.focusId, week: w, role: d.role, profileId: "g", entries: {}, drills: {}, menu: {}, done: true }));
  }
  return { ...s, sessions };
}

describe("Erzähler", () => {
  it("füllt alle Texte ohne offene Platzhalter, für sie und er, mit und ohne Namen", () => {
    const allTexts = [
      ...Object.values(GENERIC_PACK.tables).flat(),
      ...Object.values(GENERIC_PACK.scenes).flatMap((s) => [...s.setting, ...s.epithets]),
    ];
    for (const pro of ["sie", "er"] as const) for (const name of ["", "Mara"]) {
      const f = pro === "sie";
      const v = { held: name || (f ? "die Heldin" : "der Held"), sie: f ? "sie" : "er", ihn: f ? "sie" : "ihn", ihm: f ? "ihr" : "ihm", ihr: f ? "ihr" : "sein", die: f ? "die" : "der", in: f ? "in" : "", feind: "der Feind", feind_dat: "dem Feind", feind_akk: "den Feind", feind_gen: "des Feindes", desc: "Böse.", weak: "Bestzeiten.", fp: "er", ort: "hier", schar: "Ratten", bestie: "Undine", bestie_zwei: "Kobold", n: 2, stellen: "zwei Stellen", mal: "2-mal", von: 3, beiname: "Die Eiserne", vorsieg: "dem Sieg über", vorfeind_akk: "den Alten", vorfeind_dat: "dem Alten", klinge: "Balmung" };
      for (const t of allTexts) expect(fill(t, v), t).not.toMatch(/[{}]/);
    }
  });
  it("Beinamen und Pronomen passen zum Geschlecht", () => {
    expect(fill("{Die} Dachläufer{in}", { die: "die", in: "in" })).toBe("Die Dachläuferin");
    expect(fill("{Die} Dachläufer{in}", { die: "der", in: "" })).toBe("Der Dachläufer");
    expect(fill("{Held} ging. {ihr}e Klinge", { held: "die Heldin", ihr: "ihr" })).toBe("Die Heldin ging. ihre Klinge");
  });
  it("Stapel wiederholt sich erst, wenn er durch ist", () => {
    const arr = ["a", "b", "c", "d"];
    const drawn = [0, 1, 2, 3].map((i) => deck(arr, "x", i));
    expect(new Set(drawn).size).toBe(4);
    expect(deck(arr, "x", 4)).toBe(drawn[0]);
  });
  it("ist deterministisch und der Widersacher fällt nicht vor dem Finale", () => {
    const s = train(base(), A, 1);
    const c1 = chapterOf(s, A, "2026-11-10"), c2 = chapterOf(s, A, "2026-11-10");
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
    expect(c1.ended).toBe(true);
    expect(["triumph", "win"]).toContain(c1.outcome);
    const hps = c1.weeks.map((w) => w.lines.find((l) => l.kind === "hp")!.value!);
    expect(hps.slice(0, -1).every((v) => v >= 1)).toBe(true);
    expect(hps[hps.length - 1]).toBe(0);
    expect(c1.saga.length).toBeGreaterThan(3);
  });
  it("wenig Training: kein Sieg, aber freundlich und ohne Strafe", () => {
    const s = train(base(), A, 0.34);
    const c = chapterOf(s, A, "2026-11-10");
    expect(c.outcome).toBe("close");
    expect(c.saga.some((l) => /entkommen|KEIN KLARER SIEG/.test(l.text))).toBe(true);
  });
  it("laufender Orden: nur abgeschlossene Wochen, Prolog mit Rückbezug auf den Orden davor", () => {
    let s = train(base(), A, 1);
    s = train(s, B, 1);
    const c = chapterOf(s, B, "2026-11-18");
    expect(c.weeks.length).toBe(3); // Woche 3 läuft, ist aber schon voll
    expect(c.ended).toBe(false);
    const prevFoe = chapterOf(s, A, "2026-11-18").foe;
    expect(c.prologue.map((l) => l.text).join(" ")).toMatch(new RegExp(prevFoe.dat.split(" ").slice(1).join(" ")));
  });
  it("Turnier bezieht sich auf den letzten Orden und bewertet Cups nach Messfehler", () => {
    let s = train(base(), B, 1);
    s = { ...s, tests: { "t-pushups": [{ date: "2026-06-01", blockId: "old", value: 30, raw: "30" }, { date: "2026-12-08", blockId: "t1", value: 31, raw: "31" }] } };
    const t = tournamentOf(s, T, "2026-12-08");
    expect(t.intro).toMatch(/Klingen/);
    const withText = t.cups.filter((c) => c.text);
    expect(withText.length).toBe(1);
    expect(["same", "better"]).toContain(withText[0].result);
  });
  it("prüft eigene Welten", () => {
    expect(checkPack({ name: "Test" })).toEqual([]);
    expect(checkPack({ name: "X", orders: { assassin: "nirgends" } }).length).toBe(1);
    expect(checkPack("kaputt").length).toBe(1);
  });
});

describe("Lebenspunkte pro Einheit", () => {
  it("startet bei 100 % und sinkt mit jeder erledigten Einheit, nicht erst am Wochenende", async () => {
    const { chapterOf } = await import("./saga");
    const { emptyState, EQUIPMENT_PRESETS } = await import("../store");
    const s0 = emptyState();
    const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const b = { id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium" as const, travel: false };
    const s = { ...s0, onboarded: true, equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as typeof s0.schedule, plan: [b], narrative: { on: true } };
    const c0 = chapterOf(s, b, "2026-09-29");
    expect(c0.liveHp).toBe(c0.hp);
    const done = (role: string, date: string) => ({ id: `b1:1:${role}`, date, blockId: "b1", focusId: "assassin", week: 1, role, profileId: "g", entries: {}, drills: {}, menu: {}, done: true });
    const c1 = chapterOf({ ...s, sessions: [done("kraft_a", "2026-09-28")] }, b, "2026-09-29");
    expect(c1.liveHp).toBeLessThan(c0.hp);
    const c2 = chapterOf({ ...s, sessions: [done("kraft_a", "2026-09-28"), done("arme_schultern", "2026-09-29")] }, b, "2026-09-30");
    expect(c2.liveHp).toBeLessThan(c1.liveHp);
  });
});

describe("Bestien im Blatt", () => {
  it("besiegte Undine erscheint in der Wochenausgabe, mutiert oder entfesselt, plus Lagebericht", async () => {
    const { chapterOf } = await import("./saga");
    const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const s0 = emptyState();
    const b = { id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium" as const, travel: false };
    const base = { ...s0, onboarded: true, equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as typeof s0.schedule, plan: [b], narrative: { on: true } };
    const roles = ["kraft_a", "arme_schultern", "skill_kondition", "kraft_b"];
    for (const [id, word] of [["ng-nanna~hex", /mutiert/i], ["ng-nanna", /entfesselt/i]] as const) {
      const sessions = roles.map((role, i) => ({ id: `b1:1:${role}`, date: `2026-09-${28 + i}`, blockId: "b1", focusId: "assassin", week: 1, role, profileId: "g", entries: {}, drills: {}, menu: {}, done: true, ...(role === "skill_kondition" ? { beast: { id, seconds: 900 } } : {}) }));
      const ch = chapterOf({ ...base, sessions }, b, "2026-10-05");
      const text = ch.weeks[0].lines.map((l) => l.text).join(" ");
      expect(text).toMatch(/Undine/);
      expect(text).toMatch(word);
      expect(ch.weeks[0].lines.length).toBeGreaterThanOrEqual(6);
    }
  });
  it("freie Jagd steht im Blatt, zählt aber nicht als Einheit", async () => {
    const { chapterOf } = await import("./saga");
    const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    const s0 = emptyState();
    const b = { id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium" as const, travel: false };
    const base = { ...s0, onboarded: true, equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as typeof s0.schedule, plan: [b], narrative: { on: true } };
    const roles = ["kraft_a", "arme_schultern", "kraft_b"];
    const sessions = roles.map((role, i) => ({ id: `b1:1:${role}`, date: `2026-09-${28 + i}`, blockId: "b1", focusId: "assassin", week: 1, role, profileId: "g", entries: {}, drills: {}, menu: {}, done: true }));
    const hunt = { id: "jagd:1", date: "2026-10-02", blockId: "jagd", focusId: "", week: 0, role: "jagd", profileId: "g", entries: {}, drills: {}, menu: {}, done: true, beastRuns: { jagd: { beast: { id: "ng-nanna", seconds: 900 } } } };
    const without = chapterOf({ ...base, sessions }, b, "2026-10-05");
    const withHunt = chapterOf({ ...base, sessions: [...sessions, hunt] }, b, "2026-10-05");
    expect(without.weeks[0].lines.map((l) => l.text).join(" ")).not.toMatch(/Undine/);
    expect(withHunt.weeks[0].lines.map((l) => l.text).join(" ")).toMatch(/Undine/);
    expect(withHunt.stats.done).toBe(without.stats.done);
  });
});

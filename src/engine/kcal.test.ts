import { describe, expect, it } from "vitest";
import { FOCI, FOCUS_BY_ID } from "../data";
import type { Kcal, PlanBlock } from "../types";
import { burnOf, HIGH_BURN, carriesAccent, kcalCheck, KCAL_LABEL, primaryAxis, recKcalOf } from "./kcal";
import { fillMeso } from "./sequence";
import { newMeso } from "./stack";

const F = (id: string) => FOCUS_BY_ID[id];
const blk = (id: string, focusId: string, start: string, end: string, extra: Partial<PlanBlock> = {}): PlanBlock => ({ id, focusId, label: "", start, end, load: "medium", travel: false, ...extra });

describe("Burn-Schätzung nach Übungen", () => {
  it("Bestien- und Cardioblocke verbrennen mehr als reine Kraftorden; Ausdauer liegt oben", () => {
    const pilgrim = burnOf(F("pilgrim"));
    const smith = burnOf(F("smith"));
    expect(pilgrim).toBeGreaterThanOrEqual(HIGH_BURN);
    expect(smith).toBeLessThan(HIGH_BURN);
    expect(burnOf(F("assassin"))).toBeGreaterThan(burnOf(F("slayer")));
  });
  it("Hohe Alltagslast senkt den Burn: die Hälfte der Kraftübungen läuft geführt", () => {
    for (const f of FOCI) expect(burnOf(f, "high")).toBeLessThan(burnOf(f, "medium") + 1e-9);
    expect(burnOf(F("smith"), "high")).toBeCloseTo(burnOf(F("smith"), "medium") * 0.8, 5);
  });
});

describe("Akzent-Modus: Domäne konstant, Orden rotieren", () => {
  it("Muskelaufbau tragen Slayer und Knight, Kraft Smith und Troubadour", () => {
    expect(carriesAccent(F("slayer"), "muskel")).toBe(true);
    expect(carriesAccent(F("knight"), "muskel")).toBe(true);
    expect(carriesAccent(F("smith"), "kraft")).toBe(true);
    expect(carriesAccent(F("troubadour"), "kraft")).toBe(true);
    // Herald ist zeitoptimiert (25 Minuten): Für einen Masse- oder Kraft-Akzent nicht indiziert — zu wenig Volumen
    expect(carriesAccent(F("herald"), "kraft")).toBe(false);
    expect(carriesAccent(F("herald"), "muskel")).toBe(false);
    // Sekundärziele tragen keinen Akzent
    expect(carriesAccent(F("olympian"), "muskel")).toBe(false);
  });
  it("Hauptziel-Achse: Slayer → muskel, Olympian → schnellkraft, Harlequin ohne Achse", () => {
    expect(primaryAxis(F("slayer"))).toBe("muskel");
    expect(primaryAxis(F("olympian"))).toBe("schnellkraft");
  });
  it("fillMeso mit Akzent Muskelaufbau: jeder Teil trägt hypertrophy als Hauptziel", () => {
    let n = 0;
    const parts = newMeso([], "2026-11-04", () => `b${n++}`, [6, 6], undefined, "muskel");
    const filled = fillMeso(parts, "allround");
    const ids = filled.filter((x) => x.meso).map((x) => x.focusId);
    expect(ids.length).toBe(2);
    expect(ids.every((id) => FOCUS_BY_ID[id].goals.primary === "hypertrophy")).toBe(true);
    // Domäne konstant, Orden im Wechsel: nicht zweimal derselbe
    expect(new Set(ids).size).toBe(2);
  });
  it("fillMeso mit Akzent Kraft: Smith und Troubadour, Herald bleibt draußen", () => {
    let n = 0;
    const filled = fillMeso(newMeso([], "2026-11-04", () => `b${n++}`, [6, 6], undefined, "kraft"), "allround");
    const ids = filled.filter((x) => x.meso).map((x) => x.focusId);
    expect(ids.every((id) => ["smith", "troubadour"].includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("Kalorien-Verträglichkeit und Empfehlung", () => {
  const phase = (kcal: Kcal | undefined, extra: Partial<PlanBlock> = {}) => blk("p", "slayer", "2027-01-04", "2027-02-14", { kcal, ...extra });
  it("Defizit auf einem Orden für Überschuss warnt; auf dem Abnehm-Orden nicht", () => {
    expect(kcalCheck(phase("deficit"), F("slayer")).length).toBeGreaterThan(0);
    expect(kcalCheck(phase("deficit"), F("assassin"))).toEqual([]);
    expect(kcalCheck(phase(undefined), F("slayer"))).toEqual([]);
  });
  it("Defizit mit hohem Burn und hoher Alltagslast warnt (Erhaltungs-Orden, nicht Abnehm-Orden)", () => {
    const warns = kcalCheck(blk("p", "conqueror", "2027-01-04", "2027-02-14", { kcal: "deficit", load: "high" }), F("conqueror"));
    expect(warns.some((w) => /verbrennt viel|anstrengender Orden/.test(w))).toBe(true);
  });
  it("Defizit auf einem Aufbau-Akzent warnt", () => {
    const warns = kcalCheck(blk("p", "smith", "2027-01-04", "2027-02-14", { kcal: "deficit", accent: "kraft" }), F("smith"));
    expect(warns.some((w) => w.includes("Akzent"))).toBe(true);
  });
  it("Überschuss auf dem Abnehm-Orden weist nur hin", () => {
    expect(kcalCheck(phase("surplus"), F("assassin")).length).toBeGreaterThan(0);
  });
  it("Empfehlung: Defizit bei niedriger Last, Erhaltung bei hoher, Überschuss für Aufbau, sonst keiner", () => {
    expect(recKcalOf(blk("l", "pugilist", "2027-07-05", "2027-08-16", { load: "low" }), F("pugilist"))?.mode).toBe("deficit");
    expect(recKcalOf(blk("h", "monk", "2027-01-04", "2027-02-14", { load: "high" }), F("monk"))?.mode).toBe("maintenance");
    expect(recKcalOf(blk("s", "slayer", "2027-01-04", "2027-02-14", {}), F("slayer"))?.mode).toBe("surplus");
    expect(recKcalOf(blk("m", "conqueror", "2027-03-01", "2027-04-12", {}), F("conqueror"))).toBeNull();
    // schon passend gesetzt: kein Vorschlag
    expect(recKcalOf(blk("l2", "pugilist", "2027-07-05", "2027-08-16", { load: "low", kcal: "deficit" }), F("pugilist"))).toBeNull();
  });
  it("Alle Modi haben Klartexte", () => {
    expect((Object.keys(KCAL_LABEL) as Kcal[]).sort()).toEqual(["deficit", "maintenance", "surplus"]);
  });
});

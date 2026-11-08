import { describe, expect, it } from "vitest";
import type { PlanBlock } from "../types";
import { HALF_CHECK, HALF_MIN, mesoBalance } from "./bilanz";

/** Montag 4.1.2027, Ende nach n Wochen (Sonntag) */
const start = "2027-01-04";
const blk = (weeks: number, over: Partial<PlanBlock> = {}): PlanBlock => ({
  id: "b" + (n++), focusId: "slayer", start, end: endOf(weeks), label: "", load: "medium", travel: false, ...over,
});
let n = 1;
const endOf = (weeks: number) => {
  const d = new Date(start + "T12:00");
  d.setDate(d.getDate() + weeks * 7 - 1);
  return d.toISOString().slice(0, 10);
};
const row = (b: ReturnType<typeof mesoBalance>, id: string) => b.rows.find((r) => r.id === id)!;

describe("Domänen-Bilanz", () => {
  it("trägt Kondition auf Kraftausdauer und Anaerob, Nebenziele halb", () => {
    const b = mesoBalance([blk(6, { focusId: "paladin" })]); // primary conditioning, secondary [strength, mobility]
    expect(b.columns).toHaveLength(1);
    expect(row(b, "ke").cells).toEqual([6]);
    expect(row(b, "anaerob").cells).toEqual([6]);
    expect(row(b, "strength").cells).toEqual([3]);
    expect(row(b, "mobility").cells).toEqual([3]);
    expect(row(b, "aerob").cells).toEqual([0]);
  });

  it("zählt Hauptziele voll, jedes Nebenziel halb; Masse läuft extra mit", () => {
    const b = mesoBalance([blk(6, { focusId: "slayer" })]); // primary hypertrophy, secondary [strength, power, skill]
    expect(row(b, "masse").cells).toEqual([6]);
    expect(row(b, "strength").cells).toEqual([3]);
    expect(row(b, "power").cells).toEqual([3]);
    expect(row(b, "speed").cells).toEqual([0]);
    const b2 = mesoBalance([blk(5, { focusId: "smith" })]); // primary strength, secondary [hypertrophy]
    expect(row(b2, "strength").cells).toEqual([5]);
    expect(row(b2, "masse").cells).toEqual([2.5]);
  });

  it("bündelt Meso-Teile in einer Spalte, Einzelphasen und Testwochen getrennt", () => {
    const b = mesoBalance([
      blk(6, { focusId: "slayer", meso: "m1" }),
      blk(6, { focusId: "smith", meso: "m1", start: "2027-02-15", end: endOf2("2027-02-15", 6) }),
      blk(4, { focusId: "olympian", id: "solo", start: "2027-03-29", end: endOf2("2027-03-29", 4) }),
      blk(1, { focusId: "test", id: "tw", start: "2027-04-26", end: endOf2("2027-04-26", 1), label: "Testwoche" }),
    ]);
    expect(b.columns).toHaveLength(2);
    expect(b.columns[0].meso).toBe(true);
    expect(b.columns[0].weeks).toBe(12);
    expect(b.columns[1].meso).toBe(false);
    expect(row(b, "strength").cells).toEqual([9, 2]); // Smith voll + Slayer halb; Olympian: Kraft halb
    expect(row(b, "power").cells).toEqual([3, 4]);
    expect(row(b, "masse").cells).toEqual([9, 0]);
  });

  it("teilt Phasen sauber auf Halbjahre (Woche zählt per Montag)", () => {
    const b = mesoBalance([blk(6, { focusId: "slayer", start: "2027-06-14", end: endOf2("2027-06-14", 6) })]);
    expect(b.halves).toHaveLength(2);
    const h1 = b.halves.find((h) => h.label === "2027 H1")!;
    const h2 = b.halves.find((h) => h.label === "2027 H2")!;
    expect(h1.planned).toBe(3); // Montags 14., 21., 28. Juni
    expect(h2.planned).toBe(3); // Montags 5., 12., 19. Juli
    expect(h1.byDomain.strength).toBe(1.5); // je 0.5 pro Woche
    expect(h2.byDomain.strength).toBe(1.5);
  });

  it("warnt erst, wenn ein Halbjahr halb geplant ist: 14 Wochen Assassin lassen Ausdauer rot", () => {
    const b = mesoBalance([blk(14, { focusId: "assassin" })]); // primary fatloss (keine Domäne), secondary [strength, skill]
    const h1 = b.halves[0];
    expect(h1.planned).toBe(14);
    expect(h1.checked).toBe(true);
    expect(h1.byDomain.strength).toBe(7);
    const names = b.gaps.map((g) => g.domain);
    expect(names).toContain("aerob");
    expect(names).toContain("speed");
    expect(names).not.toContain("strength");
    expect(b.gaps.find((g) => g.domain === "aerob")!.weeks).toBe(0);
  });

  it("prüft halb gefüllte Halbjahre nicht", () => {
    const b = mesoBalance([blk(8, { focusId: "assassin" })]); // 8 Wochen < HALF_CHECK
    expect(b.halves[0].planned).toBe(8);
    expect(b.halves[0].checked).toBe(false);
    expect(b.gaps).toHaveLength(0);
  });

  it("warnt bei drei Phasen in Folge mit demselben Hauptziel; Harlequin unterbricht", () => {
    const three = mesoBalance([
      blk(4, { focusId: "paladin" }), blk(4, { focusId: "paladin", start: "2027-02-01", end: endOf2("2027-02-01", 4) }),
      blk(4, { focusId: "paladin", start: "2027-03-01", end: endOf2("2027-03-01", 4) }),
    ]);
    expect(three.streaks).toHaveLength(1);
    expect(three.streaks[0].goal).toBe("conditioning");
    expect(three.streaks[0].labels).toHaveLength(3);
    const joker = mesoBalance([
      blk(4, { focusId: "paladin" }), blk(4, { focusId: "paladin", start: "2027-02-01", end: endOf2("2027-02-01", 4) }),
      blk(4, { focusId: "harlequin", start: "2027-03-01", end: endOf2("2027-03-01", 4) }),
      blk(4, { focusId: "paladin", start: "2027-03-29", end: endOf2("2027-03-29", 4) }),
    ]);
    expect(joker.streaks).toHaveLength(0);
  });

  it("kennt die Grenzen von vier und dreizehn Wochen und bleibt bei leerem Plan still", () => {
    expect(HALF_MIN).toBe(4);
    expect(HALF_CHECK).toBe(13);
    const empty = mesoBalance([]);
    expect(empty.columns).toHaveLength(0);
    expect(empty.halves).toHaveLength(0);
    expect(empty.gaps).toHaveLength(0);
    expect(empty.streaks).toHaveLength(0);
  });
});

/** Ende nach n Wochen ab einem beliebigen Start (Sonntag) */
function endOf2(s: string, weeks: number) {
  const d = new Date(s + "T12:00");
  d.setDate(d.getDate() + weeks * 7 - 1);
  return d.toISOString().slice(0, 10);
}

describe("Domänen-Bilanz: Bestien", () => {
  it("Bestien halten Kraftausdauer und Intervalle mit einem Viertel je Woche, höchstens eine volle Woche", () => {
    const b = mesoBalance([blk(8, { focusId: "knight" })]);
    expect(row(b, "ke").cells).toEqual([2]);
    expect(row(b, "anaerob").cells).toEqual([2]);
  });
});

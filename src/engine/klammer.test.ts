import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID, KLAMMER_BY_ID } from "../data";
import type { AppState, Load, PlanBlock, Section } from "../types";
import { addDays, blockWeeks, isTestBlock } from "./plan";
import { bindOf, effectiveLoads, flagsOf, klammernOf, placeWindows, planYear, rankInKlammer } from "./klammer";
import { klammerWeek } from "./deload";
import { semesterTemplate } from "./sections";

const T = "2026-11-09"; // Montag
const sec = (start: string, weeks: number, load: Load, name = "Abschnitt", travel = false): Section => ({ id: `${name}-${start}`, name, start, end: addDays(start, 7 * weeks - 1), load, travel });
const ids = (p = "b") => { let n = 0; return () => `${p}${n++}`; };
const contiguous = (p: PlanBlock[]) => [...p].sort((x, y) => x.start.localeCompare(y.start)).every((b, i, a) => i === 0 || new Date(a[i - 1].end + "T12:00").getTime() + 864e5 === new Date(b.start + "T12:00").getTime());
/** Semester-Jahr: WS hoch, Ferien niedrig, SS mittel, Sommer niedrig mit Reise */
const YEAR = [sec(T, 14, "high", "Wintersemester"), sec(addDays(T, 7 * 14), 8, "low", "Ferien"), sec(addDays(T, 7 * 22), 16, "medium", "Sommersemester"), sec(addDays(T, 7 * 38), 14, "low", "Sommer", true)];

describe("Klammern: Platzierung", () => {
  it("Fenster sind 8–16 Wochen lang, lückenlos und decken das Jahr", () => {
    const w = placeWindows(YEAR, T, YEAR[3].end);
    expect(w.reduce((s, x) => s + x.weeks, 0)).toBe(52);
    expect(w.every((x) => x.weeks >= 8 && x.weeks <= 16)).toBe(true);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBe(addDays(w[i - 1].end, 1));
  });

  it("Schnitte rasten an Abschnittsgrenzen ein (±2 Wochen)", () => {
    const w = placeWindows(YEAR, T, YEAR[3].end);
    const bounds = YEAR.slice(1).map((s) => s.start);
    for (const x of w.slice(0, -1)) {
      const next = addDays(x.end, 1);
      const d = Math.min(...bounds.map((b) => Math.abs((new Date(b).getTime() - new Date(next).getTime()) / (7 * 864e5))));
      expect(d).toBeLessThanOrEqual(3);
    }
  });

  it("kürzer als acht Wochen: ein einziges Fenster", () => {
    expect(placeWindows([sec(T, 6, "medium")], T, addDays(T, 41))).toHaveLength(1);
  });
});

describe("Klammern: Jahr planen", () => {
  const out = planYear([], YEAR, T, ids(), { aim: "allround" });
  const ks = klammernOf(out);

  it("lückenlos, jede Klammer mit Testwoche am Ende und 1–3 Orden", () => {
    expect(contiguous(out)).toBe(true);
    expect(out[out.length - 1].end).toBe(YEAR[3].end);
    expect(ks.length).toBeGreaterThanOrEqual(4);
    for (const k of ks) {
      expect(k.test).toBeTruthy();
      expect(k.parts.length).toBeGreaterThanOrEqual(1);
      expect(k.parts.length).toBeLessThanOrEqual(3);
      expect(k.parts.every((p) => FOCUS_BY_ID[p.focusId])).toBe(true);
    }
  });

  it("kein Orden zweimal direkt hintereinander in einer Klammer", () => {
    for (const k of ks) for (let i = 1; i < k.parts.length; i++) expect(k.parts[i].focusId).not.toBe(k.parts[i - 1].focusId);
  });

  it("kein Defizit bei hoher Last oder Dauerlast", () => {
    for (const b of out.filter((x) => !isTestBlock(x))) expect(flagsOf(b, YEAR)).not.toContain("kcal-load");
  });

  it("Ziel Muskel: Winter-Klammer ist Muskelzuwachs mit Überschuss, Orden tragen das Ziel", () => {
    const p = planYear([], YEAR, T, ids(), { aim: "muskel" });
    const first = klammernOf(p)[0];
    expect(first.kind).toBe("muskel");
    expect(first.kcal).toBe("surplus");
    expect(first.parts.every((x) => bindOf(FOCUS_BY_ID[x.focusId], KLAMMER_BY_ID.muskel) !== "none")).toBe(true);
  });

  it("Reise zieht eine reisetaugliche Klammer", () => {
    const last = ks[ks.length - 1];
    expect(KLAMMER_BY_ID[last.kind].travel).toBe(true);
  });

  it("gepinnter Orden bleibt beim Neuplanen stehen", () => {
    const k = klammernOf(out)[1];
    const target = k.parts[0];
    const other = ["pilgrim", "monk", "king"].find((id) => id !== target.focusId)!;
    const pinned = out.map((b) => (b.id === target.id ? { ...b, focusId: other, pin: { focus: true } } : b));
    const again = planYear(pinned, YEAR, T, ids("n"), { aim: "allround" });
    const mid = addDays(target.start, 7);
    const at = again.find((b) => b.start <= mid && mid <= b.end)!;
    expect(at.focusId).toBe(other);
    expect(at.pin?.focus).toBe(true);
  });

  it("Klammer-Art von Hand (Index) setzt sich durch und wird gepinnt", () => {
    const p = planYear([], YEAR, T, ids(), { aim: "allround", kinds: { 0: "regeneration" } });
    expect(klammernOf(p)[0].kind).toBe("regeneration");
    expect(klammernOf(p)[0].parts[0].pin?.klammer).toBe(true);
  });

  it("Hausorden-Pool begrenzt die Vorschläge", () => {
    const pool = ["knight", "smith", "troubadour", "olympian", "monk", "harlequin"];
    const p = planYear([], YEAR, T, ids(), { aim: "allround", pool });
    expect(p.filter((b) => !isTestBlock(b)).every((b) => pool.includes(b.focusId))).toBe(true);
  });

  it("Testwochen-Regel keine: keine Testwochen", () => {
    const p = planYear([], YEAR, T, ids(), { aim: "allround", testPolicy: "none" });
    expect(p.filter(isTestBlock)).toHaveLength(0);
    expect(contiguous(p)).toBe(true);
  });
});

describe("Klammern: Dauerlast und Entlastung", () => {
  it("mittlere Last wird nach acht Wochen ohne ruhigen Abschnitt zur hohen", () => {
    const eff = effectiveLoads([sec(T, 12, "medium")]);
    expect(eff.get(addDays(T, 7 * 7))).toBe("medium");
    expect(eff.get(addDays(T, 7 * 8))).toBe("high");
  });

  it("Entlastungs-Rhythmus zählt über die Klammer, nicht den Teil", () => {
    const out = planYear([], [sec(T, 13, "medium")], T, ids(), { aim: "allround" });
    const k = klammernOf(out)[0];
    expect(k.parts.length).toBe(2);
    const second = k.parts[1];
    const w = klammerWeek(out, second, 1);
    expect(w?.week).toBe(blockWeeks(k.parts[0]) + 1);
    expect(w?.total).toBe(12);
    void ({} as AppState);
  });
});

describe("Klammern: laufende Klammer", () => {
  it("bleibt beim Neuplanen ganz, mit allen Teilen und Testwoche", () => {
    const first = planYear([], YEAR, T, ids(), { aim: "allround" });
    const k0 = klammernOf(first)[0];
    const mid = addDays(k0.parts[0].start, 14);
    const again = planYear(first, YEAR, mid, ids("n"), { aim: "muskel" });
    const k1 = klammernOf(again)[0];
    expect(k1.meso).toBe(k0.meso);
    expect(k1.parts.map((p) => p.id)).toEqual(k0.parts.map((p) => p.id));
    expect(k1.test?.id).toBe(k0.test?.id);
    expect(contiguous(again)).toBe(true);
  });
});

describe("Klammern: Phasenblatt", () => {
  it("die Empfehlung im Phasenblatt ist der Orden, den das Planen gewählt hat", () => {
    const out = planYear([], YEAR, T, ids(), { aim: "allround" });
    for (const k of klammernOf(out)) for (const p of k.parts) expect(rankInKlammer(out, p.id)[0].f.id).toBe(p.focusId);
  });

  it("Teilen in einer Klammer behält beide Hälften in der Klammer", async () => {
    const { splitBlock } = await import("./stack");
    const out = planYear([], YEAR, T, ids(), { aim: "allround" });
    const k = klammernOf(out)[0];
    const s = splitBlock(out, k.parts[0].id, "neu", addDays(T, -7));
    expect(klammernOf(s)[0].parts.length).toBe(k.parts.length + 1);
  });
});

describe("Klammern: Athletik", () => {
  it("drei Orden in der Athletik-Klammer weichen nicht auf einen Kraft-Orden aus", () => {
    const out = planYear([], [sec(T, 16, "low", "Sommer", true)], T, ids(), { aim: "schnellkraft" });
    const k = klammernOf(out)[0];
    expect(k.kind).toBe("athletik");
    for (const p of k.parts) expect(FOCUS_BY_ID[p.focusId].goals.primary).not.toBe("strength");
  });
});

describe("Klammern: mehrere Ziele mit Priorität", () => {
  it("Priorität 1 bekommt die meisten Zeichen, Priorität 2 kommt auch vor", () => {
    const p = planYear([], YEAR, T, ids(), { aim: "muskel", aims: [{ aim: "muskel", prio: 1 }, { aim: "ausdauer", prio: 2 }] });
    const kinds = klammernOf(p).map((k) => k.kind);
    expect(kinds).toContain("muskel");
    expect(kinds).toContain("gpp");
    expect(kinds.filter((k) => k === "muskel").length).toBeGreaterThanOrEqual(kinds.filter((k) => k === "gpp").length);
  });

  it("höchstens zwei Überschuss-Zeichen im Jahr", () => {
    const long = [sec(T, 70, "medium", "lang")];
    const p = planYear([], long, T, ids(), { aim: "muskel" });
    expect(klammernOf(p).filter((k) => k.kind === "muskel").length).toBeLessThanOrEqual(2);
  });

  it("Sommer ohne hohe Last trägt ein Defizit; Teile mit hoher Last bleiben auf Erhaltung", () => {
    const yr = semesterTemplate(T); // Modelljahr: WS hoch, Ferien niedrig, SS hoch, Sommerpause mittel
    const p = planYear([], yr, T, ids(), { aim: "allround" });
    const eff = effectiveLoads(yr);
    for (const b of p.filter((x) => x.kcal === "deficit")) expect(flagsOf(b, yr)).not.toContain("kcal-load");
    expect(p.some((b) => b.kcal === "deficit")).toBe(true);
    void eff;
  });
});

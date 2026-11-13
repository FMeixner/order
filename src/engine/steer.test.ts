import { describe, expect, it } from "vitest";
import { BEASTS, FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { AppState, Focus, PlanBlock, Session } from "../types";
import { balanceOf, goalVector } from "./balance";
import { beastPowers, CLOCKS, residualClocks, type ClockId, type ResidualClock } from "./residual";
import { yearSlots } from "./sharpen";
import { aimScore, fillMeso, rankFor, type DeficitWeights } from "./sequence";
import { CLOCK_AXES, hotClocks, opportunities, steerWeights } from "./steer";

const T = "2026-11-04"; // Mittwoch

/** Synthetische Uhr: Tage (null = noch nie) über Budget heißt rot */
const clk = (id: ClockId, days: number | null): ResidualClock => {
  const def = CLOCKS.find((c) => c.id === id)!;
  return { id, name: def.name, budget: def.budget, last: null, days, over: days === null || days > def.budget };
};

const base = (sessions: Session[], plan: PlanBlock[] = []): AppState => ({ ...emptyState(), sessions, plan });
const sess = (over: Partial<Session>): Session => ({
  id: "s1", date: T, blockId: "b1", focusId: "slayer", week: 1, role: "kraft_a", profileId: "g",
  entries: {}, drills: {}, done: true, ...over,
});

/** Slayer (eingefroren für die Phase) mit Schwerpunkt-Modulen in der Kraft-Rolle,
    damit Sessions über die Drill-Ids die Uhren füttern können */
const slayerWithModules = (variants: string[]): { plan: PlanBlock[]; drillId: (v: string) => string } => {
  const f0 = FOCUS_BY_ID.slayer;
  const role = f0.roles.kraft_a;
  const mods = variants.map((variant) => ({ type: "module", module: "sharpen", variant } as const));
  const f: Focus = { ...f0, roles: { ...f0.roles, kraft_a: { ...role, blocks: [...role.blocks, ...mods] } } };
  const plan: PlanBlock[] = [{ id: "b1", focusId: "slayer", start: "2026-10-05", end: "2026-11-16", label: "", load: "medium", travel: false, frozen: { at: "2026-10-05", foci: { slayer: f } } }];
  const ids: Record<string, string> = { mobility: "sh-mo-1", aerob: "sh-ae-1", speed: "sh-sp-1" };
  return { plan, drillId: (v) => ids[v] ?? "" };
};

/** Zwei leere Mesozyklus-Teile, wie „+ Mesozyklus anhängen“ sie anlegt */
const mesoParts = (): PlanBlock[] => [
  { id: "m1", focusId: "", start: "2026-11-09", end: "2026-12-20", label: "", load: "medium", travel: false, meso: "M" },
  { id: "m2", focusId: "", start: "2026-12-21", end: "2027-01-31", label: "", load: "medium", travel: false, meso: "M" },
];

describe("Lenkung: rote Uhren als Gewichte", () => {
  it("gibt ohne rote Uhren keine Gewichte", () => {
    expect(steerWeights([clk("schnellkraft", 3), clk("kraft", 10)])).toEqual([]);
  });

  it("setzt eine rote Uhr auf ihre Achse; „noch nie“ zählt am dringendsten", () => {
    expect(steerWeights([clk("schnellkraft", 9)])).toEqual([{ axis: "schnellkraft", w: 1 }]);
    const w = steerWeights([clk("kraft", 31), clk("schnellkraft", null)]);
    expect(w.find((x) => x.axis === "schnellkraft")).toEqual({ axis: "schnellkraft", w: 1 });
    // Die Kraft-Uhr hält zwei Achsen, mit dem Gewicht der zweiten dringenden Uhr
    expect(w.find((x) => x.axis === "kraft")).toMatchObject({ w: 0.7 });
    expect(w.find((x) => x.axis === "muskel")).toMatchObject({ w: 0.7 });
  });

  it("fasst Kraftausdauer und Anaerob auf der Konditions-Achse mit dem höheren Gewicht zusammen", () => {
    expect(steerWeights([clk("ke", 20), clk("anaerob", 15)])).toEqual([{ axis: "kondition", w: 1 }]);
    // Dringendste zuerst: 20/14 Tage zählt mehr als 15/14
    expect(hotClocks([clk("ke", 20), clk("anaerob", 15)]).map((c) => c.id)).toEqual(["ke", "anaerob"]);
  });

  it("erhält die Uhr-zu-Achsen-Abbildung des Konzepts", () => {
    expect(CLOCK_AXES.kraft).toEqual(["kraft", "muskel"]);
    expect(CLOCK_AXES.sehnen).toEqual(["kraft"]);
    expect(CLOCK_AXES.ke).toEqual(["kondition"]);
  });
});

describe("Lenkung: Blockfolge", () => {
  it("zahlt den Anteil auf den Achsen roter Uhren exakt dazu", () => {
    const plan: PlanBlock[] = [{ id: "b1", focusId: "slayer", start: "2026-09-07", end: "2026-10-18", label: "", load: "medium", travel: false }];
    const from = "2026-09-07", to = "2026-10-18";
    const steer: DeficitWeights = [{ axis: "kraft", w: 0.5 }];
    const diff = aimScore(plan, from, to, "allround", [], steer) - aimScore(plan, from, to, "allround", [], []);
    const main = balanceOf(plan, from, to, true);
    expect(diff).toBeCloseTo(12 * 0.5 * main.share.kraft, 5);
  });

  it("Zeit-Orden zählen beim Jahresziel gedimpt: Smith vor Herald bei Ziel Kraft (Herald-Regel gilt auch fürs Ziel)", () => {
    const p: PlanBlock[] = [{ id: "w1", focusId: "", start: "2026-11-16", end: "2026-12-27", label: "", load: "medium", travel: false }];
    const r = rankFor(p, "w1", "kraft");
    const si = r.findIndex((x) => x.f.id === "smith");
    const hi = r.findIndex((x) => x.f.id === "herald");
    expect(si).toBeGreaterThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(0);
    expect(si).toBeLessThan(hi);
    expect(r[hi].reasons.some((x) => /gedimpt/.test(x))).toBe(true);
  });

  it("begründet Kandidaten, die rote Uhren halten, und hebt sie im Ranking", () => {
    const steer: DeficitWeights = [{ axis: "kondition", w: 1 }];
    const r0 = rankFor(mesoParts(), "m1", "allround");
    const r1 = rankFor(mesoParts(), "m1", "allround", [], steer);
    expect(r1.find((x) => x.f.id === "paladin")!.score).toBeGreaterThan(r0.find((x) => x.f.id === "paladin")!.score);
    expect(r1.find((x) => x.f.id === "paladin")!.reasons.some((x) => /rote Uhren: Kondition/.test(x))).toBe(true);
    // Der beste Kandidat bedient mit Lenkung die rote Achse
    expect(goalVector(r1[0].f).kondition).toBeGreaterThan(0);
  });

  it("füllt den Mesozyklus residual-geführt: Der erste Teil bedient die rote Achse", () => {
    const filled = fillMeso(mesoParts(), "allround", [], [{ axis: "kondition", w: 1 }]);
    const f1 = FOCUS_BY_ID[filled.find((b) => b.id === "m1")!.focusId];
    expect(goalVector(f1).kondition).toBeGreaterThan(0);
  });
});

describe("Lenkung: Der Schwerpunkt hält, was sonst verfällt (Jahresplan)", () => {
  it("rote Beweglichkeits-Uhr: seit 1.47 kein Beweglichkeits-Slot (Warm-up und Cool-down halten sie)", () => {
    const { plan, drillId } = slayerWithModules(["mobility"]);
    const sMob = sess({ id: "a", date: "2026-09-01", drills: { [drillId("mobility")]: [true] } }); // 34/21 Tage: rot
    const sBeast = sess({ id: "b", date: "2026-10-01", beast: { id: "ng-vidar", seconds: 600 } }); // Sprints: Sprungkraft, KE, Anaerob grün
    const state = base([sMob, sBeast], plan);
    expect(residualClocks(state, plan[0].start).find((c) => c.id === "mobility")!.over).toBe(true);
    const y = yearSlots(state, plan[0].start).get(plan[0].id)!;
    expect(y.domain).not.toBe("mobility");
    expect(["speed", "power", "anaerob", "aerob", null]).toContain(y.domain);
  });

  it("ohne erledigte Einheiten: Erhalt eines Bereichs, nie einer, der den Orden stört", () => {
    const { plan } = slayerWithModules(["mobility"]);
    const y = yearSlots(base([], plan), plan[0].start).get(plan[0].id)!;
    expect(y.purpose).toBe("erhalt");
    expect(y.domain).not.toBe("aerob");
  });

  it("alles Slot-fähige frisch: Sekundärziel; rote Ausdauer stört Muskelaufbau und bekommt keinen Slot", () => {
    const { plan, drillId } = slayerWithModules(["mobility", "aerob"]);
    const sMob = sess({ id: "b", date: "2026-10-01", drills: { [drillId("mobility")]: [true] } });
    const sBeast = sess({ id: "c", date: "2026-10-01", beast: { id: "ng-vidar", seconds: 600 } });
    const sAerob = sess({ id: "d", date: "2026-08-01", drills: { [drillId("aerob")]: [true] } });
    const y = yearSlots(base([sAerob, sMob, sBeast], plan), plan[0].start).get(plan[0].id)!;
    expect(y.domain).not.toBe("aerob");
    expect(["sekundaer", "erhalt"]).toContain(y.purpose);
  });
});

describe("Lenkung: Gelegenheiten aus dem Bestand", () => {
  it("gibt ohne rote Uhren keine Gelegenheiten", () => {
    expect(opportunities([clk("schnellkraft", 2)])).toEqual([]);
  });

  it("empfiehlt bei roter Sprungkraft-Uhr eine Bestie mit Sprintanteil aus dem Bestand", () => {
    const o = opportunities([clk("schnellkraft", 10)]);
    expect(o).toHaveLength(1);
    const sprinter = BEASTS.find(beastPowers)!;
    expect(o[0].text).toContain(sprinter.name);
    expect(o[0].text).toMatch(/Sprint- oder Sprunganteil/);
  });

  it("empfiehlt für die Kraft-Uhr einen Orden statt eines Slots", () => {
    const o = opportunities([clk("kraft", 40)]);
    expect(o).toHaveLength(1);
    expect(o[0].text).toMatch(/Orden/);
  });
});

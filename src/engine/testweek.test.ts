import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import { TESTWEEK } from "../data";
import type { AppState, PlanBlock } from "../types";
import { TEST_BLOCK, blockAt } from "./plan";
import { closeTestWeek, cupDone, openCupTarget, saveTestResult, skipTestResult, testDone, testMissingGear } from "./testweek";

const T = "2026-11-12";
const block = (id: string, start: string, end: string): PlanBlock =>
  ({ id, focusId: TEST_BLOCK, label: "Testwoche", start, end, load: "medium", travel: false });

/** AppState, in dem jeder Test der Cups von `done` einen Wert hat */
function filled(done: PlanBlock, open: PlanBlock): AppState {
  let s: AppState = { ...emptyState(), plan: [done, open] };
  for (const cup of TESTWEEK.cups) for (const t of cup.tests) s = saveTestResult(s, done.id, t.id, 10, "10", "2026-08-12");
  return s;
}

describe("Testwoche und Nachholen (1.38)", () => {
  it("saveTestResult speichert mit blockId und ersetzt den Wert dieser Testwoche", () => {
    const b = block("t1", "2026-08-10", "2026-08-16");
    let s = saveTestResult(emptyState(), b.id, "t-pushup", 12, "12", T);
    expect(s.tests["t-pushup"]).toHaveLength(1);
    expect(s.tests["t-pushup"]![0]).toMatchObject({ blockId: b.id, value: 12, raw: "12", date: T });
    s = saveTestResult(s, b.id, "t-pushup", 14, "14", T);
    expect(s.tests["t-pushup"]).toHaveLength(1);
    expect(s.tests["t-pushup"]![0].value).toBe(14);
    // andere Testwoche: beide bleiben
    s = saveTestResult(s, "andere", "t-pushup", 9, "9", T);
    expect(s.tests["t-pushup"]).toHaveLength(2);
  });

  it("saveTestResult trennt Varianten und hebt ein Auslassen auf", () => {
    const b = block("t1", "2026-08-10", "2026-08-16");
    let s = skipTestResult(emptyState(), b.id, "t-5rm", true);
    expect(s.testSkips?.[`t1:t-5rm`]).toBe(true);
    expect(testDone(s, b, "t-5rm")).toBe(true);
    s = saveTestResult(s, b.id, "t-5rm", 80, "80", T, "squat");
    expect(s.testSkips?.[`t1:t-5rm`]).toBeUndefined(); // Speichern hebt das Auslassen auf
    s = saveTestResult(s, b.id, "t-5rm", 100, "100", T, "legpress");
    expect(s.tests["t-5rm"]).toHaveLength(2); // je Variante ein Wert
    s = skipTestResult(s, b.id, "t-5rm", false);
    expect(s.testSkips).toEqual({}); // Auslassen zurückgenommen
  });

  it("cupDone verlangt jeden Test des Cups, Auslassen zählt", () => {
    const b = block("t1", "2026-08-10", "2026-08-16");
    const cup = TESTWEEK.cups[0]!;
    let s = emptyState();
    expect(cupDone(s, b, cup)).toBe(false);
    for (const t of cup.tests) s = saveTestResult(s, b.id, t.id, 10, "10", T);
    expect(cupDone(s, b, cup)).toBe(true);
    // ein Test fehlt wieder: Cup ist offen
    s = { ...s, tests: { ...s.tests, [cup.tests[0]!.id]: [] } };
    expect(cupDone(s, b, cup)).toBe(false);
    s = skipTestResult(s, b.id, cup.tests[0]!.id, true);
    expect(cupDone(s, b, cup)).toBe(true);
  });

  it("openCupTarget findet die jüngste begonnene Testwoche mit offenen Cups", () => {
    const closed = block("alt", "2026-08-10", "2026-08-16");
    const open = block("jung", "2026-09-14", "2026-09-20");
    expect(openCupTarget(emptyState(), T)).toBeNull(); // keine Testwoche im Plan
    let s = filled(closed, open);
    expect(openCupTarget(s, T)?.id).toBe("jung"); // abgeschlossene bleibt unberücksichtigt
    // noch eine offene dazu: die jüngste gewinnt
    s = { ...s, plan: [...s.plan, block("mittel", "2026-09-28", "2026-10-04")] };
    expect(openCupTarget(s, T)?.id).toBe("mittel");
    // zukünftige Testwochen zählen nicht
    s = { ...s, plan: [...s.plan, block("zukunft", "2026-12-07", "2026-12-13")] };
    expect(openCupTarget(s, T)?.id).toBe("mittel");
    // die laufende Testwoche zählt als jüngste offene
    s = { ...emptyState(), plan: [block("laufend", "2026-11-09", "2026-11-15")] };
    expect(openCupTarget(s, T)?.id).toBe("laufend");
  });
});

describe("Testwoche abschließen (1.39)", () => {
  const order = (id: string, start: string, end: string): PlanBlock =>
    ({ id, focusId: "slayer", label: "x", start, end, load: "medium", travel: false });

  it("beendet die Testwoche gestern und lässt den folgenden Orden heute beginnen", () => {
    const tw = block("tw", "2026-11-09", "2026-11-15");
    const slayer = order("slayer", "2026-11-16", "2026-12-13");
    const s = closeTestWeek({ ...emptyState(), plan: [tw, slayer] }, tw, T); // T = 2026-11-12, Donnerstag
    expect(s.plan[0]).toMatchObject({ id: "tw", end: "2026-11-11" });
    expect(s.plan[1]).toMatchObject({ id: "slayer", start: "2026-11-12" });
    // heute gehört schon dem Slayer — dessen Woche 1 ist die Anlaufwoche
    expect(blockAt(s.plan, T)?.id).toBe("slayer");
    expect(blockAt(s.plan, "2026-11-11")?.id).toBe("tw");
  });

  it("ohne folgenden Orden endet nur die Testwoche früher", () => {
    const tw = block("tw", "2026-11-09", "2026-11-15");
    const s = closeTestWeek({ ...emptyState(), plan: [tw] }, tw, T);
    expect(s.plan).toHaveLength(1);
    expect(s.plan[0]).toMatchObject({ id: "tw", end: "2026-11-11" });
  });

  it("Abschluss am Starttag lässt die Woche bis heute gelten; der Folge-Orden beginnt morgen", () => {
    const tw = block("tw", "2026-11-09", "2026-11-15");
    const slayer = order("slayer", "2026-11-16", "2026-12-13");
    const s = closeTestWeek({ ...emptyState(), plan: [tw, slayer] }, tw, "2026-11-09");
    expect(s.plan[0]).toMatchObject({ id: "tw", end: "2026-11-09" });
    expect(s.plan[1]).toMatchObject({ id: "slayer", start: "2026-11-10" });
  });

  it("außerhalb der Testwoche ändert sich nichts, eine folgende Testwoche wird nicht vorgezogen", () => {
    const tw = block("tw", "2026-11-09", "2026-11-15");
    const tw2 = block("tw2", "2026-11-16", "2026-11-22");
    const s0 = { ...emptyState(), plan: [tw, tw2] };
    expect(closeTestWeek(s0, tw, "2026-11-20")).toEqual(s0); // heute liegt nicht in dieser Testwoche
    const s1 = closeTestWeek(s0, tw, T);
    expect(s1.plan[0]).toMatchObject({ id: "tw", end: "2026-11-11" });
    expect(s1.plan[1]).toMatchObject({ id: "tw2", start: "2026-11-16" }); // Testwoche bleibt am Montag
  });

  it("offene Cups bleiben nachholbar: die abgeschlossene Testwoche bleibt Ziel des Nachholens", () => {
    const tw = block("tw", "2026-11-09", "2026-11-15");
    const slayer = order("slayer", "2026-11-16", "2026-12-13");
    const s = closeTestWeek({ ...emptyState(), plan: [tw, slayer] }, tw, T);
    expect(openCupTarget(s, T)?.id).toBe("tw");
  });
});

describe("Schlanke Testwoche (1.47)", () => {
  const b = block("t1", "2026-11-16", "2026-11-22");
  const prof = (medball: boolean) => ({ ...EQUIPMENT_PRESETS[0].make(), id: "p", has: { ...EQUIPMENT_PRESETS[0].make().has, medball } });
  const base = (medball: boolean): AppState => ({ ...emptyState(), equipment: [prof(medball)], schedule: { Mo: "p", Mi: "p", Sa: "p" } as AppState["schedule"], plan: [b] });
  it("keine 5RM-, Kraftausdauer-, Beweglichkeits- oder Stichtests mehr", () => {
    const ids = TESTWEEK.cups.flatMap((c) => c.tests.map((t) => t.id));
    for (const gone of ["t-5rm-squat", "t-5rm-push", "t-5rm-pull", "t-pushups", "t-pullups", "t-crunches", "t-deadhang", "t-wallsit", "t-sitreach", "t-dislocate", "t-stichserie"]) expect(ids).not.toContain(gone);
    for (const kept of ["t-cooper", "t-row500", "t-burpees", "t-broad", "t-highjump", "t-sprint30", "t-agility", "t-medball"]) expect(ids).toContain(kept);
  });
  it("draußen und Rudergerät nie am selben Testtag", () => {
    const park = TESTWEEK.cups.filter((c) => c.place === "Park").flatMap((c) => c.tests.map((t) => t.id));
    expect(park).toContain("t-cooper");
    expect(park).not.toContain("t-row500");
  });
  it("Medizinballwurf entfällt ohne Medizinball im Profil des Testtags", () => {
    const mb = TESTWEEK.cups.flatMap((c) => c.tests).find((t) => t.id === "t-medball")!;
    expect(testMissingGear(base(false), b, mb)).toMatch(/Medizinball/);
    expect(testDone(base(false), b, "t-medball")).toBe(true);
    expect(testMissingGear(base(true), b, mb)).toBeNull();
    expect(testDone(base(true), b, "t-medball")).toBe(false);
  });
  it("Cup nur aus einer Bestie: verdient mit Zeit dieser Woche oder Auslassen", () => {
    const aron = TESTWEEK.cups.find((c) => c.id === "arondight")!;
    const s = base(true);
    expect(cupDone(s, b, aron)).toBe(false);
    const id = aron.benchmark!.pool[0];
    expect(cupDone({ ...s, beastTimes: { [id]: [{ date: "2026-11-18", seconds: 600 }] } }, b, aron)).toBe(true);
    expect(cupDone({ ...s, testSkips: { [`${b.id}:${aron.id}`]: true } }, b, aron)).toBe(true);
  });
});

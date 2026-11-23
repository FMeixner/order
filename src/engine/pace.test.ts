import { describe, expect, it } from "vitest";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { FOCUS_BY_ID } from "../data";
import { paceFor, paceCat } from "./pace";
import { estimateRole } from "./duration";
import { missedSessions, setShortWeek } from "./dayadj";

const sess = (i: number, focusId: string, slotId: string, name: string, gaps: number[], reps = 8) => {
  let t = Date.parse("2026-11-02T18:00:00Z") + i * 86400000;
  const sets = [{ done: true, reps, doneAt: new Date(t).toISOString() }];
  for (const g of gaps) { t += g * 1000; sets.push({ done: true, reps, doneAt: new Date(t).toISOString() }); }
  return { id: `s${i}`, date: `2026-11-${String(2 + i).padStart(2, "0")}`, blockId: "b", focusId, week: 1, role: "x", profileId: "g", done: true, drills: {}, entries: { [slotId]: { key: slotId, slotId, name, prog: "double", sets } } };
};

describe("Dein Tempo (1.51.7)", () => {
  // Slayer Montag: DB Bench Press, 150 s Pause, 8 Wdh → erwartet 178 s je Zyklus
  const slot = FOCUS_BY_ID.slayer.roles.kraft_a.blocks.find((b) => b.type === "single" && b.slot.name === "DB Bench Press") as { slot: { id: string; rest: number } };
  it("lernt den Faktor aus den Häkchen-Abständen (Median), Ausreißer zählen nicht", () => {
    const exp = slot.slot.rest + 8 * 3.5;
    const sessions = Array.from({ length: 4 }, (_, i) => sess(i, "slayer", slot.slot.id, "DB Bench Press", [exp * 1.2, exp * 1.2, exp * 9]));
    const st = { ...emptyState(), sessions } as never;
    expect(paceFor(st, "muskel").cycle("strength")).toBeCloseTo(1.2, 2);
    expect(paceFor(st, "athletik").cycle("strength")).toBeCloseTo(1.2, 2); // Übungsart über alle Orden
    expect(paceFor(st, "muskel").cycle("explosive")).toBe(1); // keine Daten: Standard
  });
  it("die Schätzung der Einheit wächst mit dem Faktor", () => {
    const g = EQUIPMENT_PRESETS[0].make();
    const role = FOCUS_BY_ID.slayer.roles.kraft_a;
    const base = estimateRole(role, g).total;
    const slow = estimateRole(role, g, undefined, 1, false, false, { cycle: () => 1.5, setup: 1.5, n: 99 }).total;
    expect(slow).toBeGreaterThan(base + 5);
  });
  it("Übungsarten", () => {
    expect(paceCat("Box Jump")).toBe("explosive");
    expect(paceCat("Pull-Up")).toBe("bodyweight");
    expect(paceCat("Back Squat")).toBe("strength");
  });
});

describe("Kurz-Woche nach Ausfällen (1.51.7)", () => {
  const b = { id: "b1" } as never;
  const days = [{ role: "a" }, { role: "b" }, { role: "c" }, { role: "sa", optional: true }];
  it("zwei Ausfälle diese Woche oder in der geloggten Vorwoche", () => {
    const st = { ...emptyState(), dayAdj: { "b1:2:a": { skip: true }, "b1:2:b": { skip: true } } };
    expect(missedSessions(st, b, 2, days, days).cur).toBe(2);
    const prev = { ...emptyState(), sessions: [{ id: "x", blockId: "b1", week: 1, role: "a", done: true }] } as never;
    expect(missedSessions(prev, b, 2, days, days).prev).toBe(2); // b und c nicht gemacht, Samstag freiwillig
  });
  it("annehmen setzt alle offenen Einheiten auf Kurz", () => {
    const st = setShortWeek(emptyState(), b, 2, ["a", "c"], true);
    expect(st.dayAdj?.["b1:2:a"]?.short).toBe(true);
    expect(st.shortWeek?.["b1:2"]).toBe("ja");
  });
});

import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Session } from "../types";
import { addDays, dayRoleMap } from "./plan";
import { focusFor } from "./weekplan";
import { reviewLine, reviewWeek, weekReview } from "./weekreview";

const [gym] = EQUIPMENT_PRESETS.map((p) => p.make());
const MON = "2026-11-02";
function base(): AppState {
  const s = emptyState();
  return { ...s, equipment: [{ ...gym, id: "g" }], schedule: { Mo: "g", Mi: "g", Fr: "g", Sa: "g" },
    plan: [{ id: "b1", focusId: "knight", label: "", start: MON, end: addDays(MON, 69), load: "medium", travel: false }] };
}
const sess = (week: number, role: string, day: number, kg: number, reps = 8): Session => ({
  id: `b1:${week}:${role}`, date: addDays(MON, 7 * (week - 1) + day), blockId: "b1", focusId: "knight", week, role, profileId: "g",
  entries: { [`x|Bench Press`]: { key: "x|Bench Press", slotId: "x", name: "Bench Press", prog: "double", sets: [{ done: true, reps, weight: kg, doneAt: `${addDays(MON, 7 * (week - 1) + day)}T10:00:00Z` }, { done: true, reps, weight: kg, doneAt: `${addDays(MON, 7 * (week - 1) + day)}T10:45:00Z` }] } },
  drills: {}, done: true,
});

describe("Wochenrückblick", () => {
  it("zwei Wochen: gesteigert, entfallen, verdichtet; Befinden gemittelt", () => {
    let st = base();
    const roles = dayRoleMap(st, st.plan[0], focusFor(st, st.plan[0], 1)!, 1).map((d) => d.role);
    expect(roles.length).toBe(4);
    st = { ...st, sessions: roles.map((r, i) => sess(1, r, i * 2, 60)) };
    // Woche 2: Tag 1 gesteigert, Tag 2 gleich, Tag 3 fällt aus (verdichtet), Tag 4 entfällt
    st = {
      ...st,
      sessions: [...st.sessions, sess(2, roles[0], 0, 62.5), sess(2, roles[1], 2, 62.5)],
      dayAdj: { [`b1:2:${roles[2]}`]: { skip: true } },
      feeling: [{ date: addDays(MON, 7), sessionId: `b1:2:${roles[0]}`, value: 3 }, { date: addDays(MON, 9), sessionId: `b1:2:${roles[1]}`, value: 1 }],
    };
    const r = weekReview(st, st.plan[0], 2)!;
    expect(r.planned).toBe(4);
    expect(r.done).toBe(2);
    expect(r.condensed).toBe(1);
    expect(r.dropped).toBe(1);
    expect(r.feeling).toBe(2);
    expect(r.up).toEqual(["Bench Press"]);
    expect(r.sessions[0].minutes).toBe(45);
    expect(reviewLine(r)).toBe("2 von 4 Einheiten · 1 verdichtet · 1 entfallen · Befinden +2 · 1 Gewicht gesteigert");
    expect(reviewLine(r)).not.toMatch(/verpasst/);
  });
  it("zeigt die laufende Woche, wenn sie geschafft ist, sonst die davor", () => {
    let st = base();
    const roles = dayRoleMap(st, st.plan[0], focusFor(st, st.plan[0], 1)!, 1).map((d) => d.role);
    st = { ...st, sessions: roles.map((r, i) => sess(1, r, i * 2, 60)) };
    expect(reviewWeek(st, addDays(MON, 9))).toMatchObject({ week: 1 });
    st = { ...st, sessions: [...st.sessions, ...roles.map((r, i) => sess(2, r, i, 60))] };
    expect(reviewWeek(st, addDays(MON, 10))).toMatchObject({ week: 2 });
  });
});

describe("Wochenrückblick im Defizit", () => {
  it("zählt gehaltene Übungen", () => {
    let st = base();
    st = { ...st, plan: [{ ...st.plan[0], kcal: "deficit" }] };
    const roles = dayRoleMap(st, st.plan[0], focusFor(st, st.plan[0], 1)!, 1).map((d) => d.role);
    st = { ...st, sessions: [sess(1, roles[0], 0, 60), sess(2, roles[0], 7, 60)] };
    const r = weekReview(st, st.plan[0], 2)!;
    expect(r.held).toEqual(["Bench Press"]);
    expect(reviewLine(r)).toContain("1 Übung gehalten");
  });
});

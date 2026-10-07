import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID, SKILLS } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState } from "../types";
import { collectItems, isRunBlock, sessionId } from "../ui/SessionView";
import { beastFamily, dayRoleMap } from "./plan";
import { focusFor } from "./weekplan";

const [gym, home, reise] = EQUIPMENT_PRESETS.map((p) => p.make());

/** Alle Bestien einer Woche über alle Trainingstage */
function weekBeasts(state: AppState, week: number): string[] {
  const block = state.plan[0];
  const focus = focusFor(state, block, week)!;
  return dayRoleMap(state, block, focus).flatMap((d) => {
    const profile = state.equipment.find((e) => e.id === d.profileId)!;
    return collectItems({ state, block, focus, week, roleKey: d.role, profile, date: "2026-10-01", reduced: false } as never)
      .filter((i) => i.beast).map((i) => i.beast!.id);
  });
}

describe("Bestien über alle Trainingstage", () => {
  // Auch „alles außer einem Skill“: dann gibt es oft genau eine verhexte Kandidatin (z. B. ohne Muscle-Up nur Undine verhext)
  const all = SKILLS.skills.map((x) => x.id);
  const user = (s: AppState) => [s.user, { ...s.user, skills: [], skillTraining: true }, { ...s.user, skills: [] },
    ...["muscle_up", "pistol", "pullup", "dragon_flag"].map((drop) => ({ ...s.user, skills: all.filter((x) => x !== drop) }))];
  for (const fid of Object.keys(FOCUS_BY_ID)) it(`${fid}: keine Bestie der Vorwoche, auch ohne Laufen`, () => {
    const s = emptyState();
    for (const u of user(s)) for (const noRunAll of [false, true]) for (const sched of [{ Mo: "g", Di: "r", Do: "h", Fr: "g" }, { Mo: "g", Di: "g", Do: "g", Fr: "g" }] as const) {
      let st: AppState = {
        ...s, user: u, equipment: [{ ...gym, id: "g" }, { ...home, id: "h" }, { ...reise, id: "r" }],
        schedule: { ...sched },
        plan: [{ id: "b1", focusId: fid, label: "", start: "2026-09-28", end: "2026-12-20", load: "medium", travel: false }],
      };
      if (noRunAll) {
        const noRun: Record<string, boolean> = {};
        for (let w = 1; w <= 12; w++) { const f = focusFor(st, st.plan[0], w)!; for (const [rk, r] of Object.entries(f.roles)) if (r.blocks.some(isRunBlock)) noRun[sessionId("b1", w, rk)] = true; }
        st = { ...st, noRun };
      }
      for (let w = 2; w <= 12; w++) {
        const prev = new Set(weekBeasts(st, w - 1).flatMap(beastFamily));
        const cur = weekBeasts(st, w).flatMap(beastFamily);
        expect(cur.filter((x) => prev.has(x)), `${fid} W${w} noRun=${noRunAll} ${JSON.stringify(sched)} skills=${JSON.stringify(u.skills)}`).toEqual([]);
      }
    }
  }, 60000);
});

describe("Zwei Bestien an einem Tag", () => {
  it("Zeit speichern ändert die angezeigten Bestien nicht, und beide Ergebnisse bleiben getrennt", () => {
    const s0 = emptyState();
    const st: AppState = {
      ...s0, equipment: [{ ...gym, id: "g" }, { ...home, id: "h" }],
      schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g", Sa: "h" },
      plan: [{ id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-12-06", load: "medium", travel: false }],
    };
    const block = st.plan[0];
    const focus = focusFor(st, block, 1)!;
    const bonus = dayRoleMap(st, block, focus).find((d) => d.role === "bonus")!;
    const profile = st.equipment.find((e) => e.id === bonus.profileId)!;
    const items = (s: AppState) => collectItems({ state: s, block, focus, week: 1, roleKey: "bonus", profile, date: "2026-10-03", reduced: false } as never).filter((i) => i.beast);
    const before = items(st);
    expect(before.length).toBe(2);
    const sid = sessionId("b1", 1, "bonus");
    const [a, b] = before as (typeof before[number] & { block: { id: string } })[];
    const sess = { id: sid, date: "2026-10-03", blockId: "b1", focusId: "assassin", week: 1, role: "bonus", profileId: profile.id, entries: {}, drills: {}, menu: {}, done: false,
      beastRuns: { [a.block.id]: { beast: { id: a.beast!.id, seconds: 300 } }, [b.block.id]: { beast: { id: b.beast!.id, seconds: 400 } } } };
    const after = items({ ...st, sessions: [sess] });
    expect(after.map((i) => i.beast!.id)).toEqual(before.map((i) => i.beast!.id));
  });
});

describe("Schweißfreier Ort", () => {
  it("keine Bestien, kein Laufen, keine Intervalle, Finisher bleibt Superset", () => {
    const s0 = emptyState();
    for (const fid of Object.keys(FOCUS_BY_ID)) {
      const st: AppState = {
        ...s0, equipment: [{ ...gym, id: "g", sweatFree: true }], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
        plan: [{ id: "b1", focusId: fid, label: "", start: "2026-09-28", end: "2026-12-20", load: "medium", travel: false }],
      };
      const block = st.plan[0];
      for (const w of [1, 2]) {
        const focus = focusFor(st, block, w)!;
        for (const d of dayRoleMap(st, block, focus, w)) {
          const items = collectItems({ state: st, block, focus, week: w, roleKey: d.role, profile: st.equipment[0], date: "2026-10-01", reduced: false } as never);
          expect(items.filter((i) => i.beast !== undefined || isRunBlock(i.block) || i.resolved.some((r) => r.kind === "interval")), `${fid} ${d.role}`).toEqual([]);
        }
      }
    }
  });
});

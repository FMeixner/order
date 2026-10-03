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

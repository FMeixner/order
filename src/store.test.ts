/* Alte Datenstände und Sicherungen: jede frühere Form muss sauber laden und weiterlaufen. */
import { describe, expect, it } from "vitest";
import v01 from "./fixtures/state-0.1.json";
import v020 from "./fixtures/state-0.20.json";
import v030 from "./fixtures/state-0.30.json";
import { migrate } from "./store";
import { chapterOf } from "./engine/saga";
import { weeklyVolume } from "./engine/volume";
import { freezePlan, dayRoleMap } from "./engine/plan";
import { focusFor } from "./engine/weekplan";
import { collectItems } from "./ui/SessionView";
import { allRuns } from "./engine/runs";
import type { AppState } from "./types";

const fixtures: [string, unknown][] = [["0.1", v01], ["0.20", v020], ["0.30", v030]];

describe("Alte Datenstände laden", () => {
  for (const [v, raw] of fixtures) it(`${v}: lädt, Plan, Einheiten, Flugblatt und Volumen laufen`, () => {
    const s = migrate(JSON.parse(JSON.stringify(raw)));
    expect(s.sessions.length).toBe((raw as AppState).sessions.length);
    expect(s.user.asym).toBeUndefined();
    expect(s.user.skillTraining).toBeUndefined();
    for (const e of s.equipment) expect(typeof e.has.sword).toBe("boolean");
    // hexed-Ids zusammengeführt
    for (const id of Object.keys(s.beastTimes)) expect(id).not.toMatch(/~hex:/);
    for (const se of s.sessions) for (const r of allRuns(se)) expect(r.id).not.toMatch(/~hex:/);
    const pb = s.plan[0];
    const st: AppState = { ...s, plan: freezePlan(s.plan, "2026-10-07") ?? s.plan };
    for (const w of [1, 2]) {
      const f = focusFor(st, pb, w)!;
      for (const d of dayRoleMap(st, pb, f, w)) {
        const profile = st.equipment.find((e) => e.id === d.profileId)!;
        expect(() => collectItems({ state: st, block: pb, focus: f, week: w, roleKey: d.role, profile, date: "2026-10-07", reduced: false } as never)).not.toThrow();
      }
    }
    expect(() => chapterOf(st, pb, "2026-10-07")).not.toThrow();
    expect(weeklyVolume(st, "2026-10-07").length).toBeGreaterThan(0);
  });
  it("0.1: Doppelmesser wird zum Schwert am Heim-Profil", () => {
    const s = migrate(JSON.parse(JSON.stringify(v01)));
    expect(s.equipment.find((e) => e.tier === "home")?.has.sword).toBe(true);
    expect(s.user.doppelmesser).toBeUndefined();
  });
  it("0.20: alle hexed-Fassungen teilen sich eine Bestzeit", () => {
    const s = migrate(JSON.parse(JSON.stringify(v020)));
    expect(s.beastTimes["ng-nanna~hex"].length).toBe(2);
  });
  it("Sicherung: aktueller Stand übersteht Export und Import unverändert", () => {
    const s = migrate(JSON.parse(JSON.stringify(v030)));
    const st = { ...s, plan: freezePlan(s.plan, "2026-10-07") ?? s.plan };
    expect(migrate(JSON.parse(JSON.stringify(st)))).toEqual(st);
  });
  it("kaputte Datei: leerer Stand statt Absturz", () => {
    expect(migrate(null).sessions).toEqual([]);
    expect(migrate("quatsch").onboarded).toBe(false);
  });
});

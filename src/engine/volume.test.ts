import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Session, UserProfile } from "../types";
import { roleSlots } from "./duration";
import { addDays, dayRoleMap, roleAt } from "./plan";
import { MUSCLES, maintenanceVolume, plannedVolume, volumeNow, volumeRange } from "./volume";
import { focusFor } from "./weekplan";

const user = (u: Partial<UserProfile> = {}): UserProfile => ({ level: "fortgeschritten", ...u }) as UserProfile;

it("Wachstumsbereich nach Erfahrung", () => {
  expect(volumeRange(user({ level: "einsteiger" }))).toEqual([6, 10]);
  expect(volumeRange(user({ level: "fortgeschritten" }))).toEqual([10, 16]);
  expect(volumeRange(user({ level: "erfahren" }))).toEqual([12, 20]);
  expect(volumeRange(user({ level: null }))).toEqual([10, 16]);
});

it("Eigener Richtwert schlägt die Erfahrung", () => {
  expect(volumeRange(user({ volumeRange: [8, 14] }))).toEqual([8, 14]);
});

it("Erhaltung: etwa die Hälfte des unteren Richtwerts", () => {
  expect(maintenanceVolume(user({ level: "einsteiger" }))).toBe(3);
  expect(maintenanceVolume(user({ level: "fortgeschritten" }))).toBe(5);
  expect(maintenanceVolume(user({ level: "erfahren" }))).toBe(6);
  expect(maintenanceVolume(user({ volumeRange: [9, 15] }))).toBe(4.5);
});

describe("Volumen Soll-Ist", () => {
  const [gym] = EQUIPMENT_PRESETS.map((p) => p.make());
  const base = (): AppState => {
    const s = emptyState();
    return { ...s, equipment: [{ ...gym, id: "g" }], schedule: { Mo: "g", Mi: "g", Fr: "g", Sa: "g" },
      plan: [{ id: "b1", focusId: "knight", label: "", start: "2026-11-09", end: "2026-12-20", load: "medium", travel: false }] };
  };
  it("geplant ≥ erledigt bei vollständiger Woche (alle festen Sätze abgehakt)", () => {
    const st = base();
    const b = st.plan[0];
    const f = focusFor(st, b, 1)!;
    const sessions: Session[] = dayRoleMap(st, b, f, 1).map((d, i) => {
      const role = roleAt(f.roles[d.role], st.equipment[0]);
      const entries: Session["entries"] = {};
      for (const r of roleSlots(role.blocks.filter((x) => !x.rotation || x.rotation === "A"), st.equipment[0]))
        if (r.kind === "strength" || r.kind === "hold") entries[r.key] = { key: r.key, slotId: r.slotId, name: r.name, prog: r.prog, sets: Array.from({ length: r.sets }, () => ({ done: true, reps: 10 })) };
      return { id: `s${i}`, date: addDays("2026-11-09", i), blockId: "b1", focusId: "knight", week: 1, role: d.role, profileId: "g", entries, drills: {}, done: true };
    });
    const done = { ...st, sessions };
    const planned = plannedVolume(done, b, 1)!;
    const now = volumeNow(done, "2026-11-15")!;
    expect(now.skip).toBeNull();
    for (const m of MUSCLES) expect(planned[m] ?? 0, m).toBeGreaterThanOrEqual((now.done[m] ?? 0) - 1e-9);
    expect(Object.values(planned).some((v) => v > 5)).toBe(true);
    expect(now.cardio.done).toBeLessThanOrEqual(now.cardio.planned);
  });
  it("Entlastung und Testwoche liefern kein Soll", () => {
    const st = { ...base(), deload: { "b1:2": "ja" as const } };
    expect(plannedVolume(st, st.plan[0], 2)).toBeNull();
    expect(volumeNow(st, "2026-11-17")!.skip).toBe("deload");
    const t = { ...st, plan: [{ ...st.plan[0], focusId: "test" }] };
    expect(plannedVolume(t, t.plan[0], 1)).toBeNull();
    expect(volumeNow(t, "2026-11-10")!.skip).toBe("test");
  });
  it("im Defizit: Band von Erhaltung bis zum unteren Richtwert", () => {
    const st = base();
    const d = { ...st, plan: [{ ...st.plan[0], kcal: "deficit" as const }] };
    expect(volumeNow(d, "2026-11-10")!.band).toEqual([5, 10]);
    expect(volumeNow(st, "2026-11-10")!.band).toEqual([10, 16]);
  });
});

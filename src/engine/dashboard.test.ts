import { describe, expect, it } from "vitest";
import { emptyState } from "../store";
import type { AppState } from "../types";
import { BEREICHE } from "./bereiche";
import { standOf } from "./dashboard";

const T = "2026-11-10";
const base = (): AppState => ({ ...emptyState(), onboarded: true, plan: [
  { id: "b1", focusId: "assassin", label: "", start: "2026-09-28", end: "2026-11-29", load: "medium", travel: false },
  { id: "t1", focusId: "test", label: "Testwoche", start: "2026-11-30", end: "2026-12-06", load: "medium", travel: false },
] });

describe("Stand (Dashboard)", () => {
  it("eine Zeile je Bereich; ohne Tests keine Punkte und keine Schwachstellen", () => {
    const s = standOf(base(), T);
    expect(s.rows.map((r) => r.def.id)).toEqual(BEREICHE.map((b) => b.id));
    expect(s.rows.every((r) => r.score == null && !r.weak)).toBe(true);
    expect(s.test).toBeNull();
    expect(s.nextTest?.id).toBe("t1");
  });
  it("mit Testwerten: Bilanz der letzten Testwoche und Punkte am Bereich", () => {
    const st = base();
    st.user = { ...st.user, sex: "m", birthYear: 1988, bodyweight: 80 } as AppState["user"];
    st.tests = { "t-cooper": [{ blockId: "t0", date: "2026-09-20", value: 1500, raw: "1500" }], "t-broad": [{ blockId: "t0", date: "2026-09-20", value: 170, raw: "170" }] } as AppState["tests"];
    const s = standOf(st, T);
    expect(s.test).toMatchObject({ blockId: "t0", date: "2026-09-20", tests: 2 });
    const ke = s.rows.find((r) => r.def.id === "aerob")!;
    expect(ke.score).not.toBeNull();
    expect(ke.score!).toBeGreaterThanOrEqual(0);
    expect(ke.score!).toBeLessThanOrEqual(100);
  });
});

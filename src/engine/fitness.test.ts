import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Feedback, PlanBlock, Session } from "../types";
import { checkpointDue, checkpointRelease, liftStand, loggedPacket, repEquivalent, repStand, saveCheckpoint } from "./fitness";
import { packetSize } from "./dose";
import { pinAutoSlots, slotsFor } from "./sharpen";

const sess = (date: string, entries: [string, { reps: number; weight?: number }[], Feedback?][]): Session => ({
  id: date, date, blockId: "b", focusId: "slayer", week: 1, role: "kraft_a", profileId: "g", done: true, drills: {},
  entries: Object.fromEntries(entries.map(([name, sets, fb]) => [name, { key: `x|${name}`, slotId: "x", name, prog: "double", feedback: fb, sets: sets.map((s) => ({ done: true, reps: s.reps, weight: s.weight ?? null })) }])),
} as unknown as Session);
const base = (sessions: Session[]): AppState => { const s = emptyState(); return { ...s, user: { ...s.user, sex: "m", birthYear: 1988, bodyweight: 80 }, sessions }; };
const T = "2026-11-13";

describe("Laufender Stand aus dem Log (1.47)", () => {
  it("Kraft: Maximum je Übung mit Reserve aus der Bewertung, Trend gegen 6 Wochen davor", () => {
    const st = base([sess("2026-09-20", [["Bench Press", [{ reps: 8, weight: 80 }], "ok"]]), sess("2026-11-10", [["Bench Press", [{ reps: 8, weight: 85 }], "ok"]])]);
    const [l] = liftStand(st, T);
    expect(l.name).toBe("Bench Press");
    expect(l.now).toBe(Math.round(85 * (1 + 10 / 30)));
    expect(l.change).toBe("better");
    // „zu schwer“ heißt keine Reserve
    const hard = liftStand(base([sess("2026-11-10", [["Bench Press", [{ reps: 8, weight: 85 }], "zuschwer"]])]), T)[0];
    expect(hard.now).toBe(Math.round(85 * (1 + 8 / 30)));
  });
  it("Kraftausdauer: Leiterstufe und Weste in Klimmzug- bzw. Liegestütz-Äquivalenten, mit Norm", () => {
    // Ring Row (0,55 KG) ist leichter als ein Klimmzug: 20 Wdh ergeben wenige Klimmzüge
    const rr = repEquivalent("Ring Row", 20, 2, 0, 80)!;
    expect(rr.fam).toBe("pullup");
    expect(rr.reps).toBeLessThan(5);
    // Weste macht Liegestütze schwerer: mehr Äquivalente als ohne
    const plain = repEquivalent("Push-Up", 10, 2, 0, 80)!.reps;
    const vest = repEquivalent("Push-Up", 10, 2, 10, 80)!.reps;
    expect(plain).toBe(12);
    expect(vest).toBeGreaterThan(plain);
    const st = base([sess("2026-11-10", [["Push-Up", [{ reps: 25 }], "ok"]])]);
    const r = repStand(st, T).find((x) => x.fam === "pushup")!;
    expect(r.reps).toBe(27);
    expect(r.norm).not.toBeNull();
  });
  it("Päckchen für Bestien aus dem Log: 60 % des geschätzten Maximums, vor dem alten Testwert", () => {
    const st = { ...base([sess(new Date().toISOString().slice(0, 10), [["Push-Up", [{ reps: 23 }], "ok"]])]), tests: { "t-pushups": [{ date: "2026-01-01", blockId: "t", value: 50, raw: "50" }] } };
    expect(loggedPacket(st, "t-pushups", new Date().toISOString().slice(0, 10))).toBe(15);
    expect(packetSize("Push-ups", st.user, st)).toBe(15);
  });
});

describe("Checkpoints und Freigabe des Schwerpunkts (1.47)", () => {
  const b: PlanBlock = { id: "b1", focusId: "slayer", label: "", start: "2026-09-01", end: "2026-12-31", load: "medium", travel: false };
  it("fällig ab vier Wochen in der Phase, dann alle vier Wochen", () => {
    const st = base([]);
    expect(checkpointDue(st, b.start, "power", "2026-09-20")).toBe(false);
    expect(checkpointDue(st, b.start, "power", "2026-09-29")).toBe(true);
    const st2 = saveCheckpoint(st, "t-broad", b.id, 220, "220", "2026-09-29");
    expect(checkpointDue(st2, b.start, "power", "2026-10-10")).toBe(false);
    expect(checkpointDue(st2, b.start, "power", "2026-10-27")).toBe(true);
    expect(checkpointDue(st, b.start, "aerob", "2026-12-01")).toBe(false);
  });
  it("zweimal in Folge besser als die Testwoche: Bereich frei, der nächste rückt nach", () => {
    const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
    let st: AppState = { ...base([]), equipment: [g], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as AppState["schedule"], plan: [{ ...b, sharpenAuto: { domain: "power", purpose: "defizit", reason: "x" } }],
      tests: { "t-broad": [{ date: "2026-08-25", blockId: "t", value: 200, raw: "200" }] } };
    expect(slotsFor(st, st.plan[0]).s1.domain).toBe("power");
    st = saveCheckpoint(st, "t-broad", b.id, 210, "210", "2026-09-29");
    expect(checkpointRelease(st, b.id, b.start, "power")).toBeNull();
    st = saveCheckpoint(st, "t-broad", b.id, 214, "214", "2026-10-27");
    expect(checkpointRelease(st, b.id, b.start, "power")).toMatch(/zweimal in Folge/);
    const next = pinAutoSlots(st, "2026-10-28")!;
    expect(next.plan[0].sharpenReleased).toEqual(["power"]);
    expect(next.plan[0].sharpenAuto?.domain).not.toBe("power");
    expect(slotsFor(next, next.plan[0]).s1.domain).not.toBe("power");
    // innerhalb des Messfehlers: bleibt
    let flat = saveCheckpoint({ ...st, checkpoints: {} }, "t-broad", b.id, 203, "203", "2026-09-29");
    flat = saveCheckpoint(flat, "t-broad", b.id, 204, "204", "2026-10-27");
    expect(checkpointRelease(flat, b.id, b.start, "power")).toBeNull();
  });
});

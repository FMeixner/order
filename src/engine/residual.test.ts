import { describe, expect, it } from "vitest";
import { FLOWS, FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { AppState, Block, Focus, PlanBlock, Session, SessionEntry } from "../types";
import { CLOCKS, residualClocks, sessionHits, sharpenClock, slotClocks, type ClockId } from "./residual";

const T = "2026-11-04"; // Mittwoch

const base = (sessions: Session[], plan: PlanBlock[] = []): AppState => ({ ...emptyState(), sessions, plan });
const sess = (over: Partial<Session>): Session => ({
  id: "s1", date: T, blockId: "b1", focusId: "slayer", week: 1, role: "kraft_a", profileId: "g",
  entries: {}, drills: {}, done: true, ...over,
});

/** Erster Einzel-Slot der Slayer-Kraft-Rolle, als abgehakter Satz */
const slayerEntry = (): SessionEntry => {
  const f = FOCUS_BY_ID.slayer;
  // erste Übung der Rolle, ob einzeln oder im Superset
  const b = f.roles.kraft_a.blocks.find((x) => x.type === "single" || x.type === "superset")!;
  const slot = b.type === "single" ? b.slot : (b as Extract<Block, { type: "superset" }>).slots[0];
  return { key: `${slot.id}|${slot.name}`, slotId: slot.id, name: slot.name, prog: "none", sets: [{ done: true, reps: 1 }] };
};

describe("Residual-Uhren", () => {
  it("führt sieben Uhren mit den Budgets der Architektur", () => {
    expect(CLOCKS.map((c) => `${c.id}:${c.budget}`).join(" ")).toBe("schnellkraft:7 ke:14 anaerob:14 aerob:21 mobility:21 sehnen:21 kraft:30");
    expect(CLOCKS.map((c) => c.name).join("|")).toBe("Sprungkraft & Schnelligkeit|Kraftausdauer|Anaerob|Ausdauer (aerob)|Beweglichkeit|Sehnen & Bindegewebe|Kraft & Masse");
  });

  it("setzt eine Bestie ohne Sprintanteil für Kraftausdauer und Anaerob", () => {
    const s = sess({ beast: { id: "ng-skadi", seconds: 600 } }); // Pushups, Squats, Rows, Leg Raises
    const hits = sessionHits(base([s]), s);
    expect(hits.has("ke")).toBe(true);
    expect(hits.has("anaerob")).toBe(true);
    expect(hits.has("schnellkraft")).toBe(false);
  });

  it("erkennt Sprints und Sprünge in der Bestie als Sprungkraft-Reiz", () => {
    const s = sess({ beast: { id: "ng-vidar", seconds: 600 } }); // enthält 2x40m Sprints
    const hits = sessionHits(base([s]), s);
    expect(hits.has("schnellkraft")).toBe(true);
    expect(hits.has("ke")).toBe(true);
  });

  it("ordnet Slot-Arten zu: Kraft, Sehnen, Ausdauer, Intervalle, Kontrast-Explosivteil", () => {
    const blocks: Block[] = [
      { type: "single", slot: { id: "a", name: "Squat" } },
      { type: "single", slot: { id: "b", name: "Wall Sit", kind: "hold", hold: 45 } },
      { type: "single", slot: { id: "c", name: "Laufen", kind: "timer", minutes: 20 } },
      { type: "single", slot: { id: "d", name: "Intervalle", kind: "interval", interval: { work: 30, rest: 60, rounds: 8 } } },
      { type: "contrast", heavy: { id: "e", name: "Squat schwer", sets: 3 }, explosive: { id: "f", name: "Jump Squat", sets: 3 } },
    ];
    const m = slotClocks(blocks);
    expect(m.get("a")).toBe("kraft");
    expect(m.get("b")).toBe("sehnen");
    expect(m.get("c")).toBe("aerob");
    expect(m.get("d")).toBe("anaerob");
    expect(m.get("e")).toBe("kraft");
    expect(m.get("f")).toBe("schnellkraft");
  });

  it("bildet Schwerpunkt-Bereiche auf Uhren ab; Kraft und Skill haben keine", () => {
    expect(sharpenClock("speed")).toBe("schnellkraft");
    expect(sharpenClock("power")).toBe("schnellkraft");
    for (const d of ["ke", "anaerob", "aerob", "mobility"] as const) expect(sharpenClock(d)).toBe(d);
    expect(sharpenClock("strength")).toBeNull();
    expect(sharpenClock("skill")).toBeNull();
  });

  it("setzt einen abgehakten Satz über die Rolle des Ordens", () => {
    const s = sess({ entries: { x: slayerEntry() } });
    const hits = sessionHits(base([s]), s);
    expect(hits.has("kraft")).toBe(true);
  });

  it("setzt ein Schwerpunkt-Modul die Uhr seines Bereichs — auch in einer eingefrorenen Fassung", () => {
    const f0 = FOCUS_BY_ID.slayer;
    const role = f0.roles.kraft_a;
    const mod = { type: "module", module: "sharpen", variant: "speed" } as const;
    const f: Focus = { ...f0, roles: { ...f0.roles, kraft_a: { ...role, blocks: [...role.blocks, mod] } } };
    const plan: PlanBlock[] = [{ id: "b1", focusId: "slayer", start: "2026-10-05", end: "2026-11-16", label: "", load: "medium", travel: false, frozen: { at: "2026-10-05", foci: { slayer: f } } }];
    const s = sess({ drills: { "sh-sp-1": [true] } });
    const hits = sessionHits(base([s], plan), s);
    expect(hits.has("schnellkraft")).toBe(true);
  });

  it("setzt ein Flow-Modul die Beweglichkeits-Uhr", () => {
    const f = FOCUS_BY_ID.acrobat;
    const rk = Object.keys(f.roles).find((k) => f.roles[k].blocks.some((b) => b.type === "module" && b.module === "flow"))!;
    const mod = f.roles[rk].blocks.find((b): b is Extract<Block, { type: "module" }> => b.type === "module" && b.module === "flow")!;
    const s = sess({ focusId: "acrobat", role: rk, drills: { [FLOWS[mod.variant].drills[0].id]: [true] } });
    const hits = sessionHits(base([s]), s);
    expect(hits.has("mobility")).toBe(true);
  });

  it("zählt Warm-up-Übungen nicht als Reiz", () => {
    const s = sess({ drills: { "wu-9090": [true] } });
    const hits = sessionHits(base([s]), s);
    expect(hits.size).toBe(0);
  });

  it("zählt die freie Jagd wie jede Bestie, ohne Slot-Credits", () => {
    const s = sess({ blockId: "jagd", beast: { id: "ng-skadi", seconds: 300 } });
    const hits = sessionHits(base([s]), s);
    expect(hits.has("ke")).toBe(true);
    expect(hits.has("anaerob")).toBe(true);
    expect(hits.size).toBe(2);
  });

  it("rotiert die Uhren nach Budget: frisch, über, noch nie", () => {
    const cs = residualClocks(base([
      sess({ date: "2026-11-01", beast: { id: "ng-skadi", seconds: 600 } }),
      sess({ date: "2026-10-04", entries: { x: slayerEntry() } }), // 31 Tage her
    ]), T);
    const by = (id: ClockId) => cs.find((c) => c.id === id)!;
    expect(by("ke").days).toBe(3);
    expect(by("ke").over).toBe(false);
    expect(by("kraft").days).toBe(31);
    expect(by("kraft").over).toBe(true);
    expect(by("schnellkraft").days).toBeNull();
    expect(by("schnellkraft").over).toBe(true); // „noch nie“ ist rot, sobald überhaupt Daten da sind
  });

  it("hält 29 Tage Kraft im Budget und ignoriert offene und zukünftige Einheiten", () => {
    const cs = residualClocks(base([sess({ date: "2026-10-06", entries: { x: slayerEntry() } })]), T);
    const kraft = cs.find((c) => c.id === "kraft")!;
    expect(kraft.days).toBe(29);
    expect(kraft.over).toBe(false);
    const cs2 = residualClocks(base([
      sess({ date: "2026-11-03", done: false, beast: { id: "ng-skadi", seconds: 300 } }),
      sess({ date: "2026-11-10", beast: { id: "ng-skadi", seconds: 300 } }),
    ]), T);
    expect(cs2.every((c) => c.days === null && !c.over)).toBe(true);
  });
});

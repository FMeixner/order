import { describe, expect, it } from "vitest";
import { CALLS, FOCI } from "../data";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import type { Block } from "../types";
import { callLevel, callSeconds, callView, nextCue, nextGap } from "./call";

const user = emptyState().user;
const gym = EQUIPMENT_PRESETS[0].make();
const noSword = { ...gym, has: { ...gym.has, sword: false } };
const withSword = { ...gym, has: { ...gym.has, sword: true } };
const mod = (variant: string, extra: Partial<Extract<Block, { type: "module" }>> = {}): Extract<Block, { type: "module" }> => ({ type: "module", module: "call", variant, ...extra });

describe("Ansage-Drill", () => {
  it("jede Variante: Stufen mit Ansagen, sinnvoller Takt", () => {
    for (const [id, d] of Object.entries(CALLS)) {
      expect(d.levels.length, id).toBeGreaterThan(0);
      for (const l of d.levels) expect(l.cues.length, `${id}/${l.name}`).toBeGreaterThanOrEqual(2);
      expect(d.gap[0]).toBeGreaterThanOrEqual(1);
      expect(d.gap[1]).toBeGreaterThan(d.gap[0]);
      if (d.fallback) expect(CALLS[d.fallback], id).toBeTruthy();
      if (d.path) expect(d.tool).toBe("sword");
    }
  });
  it("Stufe nach Woche: der Pool wächst, die neueste Stufe öfter", () => {
    const d = CALLS.schritte;
    expect(callLevel(d, user, 1)).toBe(0);
    expect(callLevel(d, user, 3)).toBe(1);
    expect(callLevel(d, user, 8)).toBe(2);
    const v = callView(mod("schritte"), user, 5, gym)!;
    for (const l of d.levels) for (const c of l.cues) expect(v.pool).toContain(c);
    expect(v.pool.filter((c) => c === d.levels[2].cues[0]).length).toBe(2);
  });
  it("Klinge folgt dem Schwert-Lernweg: ohne Skills nur die Hiebe", () => {
    const v = callView(mod("klinge"), { ...user, skills: [] }, 9, withSword)!;
    expect(v.level).toBe(0);
    expect(new Set(v.pool)).toEqual(new Set(CALLS.klinge.levels[0].cues));
    const v2 = callView(mod("klinge"), { ...user, skills: ["schwert_hiebe"] }, 1, withSword)!;
    expect(v2.level).toBe(1);
  });
  it("ohne Schwert und Stock: Ersatz oder entfällt", () => {
    const v = callView(mod("klinge"), user, 1, noSword)!;
    expect(v.variant).toBe("schritte");
    expect(v.replaced).toBe(CALLS.klinge.name);
    expect(callView(mod("stab"), user, 1, noSword)).toBeNull();
    expect(callSeconds(mod("stab"), noSword)).toBe(0);
    expect(callSeconds(mod("klinge"), noSword)).toBe(callSeconds(mod("schritte"), noSword));
  });
  it("Kurztag halbiert die Runden, Entlastung eine weniger, nie unter zwei", () => {
    const d = CALLS.schritte;
    expect(callView(mod("schritte", { short: true }), user, 1, gym)!.rounds).toBe(Math.max(2, Math.ceil(d.rounds / 2)));
    expect(callView(mod("schritte"), user, 1, gym, { deload: true })!.rounds).toBe(Math.max(2, d.rounds - 1));
    expect(callSeconds(mod("schritte"))).toBe(d.rounds * d.work + (d.rounds - 1) * d.rest + 30);
  });
  it("nie zweimal dieselbe Ansage hintereinander, Abstand im Takt", () => {
    const pool = ["A", "B", "C"];
    let prev: string | null = null;
    for (let i = 0; i < 200; i++) { const c = nextCue(pool, prev); expect(c).not.toBe(prev); prev = c; }
    for (let i = 0; i < 50; i++) { const g = nextGap(CALLS.schritte); expect(g).toBeGreaterThanOrEqual(1500); expect(g).toBeLessThanOrEqual(4000); }
  });
  it("in den Orden: Scout, Skirmisher, Pugilist, King", () => {
    const uses = (id: string) => FOCI.find((f) => f.id === id)!.roles && Object.values(FOCI.find((f) => f.id === id)!.roles).some((r) => r.blocks.some((b) => b.type === "module" && b.module === "call"));
    for (const id of ["scout", "skirmisher", "pugilist", "king"]) expect(uses(id), id).toBe(true);
  });
});

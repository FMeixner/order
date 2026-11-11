import { describe, expect, it } from "vitest";
import { explosiveViolations, KNOWN } from "../../scripts/explosive.mjs";
import { FOCI, FOCUS_BY_ID } from "../data";
import type { Focus } from "../types";

describe("Explosives vor Ausdauer (1.32)", () => {
  it("Gladiator „Spiel“: Shuttle → Pogo Hops + Skater Jumps → Medizinball → Sprint oder Seilspringen", () => {
    const names = FOCUS_BY_ID.gladiator.roles.spiel.blocks.map((b) => (b.type === "single" ? b.slot.name : b.type === "superset" ? b.slots.map((s) => s.name).join(" + ") : b.type));
    expect(names).toEqual(["5-10-5 Shuttle", "Pogo Hops + Skater Jumps", "Medicine Ball Chest Pass", "Sprint oder Seilspringen 10 × 30 s"]);
    expect(explosiveViolations(FOCUS_BY_ID.gladiator)).toEqual([]);
  });
  it("alle Orden: nur die bekannten Fälle (Ausnahmeliste, Kuration des Nutzers)", () => {
    const found = FOCI.flatMap((f) => explosiveViolations(f).map((v) => `${f.id} | ${v.key}`));
    expect(found.sort()).toEqual([...KNOWN].sort());
  });
  it("erkennt Bestie, Intervall und Lauf vor Sprung, Wurf oder Sprint, je A/B-Woche", () => {
    const f = { ...FOCUS_BY_ID.knight, roles: {
      a: { name: "A", location: "home", minutes: 30, blocks: [{ type: "beast", id: "x" }, { type: "single", slot: { id: "j", name: "Box Jump", sets: 3, reps: "5" } }] },
      b: { name: "B", location: "home", minutes: 30, blocks: [{ type: "single", slot: { id: "j", name: "Box Jump", sets: 3, reps: "5" } }, { type: "single", slot: { id: "r", name: "Lockerer Lauf", kind: "timer", minutes: 20 } }] },
      c: { name: "C", location: "home", minutes: 30, blocks: [{ type: "single", rotation: "B", slot: { id: "i", name: "Intervalle 6 × 1 Min", kind: "interval", interval: { work: 60, rest: 60, rounds: 6 } } }, { type: "single", slot: { id: "t", name: "Medicine Ball Slam", sets: 3, reps: "8" } }] },
    }, high_load: undefined } as unknown as Focus;
    const v = explosiveViolations(f);
    expect(v.map((x) => [x.role, x.week])).toEqual([["a", "A"], ["c", "B"]]);
  });
});

describe("Falke: nach einem Sprungtag keine uralte oder verfluchte Bestie", () => {
  it("Seil-Tag nach dem Reaktionstag (Sprünge, Würfe) im Falken", async () => {
    const { EQUIPMENT_PRESETS, emptyState } = await import("../store");
    const { afterExplosiveDay, dayRoleMap, pickBeast, beastClass, beastMinutes } = await import("./plan");
    const { focusFor } = await import("./weekplan");
    const s = emptyState();
    const pb = { id: "b1", focusId: "scout", label: "", start: "2026-11-02", end: "2026-12-27", load: "medium" as const, travel: false, klammer: "athletik" as const, meso: "m" };
    const st = { ...s, equipment: [{ ...EQUIPMENT_PRESETS[1].make(), id: "h" }], schedule: { Mo: "h", Di: "h", Do: "h", Fr: "h" }, plan: [pb] };
    const f = focusFor(st, pb, 1)!;
    const days = dayRoleMap(st, pb, f, 1);
    expect(days.find((d) => d.role === "reaktion")?.day).toBe("Mo");
    expect(days.find((d) => d.role === "seil")?.day).toBe("Di");
    expect(afterExplosiveDay(st, pb, 1, "sc-s-bst")).toBe(true);
    expect(afterExplosiveDay(st, { ...pb, klammer: undefined }, 1, "sc-s-bst")).toBe(false);
    // Auch wenn der Block selbst uralte Bestien zuließe
    const b = pickBeast({ type: "beast", id: "sc-s-bst", classes: ["uralte", "verfluchte"] }, { blockId: "b1", week: 1, profile: st.equipment[0], state: st, reduced: false, downgrade: false });
    if (b) expect(["uralte", "verfluchte"]).not.toContain(beastClass(beastMinutes(b, undefined).min));
  });
});

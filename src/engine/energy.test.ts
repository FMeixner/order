import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState } from "../types";
import { beastClass, drillPool, pickBeast, roleDrills } from "./plan";
import { focusFor } from "./weekplan";
import { estimateRole } from "./duration";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
const home = { ...EQUIPMENT_PRESETS[1].make(), id: "h" };
function assassin(extra: Partial<AppState> = {}): AppState {
  const s = emptyState();
  return {
    ...s, equipment: [gym, home], schedule: { Mo: "g", Di: "g", Mi: "h", Do: "h", Fr: "g" },
    plan: [{ id: "b1", focusId: "assassin", label: "x", start: "2026-09-21", end: "2026-11-29", load: "high", travel: false }],
    ...extra,
  };
}
const beastBlocks = (s: AppState, rk: string) => focusFor(s, s.plan[0], 1)!.roles[rk].blocks.filter((b) => b.type === "beast");

describe("Warm-up und Cool-down anpassen", () => {
  it("entfernt und ergänzt dauerhaft für diesen Tag, die Dauer folgt", () => {
    const s0 = assassin();
    const r0 = focusFor(s0, s0.plan[0], 1)!.roles.kraft_a;
    const wu0 = roleDrills(r0, "wu", gym, s0.user, 1);
    const extra = drillPool("wu", gym).find((d) => !wu0.some((x) => x.id === d.id))!;
    const s = assassin({ drillEdits: { "assassin:kraft_a": { wu: { off: [wu0[0].id], add: [extra.id] } } } });
    const r = focusFor(s, s.plan[0], 1)!.roles.kraft_a;
    const wu = roleDrills(r, "wu", gym, s.user, 1);
    expect(wu.some((d) => d.id === wu0[0].id)).toBe(false);
    expect(wu.at(-1)!.id).toBe(extra.id);
    // anderer Tag bleibt unberührt
    expect(roleDrills(focusFor(s, s.plan[0], 1)!.roles.kraft_b, "wu", gym, s.user, 1)).toEqual(roleDrills(focusFor(s0, s0.plan[0], 1)!.roles.kraft_b, "wu", gym, s0.user, 1));
    // alles entfernt: Warm-up kürzer
    const sAll = assassin({ drillEdits: { "assassin:kraft_a": { wu: { off: wu0.map((d) => d.id), add: [] } } } });
    expect(estimateRole(focusFor(sAll, sAll.plan[0], 1)!.roles.kraft_a, gym).warmup).toBe(0);
  });
  it("Cool-down-Katalog und Warm-up-Katalog sind getrennt", () => {
    const cd = drillPool("cd"), wu = drillPool("wu");
    expect(cd.length).toBeGreaterThan(0);
    expect(cd.some((d) => wu.some((w) => w.id === d.id))).toBe(false);
  });
});

describe("Bestien an Tag 5 und Energie", () => {
  it("−1 Satz ändert die Plagen am Bonustag nicht", () => {
    const s = assassin();
    for (const b of beastBlocks(s, "bonus")) for (let w = 1; w <= 9; w++) {
      if (b.type !== "beast") continue;
      const o = { blockId: "b1", week: w, profile: home, state: s, downgrade: false };
      expect(pickBeast(b, { ...o, reduced: true })?.id).toBe(pickBeast(b, { ...o, reduced: false })?.id);
    }
  });
  it("viel Energie: Bestie eine Klasse länger, bei −1 Satz wirkungslos", () => {
    const s = assassin();
    let longer = 0;
    for (const b of beastBlocks(s, "bonus")) for (let w = 1; w <= 9; w++) {
      if (b.type !== "beast") continue;
      const o = { blockId: "b1", week: w, profile: home, state: s, downgrade: false, reduced: false };
      const n = pickBeast(b, o)!, x = pickBeast(b, { ...o, boost: true })!;
      expect(beastClass(n.minutes)).toBe("plage");
      if (x.minutes > n.minutes) longer++;
      expect(pickBeast(b, { ...o, reduced: true, boost: true })?.id).toBe(pickBeast(b, { ...o, reduced: true })?.id);
    }
    expect(longer).toBeGreaterThan(12);
  });
});

describe("Defizit braucht Griffe", () => {
  it("ohne Griffe: Banded Push-Up, ohne Band: Push-Up mit einem Satz mehr", async () => {
    const { resolveSlot } = await import("./resolve");
    const reise = EQUIPMENT_PRESETS[2].make();
    const slot = { id: "t", name: "Deficit Push-Up", sets: 3, reps: "AMRAP", prog: "reps" as const };
    const bare = { ...reise, dumbbells: [], kettlebells: [], has: { ...reise.has, rings: false, handles: false } };
    expect(resolveSlot(slot, { ...bare, bands: ["leicht"] })).toMatchObject({ name: "Banded Push-Up", sets: 3, missingEquipment: false });
    expect(resolveSlot(slot, { ...bare, bands: [] })).toMatchObject({ name: "Push-Up", sets: 4, missingEquipment: false });
    expect(resolveSlot(slot, { ...bare, has: { ...bare.has, handles: true } })?.name).toBe("Deficit Push-Up");
    expect(resolveSlot(slot, { ...bare, has: { ...bare.has, rings: true } })?.name).toBe("Deficit Push-Up");
    // Leiter: Stufe wird getauscht, Länge bleibt
    const lad = { id: "l", name: "Push-Up", sets: 3, reps: "10-25", prog: "ladder" as const, ladder: ["Push-Up", "Deficit Push-Up", "Archer Push-Up"] };
    expect(resolveSlot(lad, { ...bare, bands: [], tier: "gym" as const })?.ladder).toEqual(["Push-Up", "Push-Up", "Archer Push-Up"]);
  });
});

import { describe, expect, it } from "vitest";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { focusFor } from "./weekplan";
import { slotsOf } from "./shortday";

// 1.51.5 (Friedrich): Donnerstag fällt aus → der Kontrast-Freitag blieb ein zerlegter „Ganzkörper“-Tag mit Liegestützen
describe("Slayer: Donnerstag fällt aus", () => {
  const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" }, h = { ...EQUIPMENT_PRESETS[1].make(), id: "h" };
  const b = { id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false };
  const base = { ...emptyState(), equipment: [g, h], plan: [b], schedule: { Mo: "g", Di: "g", Mi: null, Do: "h", Fr: "g", Sa: "h", So: null },
    roleOrder: { b1: ["kraft_a", "arme_kurz", "home_hypertrophie", "kraft_contrast", "wochenende_kondition"] } } as never as ReturnType<typeof emptyState>;
  const st = { ...base, dayAdj: { "b1:1:home_hypertrophie": { skip: true } } } as never;
  const before = focusFor(base, b as never, 1)!, after = focusFor(st, b as never, 1)!;
  it("Freitag bleibt der Kontrasttag, ohne Liegestütze obendrauf", () => {
    expect(after.roles.kraft_contrast.blocks).toEqual(before.roles.kraft_contrast.blocks);
  });
  it("der freiwillige Samstag übernimmt nichts", () => {
    expect(after.roles.wochenende_kondition.blocks.flatMap(slotsOf).map((s) => s.name)).toEqual(before.roles.wochenende_kondition.blocks.flatMap(slotsOf).map((s) => s.name));
  });
  it("kein Schwerpunkt auf dem ausgefallenen Tag; der Bericht nennt, was entfällt", () => {
    const thu = after.roles.home_hypertrophie;
    expect(thu.blocks).toEqual([]);
    expect(thu.skipped?.dropped).toEqual(expect.arrayContaining(["Deficit Push-Up", "Ring Row", "Bestie"]));
  });
});

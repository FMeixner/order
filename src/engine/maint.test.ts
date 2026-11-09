import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { musclesOf } from "./volume";
import { isStrength } from "./slots";
import { shapeFocus } from "./weekplan";
import { defaultRoles } from "./plan";
import type { Block, Slot } from "../types";

/* Erhaltungsdosis (1.15): Jeder Orden hält jeden großen Muskel mit mindestens 4 harten Sätzen pro Woche
   und die Arme mit mindestens 2 (direkt oder über Drücken und Ziehen) — bei vier und bei drei Trainingstagen.
   Grundlage: Spiering et al. (2021), Bickel et al. (2011). Bestien zählen nicht mit. */
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const BIG = ["Brust", "Rücken", "Schultern", "Quadrizeps", "Gesäß", "Beinbeuger"], ARM = ["Bizeps", "Trizeps"];
describe("Erhaltungsdosis in jedem Orden", () => {
  for (const f0 of Object.values(FOCUS_BY_ID)) {
    if (f0.medley?.length) continue;
    for (const n of [4, 3]) it(`${f0.id} (${n} Tage)`, () => {
      const f = shapeFocus(f0, n); const v: Record<string, number> = {};
      for (const rk of defaultRoles(f, n)) for (const b of f.roles[rk].blocks) { if (b.rotation === "B") continue; for (const s of slotsOf(b)) { if (!isStrength(s) || s.rotation === "B") continue; for (const [m, x] of Object.entries(musclesOf(s.name))) v[m] = (v[m] ?? 0) + x * (s.sets ?? 3); } }
      const low = [...BIG.filter((m) => (v[m] ?? 0) < 4), ...ARM.filter((m) => (v[m] ?? 0) < 2)];
      expect(low.map((m) => `${m} ${(v[m] ?? 0).toFixed(1)}`)).toEqual([]);
    });
  }
});

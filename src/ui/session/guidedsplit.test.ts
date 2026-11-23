import { describe, expect, it } from "vitest";
import { FOCI } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { collectItems } from "./items";

// 1.51.7 (Friedrich): Bei hoher Alltagslast wurden freie Übungen erst nach der Superset-Prüfung geführt getauscht —
// so standen zwei Maschinen im Superset. Jetzt erst tauschen, dann prüfen.
describe("Nie zwei Maschinen oder Kabel im Superset, auch nicht nach geführtem Tausch", () => {
  const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
  for (const f of FOCI) it(f.id, () => {
    const b = { id: "b1", focusId: f.id, label: "", start: "2026-11-16", end: "2027-01-24", load: "high" as const, travel: false };
    const st = { ...emptyState(), equipment: [gym], plan: [b] };
    for (const rk of Object.keys(f.roles)) for (const week of [1, 2]) {
      const items = collectItems({ state: st, block: b, focus: f, week, roleKey: rk, profile: gym, date: "2026-11-20", reduced: false } as never);
      for (const it of items) if (it.block.type === "superset" && !it.block.sameStation) {
        const fixed = it.resolved.filter((r) => r.equip === "machine" || r.equip === "cable");
        expect(fixed.length, `${rk}: ${it.resolved.map((r) => r.name).join(" + ")}`).toBeLessThan(2);
      }
    }
  });
});

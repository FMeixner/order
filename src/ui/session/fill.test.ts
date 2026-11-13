import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { applySlots } from "../../engine/sharpen";
import { collectItems } from "./items";
import type { PlanBlock } from "../../types";

const [gym, home, reise] = EQUIPMENT_PRESETS.map((p) => p.make());
const mk = (focusId: string, extra: Partial<PlanBlock> = {}) => {
  const s = emptyState();
  const b: PlanBlock = { id: "b1", focusId, label: "", start: "2026-11-16", end: "2027-01-24", load: "medium", travel: false, ...extra };
  return { st: { ...s, equipment: [{ ...gym, id: "g" }, { ...home, id: "h" }, { ...reise, id: "r" }], schedule: { Mo: "g", Di: "r", Do: "h", Fr: "g" } as typeof s.schedule, plan: [b] }, b };
};
const markers = (f: ReturnType<typeof applySlots>) => Object.values(f.roles).flatMap((r) => r.blocks).filter((x) => x.type === "module" && x.module === "sharpen" && x.variant === "ordensziel").length;

describe("Mehr vom Ordensziel", () => {
  it("nur, wenn Automatisch keinen Schwerpunkt findet: nicht bei „Aus“, nicht bei eigenem Schwerpunkt, auch bei kurzen Orden, nicht bei Harlequin", () => {
    const { st, b } = mk("knight");
    expect(markers(applySlots(FOCUS_BY_ID.knight, st, b))).toBe(0); // Automatisch findet einen Schwerpunkt
    const off = mk("knight", { sharpen: "off" });
    expect(markers(applySlots(FOCUS_BY_ID.knight, off.st, off.b))).toBe(0);
    const h = mk("harlequin");
    expect(markers(applySlots(FOCUS_BY_ID.smith, h.st, h.b))).toBe(0);
    // Kurze Orden ohne Slot: ein Platzhalter; mit „Aus“ (auch über „Für diesen Orden entfernen“) keiner
    const k = mk("king");
    expect(markers(applySlots(FOCUS_BY_ID.king, k.st, k.b))).toBe(1);
    const koff = mk("king", { sharpen: "off" });
    expect(markers(applySlots(FOCUS_BY_ID.king, koff.st, koff.b))).toBe(0);
  });
  it("Junk-Grenze: Platzhalter ohne Inhalt fällt aus der Einheit; mit Inhalt trägt die Karte die Überschrift", () => {
    const { st, b } = mk("knight");
    const f = FOCUS_BY_ID.knight;
    const role = "lower_b";
    const withMarker = { ...f, roles: { ...f.roles, [role]: { ...f.roles[role], blocks: [...f.roles[role].blocks, { type: "module" as const, module: "sharpen" as const, variant: "ordensziel" }] } } };
    const items = collectItems({ state: st, block: b, focus: withMarker, week: 1, roleKey: role, profile: st.equipment[0], date: "2026-11-16", reduced: false } as never);
    const fill = items.find((x) => x.fill);
    // Entweder ein echter Zusatz mit Überschrift oder gar nichts (kein leerer Block)
    if (fill) expect(fill.fill).toMatch(/^Mehr vom Ordensziel · Muskel: \S+ \+[23] Sätze$/);
    expect(items.every((x) => !(x.block.type === "module" && x.block.module === "sharpen" && x.block.variant === "ordensziel"))).toBe(true);
  });
});

describe("Schwerpunkt-Tage (1.44)", () => {
  it("nur an erlaubten Tagen, zwei Tage = erster und mittlerer erlaubter Wochentag", async () => {
    const { focusFor } = await import("../../engine/weekplan");
    const { dayRoleMap } = await import("../../engine/plan");
    const { st, b } = mk("slayer");
    const where = (s: typeof st) => { const f = focusFor(s, b, 1)!; return dayRoleMap(s, b, f, 1).filter((d) => f.roles[d.role].blocks.some((x) => x.type === "module" && x.module === "sharpen")).map((d) => d.day); };
    expect(where(st)).toEqual(["Mo", "Do"]);
    expect(where({ ...st, sharpenDays: ["Mo", "Do", "Fr"] })).toEqual(["Mo", "Do"]);
    expect(where({ ...st, sharpenDays: ["Di", "Fr"] })).toEqual(["Di", "Fr"]);
    expect(where({ ...st, sharpenDays: [] })).toEqual([]);
  });
});

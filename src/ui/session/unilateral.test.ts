import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../../data";
import { EQUIPMENT_PRESETS, emptyState } from "../../store";
import { musclesOf } from "../../engine/volume";
import { collectItems } from "./items";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
const mk = (extra: object) => ({ id: "b1", focusId: "slayer", label: "", start: "2026-11-16", end: "2027-01-24", load: "medium" as const, travel: false, ...extra });
const at = (b: ReturnType<typeof mk>, roleKey: string, extraState: object = {}, focus = "slayer") => {
  const st = { ...emptyState(), equipment: [gym], plan: [b], ...extraState };
  return collectItems({ state: st, block: b, focus: FOCUS_BY_ID[focus], week: 1, roleKey, profile: gym, date: "2026-11-21", reduced: false } as never);
};
const names = (items: ReturnType<typeof collectItems>) => items.flatMap((x) => x.resolved.map((r) => r.name));

describe("Seiten ausgleichen (1.51)", () => {
  it("ohne Option bleibt alles beidseitig", () => {
    expect(names(at(mk({}), "kraft_contrast"))).toContain("Seated Leg Curl");
  });
  it("mit Option: Beinbeuger einseitig mit Hinweis, Hauptübungen bleiben", () => {
    const n = at(mk({ unilateral: true }), "kraft_contrast");
    const all = n.flatMap((x) => x.resolved);
    const uni = all.find((r) => r.name === "Single-Leg Seated Leg Curl");
    expect(uni?.note).toMatch(/schwächere Seite zuerst/);
    expect(names(n)).toContain("Back Squat");
    expect(names(n)).not.toContain("Seated Leg Curl");
  });
  it("höchstens eine je Körperhälfte und Einheit", () => {
    const b = { ...mk({ unilateral: true }), focusId: "gladiator" };
    const n = names(at(b, "lasten", {}, "gladiator"));
    expect(n.filter((x) => x === "1-Arm DB Row" || x === "Goblet Reverse Lunge").length).toBeLessThanOrEqual(2);
  });
  it("die einseitige Beinbeuger-Übung zählt für die Beinbeuger", () => {
    expect(Object.keys(musclesOf("Single-Leg Seated Leg Curl")).length).toBeGreaterThan(0);
  });
});

describe("Slayer Samstag: Bestie oder 30 Min lockere Grundlage (1.51)", () => {
  it("ohne Wahl die Bestie, mit Wahl der lockere Lauf", () => {
    const b = mk({});
    const beast = at(b, "wochenende_kondition").find((x) => x.alt);
    expect(beast?.alt).toMatchObject({ on: false, label: "30 Min Lockerer Lauf" });
    expect(beast?.block.type).toBe("beast");
    const run = at(b, "wochenende_kondition", { beastAlt: { "b1:1:wochenende_kondition|w-sa-beast": true } }).find((x) => x.alt);
    expect(run?.alt?.on).toBe(true);
    expect(run?.resolved[0]?.name).toBe("Lockerer Lauf");
  });
});

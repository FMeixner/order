import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { resolveSlot, toGuided } from "./resolve";
import { sharedState, suggest } from "./progression";
import { stepLoad } from "./loads";
import { autoWarmLists } from "./plan";
import { FOCUS_BY_ID } from "../data";

const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g", cableStep: 1.25 };

describe("Gewichte bleiben auf den Stufen des Geräts (1.51.2)", () => {
  it("Stufen zählen vom Raster aus", () => {
    expect(stepLoad(g, "cable", 13.19, 1)).toBe(13.75);
    expect(stepLoad(g, "cable", 13.19, -1)).toBe(12.5);
    expect(stepLoad(g, "cable", 12.5, 1)).toBe(13.75);
  });
  it("Woodchopper mit 13,19 kg im Speicher: Vorschlag liegt auf einer echten Stufe", () => {
    const r = resolveSlot({ id: "x", name: "Cable Woodchopper", sets: 3, reps: "24", prog: "double" } as never, g, false)!;
    const sg = suggest(r, sharedState({ [r.key]: { weight: 13.19, target: 22, stage: 0, fb: ["ok"], topHits: 0, updated: "x" } } as never, r, {}), 1, g);
    expect(((sg.weight ?? 0) / 1.25) % 1).toBeCloseTo(0);
  });
});

describe("Slayer: KB Russian Twist bleibt frei (1.51.2)", () => {
  it("Montags-Slot ist nie geführt", () => {
    const slot = FOCUS_BY_ID.slayer.roles.kraft_a.blocks.flatMap((b) => (b.type === "superset" ? b.slots : [])).find((s) => s.name === "KB Russian Twist");
    expect(slot?.guided).toBe("never");
    const r = resolveSlot(slot!, g, false)!;
    expect(r.guideRule).toBe("never");
    expect(toGuided(r, g)?.name).toBe("Cable Woodchopper"); // die Regel greift in items.ts, nicht in toGuided
  });
});

describe("Warm-up bei Überkopfdrücken (1.51.2)", () => {
  it("Slayer Dienstag: Schulter, Brustwirbelsäule, Latissimus", () => {
    const w = autoWarmLists(FOCUS_BY_ID.slayer.roles.arme_kurz, 1);
    expect(w).toEqual(expect.arrayContaining(["shoulder_prep", "thoracic_roller", "lat_box"]));
    expect(autoWarmLists(FOCUS_BY_ID.slayer.roles.kraft_a, 1)).not.toContain("lat_box");
  });
});

describe("Jede Einheit endet mit Trapez lösen (1.51.3)", () => {
  it("Duoball, ohne Ball die Dehnung; Slayer ohne Türrahmen am Ende", async () => {
    const { coolDrills } = await import("./plan");
    const { emptyState } = await import("../store");
    const u = emptyState().user;
    const cd = coolDrills(FOCUS_BY_ID.slayer.roles.kraft_a, { ...g, has: { ...g.has, ball: true } }, u, 1);
    expect(cd[cd.length - 1].name).toMatch(/Duoball/);
    expect(cd.some((d) => /Doorway/.test(d.name))).toBe(false);
    const noBall = coolDrills(FOCUS_BY_ID.slayer.roles.kraft_a, { ...g, has: { ...g.has, ball: false } }, u, 1);
    expect(noBall[noBall.length - 1].name).toMatch(/Trapez-Dehnung/);
  });
});

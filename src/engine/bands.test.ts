import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS } from "../store";
import { hasBands } from "../types";
import { available, insteadOf } from "./resolve";

describe("Bänder als abhakbares Equipment (1.48)", () => {
  const studio = { ...EQUIPMENT_PRESETS[0].make(), bands: ["leicht", "mittel", "schwer"] };
  it("abgehakt: Bandübungen gehen; abgewählt: nicht, auch wenn Stärken eingetragen sind", () => {
    expect(hasBands(studio)).toBe(true);
    expect(available("Band Curl", studio)).toBe(true);
    const off = { ...studio, has: { ...studio.has, bands: false } };
    expect(hasBands(off)).toBe(false);
    expect(available("Band Curl", off)).toBe(false);
    expect(available("Band Face Pull", off)).toBe(false);
  });
  it("ohne Bänder: Curl und Face Pull am Kabel, ohne Kabel mit Kurzhanteln", () => {
    const off = { ...studio, has: { ...studio.has, bands: false } };
    expect(insteadOf("Band Curl", off)?.name).toBe("Cable Curl");
    expect(insteadOf("Band Curl", { ...off, has: { ...off.has, cable: false } })?.name).toBe("DB Biceps Curl");
    expect(insteadOf("Band Face Pull", off)?.name).toBe("Face Pull");
  });
  it("ohne Stärken gibt es keine Bänder, egal was abgehakt ist", () => {
    expect(hasBands({ has: { ...studio.has, bands: true }, bands: [] })).toBe(false);
  });
});

describe("Jede Bandübung hat einen Ersatz (1.48)", () => {
  it("ohne Bänder findet jede Bandübung in einem gut ausgestatteten Ort einen Ersatz", async () => {
    const { EXERCISES } = await import("../data");
    const gym = { ...EQUIPMENT_PRESETS[0].make(), bands: [], has: { ...EQUIPMENT_PRESETS[0].make().has, bands: false } };
    const missing = Object.entries(EXERCISES).filter(([n, e]) => e.equip === "band" && n !== "Banded Push-Up" && !insteadOf(n, gym)).map(([n]) => n);
    expect(missing).toEqual([]);
  });
  it("Curl ohne Kabel, Kurzhanteln und Stange: an den Ringen, sonst Chin-Up an der Stange", () => {
    const bare = { ...EQUIPMENT_PRESETS[0].make(), bands: [], dumbbells: [], kettlebells: [], barbell: null, has: { ...EQUIPMENT_PRESETS[0].make().has, cable: false, machines: false, bands: false, rings: true, bar: true } };
    expect(insteadOf("Band Curl", bare)?.name).toBe("Ring Curl");
    expect(insteadOf("Band Curl", { ...bare, has: { ...bare.has, rings: false } })?.name).toBe("Chin-Up");
  });
});

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
  it("ohne Bänder: Curl mit Kurzhanteln, Face Pull am Kabel", () => {
    const off = { ...studio, has: { ...studio.has, bands: false } };
    expect(insteadOf("Band Curl", off)?.name).toBe("DB Biceps Curl");
    expect(insteadOf("Band Face Pull", off)?.name).toBe("Face Pull");
  });
  it("ohne Stärken gibt es keine Bänder, egal was abgehakt ist", () => {
    expect(hasBands({ has: { ...studio.has, bands: true }, bands: [] })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { BEASTS, BEAST_BY_ID } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import { mixesStations, spreadOut, swapRunBeast, swapRunText } from "./cardio";
import { beastFits } from "./plan";

describe("Laufen ersetzen", () => {
  it("rechnet über die Belastungszeit um, nicht 1:1", () => {
    expect(swapRunText("400/300/200m Run · 20/15/10 Band Thrusters", "row")).toBe("500/400/250m Row · 20/15/10 Band Thrusters");
    expect(swapRunText("400m Run", "bike")).toBe("1000m Bike");
    expect(swapRunText("400m Run", "rope")).toBe("120s Seilspringen");
    expect(swapRunText("1.5k Run · 100 Situps", "stair")).toBe("450s Stepper · 100 Situps");
    expect(swapRunText("2x40m Sprints · 10 Pullups", "row")).toBe("2x7s Row-Sprints · 10 Pullups");
  });
  it("lässt Bestien ohne Laufen und die Id unverändert", () => {
    const b = BEAST_BY_ID["ng-ivar"];
    expect(swapRunBeast(b, "bike").id).toBe(b.id);
    const plain = BEASTS.find((x) => !/run|sprint/i.test(x.work))!;
    expect(swapRunBeast(plain, "row")).toBe(plain);
  });
});

describe("Ortsregel", () => {
  const gym = EQUIPMENT_PRESETS[0].make();
  const home = { ...EQUIPMENT_PRESETS[1].make(), has: { ...EQUIPMENT_PRESETS[1].make().has, bar: true, rings: true }, bands: ["mittel"] };
  it("Studio: Stationen auseinander, Zuhause nicht", () => {
    expect(spreadOut(gym)).toBe(true);
    expect(spreadOut(home)).toBe(false);
  });
  it("Ifrit (Laufen, Thrusters mit Band, Klimmzüge) nur zuhause oder draußen", () => {
    const ifrit = BEAST_BY_ID["ng-ivar"];
    expect(mixesStations(ifrit)).toBe(true);
    expect(beastFits(ifrit, gym)).toBe(false);
    expect(beastFits(ifrit, home)).toBe(true);
    expect(beastFits(ifrit, { ...gym, bands: ["mittel"], spread: false })).toBe(true);
  });
  it("Laufen mit Körpergewicht oder mitnehmbarem Gerät bleibt im Studio erlaubt", () => {
    expect(mixesStations(BEAST_BY_ID["ng-thrud"])).toBe(false);
    expect(mixesStations(BEAST_BY_ID["ng-suttung"])).toBe(false);
  });
  it("zwei Cardiogeräte in einer Bestie zählen als Stationswechsel", () => {
    expect(mixesStations(BEAST_BY_ID["ng-gefjun"])).toBe(true);
  });
});

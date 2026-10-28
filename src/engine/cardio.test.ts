import { describe, expect, it } from "vitest";
import { BEASTS, BEAST_BY_ID } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import { beastLocSub, mixesStations, spreadOut, swapLocText, swapRunBeast, swapRunText } from "./cardio";
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

describe("Cardio am Ort: fehlt, was die Bestie bräuchte, wird nur dieses Element ersetzt", () => {
  const gym = EQUIPMENT_PRESETS[0].make(); // Rudergerät und Rad da, Laufen ja, Sprints nein
  const home = EQUIPMENT_PRESETS[1].make(); // kein Rudergerät, kein Rad, Laufen ja, Sprints nein
  it("Sprints ohne Strecke werden zu kurzen Sprints auf dem verfügbaren Gerät", () => {
    expect(swapLocText("2x40m Sprints · 10 Pullups", gym)).toBe("2x7s Row-Sprints · 10 Pullups");
    expect(swapLocText("2x40m Sprints · 10 Pullups", home)).toBe("2x7s Seil-Sprints (so schnell wie möglich) · 10 Pullups");
  });
  it("Row ohne Rudergerät wird über die Belastungszeit umgerechnet (Kalorien ≈ 4,5 s)", () => {
    expect(swapLocText("50c Row · 40 Situps", home)).toBe("750m Run · 40 Situps");
    expect(swapLocText("15/20/25 Band Thrusters · 15/20/25c Row", home)).toBe("15/20/25 Band Thrusters · 250/300/400m Run");
    expect(swapLocText("10c Row", { ...home, has: { ...home.has, run: false } })).toBe("45s Seilspringen");
  });
  it("Bike ohne Rad wird umgerechnet, Läufe bleiben, wenn die Strecke da ist", () => {
    expect(swapLocText("6k Bike · 3k Run · 6k Bike", home)).toBe("2400m Run · 3k Run · 2400m Run");
    expect(swapLocText("400m Run", { ...home, has: { ...home.has, run: false }, spread: false })).toBe("120s Seilspringen");
  });
  it("Bestie zählt als mutiert, alles andere bleibt, Bestzeit-Kategorie wie bei hexed", () => {
    const puck = BEAST_BY_ID["ng-loki"];
    const sub = beastLocSub(puck, home)!;
    expect(sub).not.toBeNull();
    expect(sub.id).toBe("ng-loki~hex");
    expect(sub.name).toBe("Puck mutiert");
    expect(sub.work).toBe("5 Clapping Pullups · 10 Cossack Squats · 2x5s Seil-Sprints (so schnell wie möglich) · Rest 60s");
    expect(sub.rounds).toBe(puck.rounds);
    // schon mutiert (Skill fehlt): Name und Id bleiben in der mutierten Form
    const hexed = { ...puck, id: "ng-loki~hex", name: "Puck mutiert" };
    expect(beastLocSub(hexed, home)!.name).toBe("Puck mutiert");
    // am Ort geht alles: keine Ersetzung, keine Mutation
    expect(beastLocSub(puck, { ...gym, has: { ...gym.has, sprint: true } })).toBeNull();
    expect(beastLocSub(BEAST_BY_ID["ng-fjalar"], home)).toBeNull();
  });
  it("Rudergerät und Rad schließen die Bestie nicht mehr aus", () => {
    const undine = BEAST_BY_ID["ng-nanna"];
    const withRings = { ...home, has: { ...home.has, bar: true, rings: true }, bands: ["mittel"] };
    expect(beastFits(undine, withRings)).toBe(true);
    expect(beastFits(BEAST_BY_ID["ng-gefjun"], home)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { BEASTS } from "../data";
import { beastSteps } from "./beaststeps";

describe("Bestie Schritt für Schritt", () => {
  it("Leitern: je Runde die passende Stufe", () => {
    const s = beastSteps({ work: "400/300/200m Run · 20/15/10 Band Thrusters · 20/15/10 Pullups", rounds: 3 });
    expect(s.map((x) => x.text)).toEqual(["400m Run", "20 Band Thrusters", "20 Pullups", "300m Run", "15 Band Thrusters", "15 Pullups", "200m Run", "10 Band Thrusters", "10 Pullups"]);
    expect(s[4].round).toBe(2);
  });
  it("Zeitstationen mit Sekunden, Pause am Ende der letzten Runde entfällt", () => {
    const s = beastSteps({ work: "30s Hollow Hold · 20 Hip Raises · Rest 60s", rounds: 2 });
    expect(s).toEqual([
      { text: "30 s Hollow Hold", seconds: 30, round: 1 }, { text: "20 Hip Raises", round: 1 }, { text: "Pause", seconds: 60, rest: true, round: 1 },
      { text: "30 s Hollow Hold", seconds: 30, round: 2 }, { text: "20 Hip Raises", round: 2 },
    ]);
  });
  it("Halten ohne Einheit zählt als Sekunden", () => {
    const s = beastSteps({ work: "10/15/20 Burpees · 60/90/120 Plank", rounds: 3 });
    expect(s[1]).toMatchObject({ text: "60 s Plank", seconds: 60 });
    expect(s[0].seconds).toBeUndefined();
  });
  it("Buy-in und Buy-out einmal", () => {
    const s = beastSteps({ work: "Buy-in: 100 Single Unders · 50 Pistol Squats · Buy-out: 100 Single Unders", rounds: 2 });
    expect(s.map((x) => x.text)).toEqual(["100 Single Unders", "50 Pistol Squats", "50 Pistol Squats", "100 Single Unders"]);
  });
  it("jede Bestie im Bestiarium lässt sich zerlegen", () => {
    for (const b of BEASTS) expect(beastSteps(b).length, b.id).toBeGreaterThan(0);
  });
});

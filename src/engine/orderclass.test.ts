import { describe, expect, it } from "vitest";
import { FOCI, FOCUS_BY_ID } from "../data";
import { blockedFor, coveredBy } from "./sharpen";

describe("Klassifikation der Orden (1.50)", () => {
  it("jeder Orden hat ein Primärziel, alle außer Harlequin ein Sekundärziel; kein Fettabbau", () => {
    for (const f of FOCI) {
      expect(f.class?.primary, f.id).toBeTruthy();
      if (f.id !== "harlequin") expect(f.class?.secondary, f.id).toBeTruthy();
      expect(JSON.stringify(f.class)).not.toMatch(/fett/);
    }
    expect(FOCUS_BY_ID.slayer.class).toEqual({ primary: "muskel", secondary: "athletik" });
    expect(FOCUS_BY_ID.assassin.class?.primary).toBe("kondition");
  });
  it("Slayer: Sprungkraft und Schnelligkeit ausgegraut (trainiert er schon), Ausdauer stört; Olympian darf nachlegen", () => {
    expect(coveredBy(FOCUS_BY_ID.slayer, "power")).toBe(true);
    expect(coveredBy(FOCUS_BY_ID.slayer, "speed")).toBe(true);
    expect(blockedFor(FOCUS_BY_ID.slayer, "aerob")).toBe(true);
    expect(coveredBy(FOCUS_BY_ID.olympian, "speed")).toBe(false);
    expect(coveredBy(FOCUS_BY_ID.pilgrim, "anaerob")).toBe(true);
  });
});

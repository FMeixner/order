import { describe, expect, it } from "vitest";
import { DM_VARIANTS, FOCUS_BY_ID, SWORD } from "../data";
import { moduleDrills, swordLevel, swordList, swordNext } from "./plan";
import { emptyState } from "../store";

const ids = (v: string, skills: string[] | null) => swordList(v, skills).map((d) => d.id);

describe("Schwert-Lernweg", () => {
  it("ohne Skill: Stufe 1, auch wenn der Orden eine schwerere Variante nennt", () => {
    expect(swordLevel(null)).toBe(0);
    expect(ids("drehhau", [])).toEqual(DM_VARIANTS.einzelmesser.map((d) => d.id));
  });
  it("Stufen nur der Reihe nach: ein späterer Skill ohne den früheren öffnet nichts", () => {
    expect(swordLevel(["schwert_kombi"])).toBe(0);
    expect(swordLevel(["schwert_hiebe", "schwert_kombi"])).toBe(2);
    expect(swordLevel(SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : [])))).toBe(SWORD.levels.length - 1);
  });
  it("Lernweg: Inhalt der Stufe, danach freies Üben; feste Formate bleiben", () => {
    expect(ids("lernweg", ["schwert_hiebe"])).toEqual([...DM_VARIANTS.kombiform, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(ids("bookend", ["schwert_hiebe"])).toEqual(DM_VARIANTS.bookend.map((d) => d.id));
    expect(moduleDrills("einzelmesser", { ...emptyState().user, skills: ["schwert_hiebe"] }, 1).map((d) => d.id)).toEqual(DM_VARIANTS.kombiform.map((d) => d.id));
  });
  it("nächster Schritt nennt Stufe und Test, auf der letzten Stufe nichts", () => {
    expect(swordNext([])).toEqual({ level: "Kombiformen", test: expect.stringContaining("Zornhau") });
    expect(swordNext(SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : [])))).toBeNull();
  });
});

describe("Witcher", () => {
  const w = FOCUS_BY_ID.witcher;
  const names = (role: string) => JSON.stringify(w.roles[role].blocks);
  it("Donnerstag: Schwert-Lernweg zuerst, keine Beinübungen (Freitag braucht frische Beine)", () => {
    const b = w.roles.home_hypertrophie.blocks;
    expect(b[0]).toMatchObject({ type: "module", module: "sword", variant: "lernweg" });
    expect(names("home_hypertrophie")).not.toMatch(/Squat|Lunge|Swing|Deadlift|Jump/);
  });
  it("Montag ohne schwere Kniebeuge, dafür Bein-Plage", () => {
    expect(names("kraft_a")).not.toMatch(/Back Squat/);
    expect(w.roles.kraft_a.blocks.some((b) => b.type === "beast" && b.pool?.length)).toBe(true);
  });
});

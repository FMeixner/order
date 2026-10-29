import { describe, expect, it } from "vitest";
import { DM_VARIANTS, FOCUS_BY_ID, SWORD } from "../data";
import { moduleDrills, swordLevel, swordList, swordNext } from "./plan";
import { swordSeconds } from "./duration";
import { emptyState } from "../store";

const ids = (v: string, skills: string[] | null) => swordList(v, skills).map((d) => d.id);
/** Verdichtete Fassungen aller Stufen vor deiner (Einnorden), wie sie swordList vor den Stufen-Inhalt stellt */
const echo = (lv: number) => SWORD.levels.slice(0, lv).flatMap((l) => l.echo ?? []);

describe("Schwert-Lernweg", () => {
  it("ohne Skill: Stufe 1, auch wenn der Orden eine schwerere Variante nennt", () => {
    expect(swordLevel(null)).toBe(0);
    expect(ids("drehhau", [])).toEqual(DM_VARIANTS.einzelmesser.map((d) => d.id));
  });
  it("Stufen nur der Reihe nach: ein späterer Skill ohne den früheren öffnet nichts", () => {
    expect(swordLevel(["schwert_kombi"])).toBe(0);
    expect(swordLevel(["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).toBe(3);
    expect(swordLevel(SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : [])))).toBe(SWORD.levels.length - 1);
  });
  it("Lernweg: Inhalt der Stufe, danach freies Üben; feste Formate bleiben", () => {
    expect(ids("lernweg", ["schwert_hiebe"])).toEqual([...echo(1), ...DM_VARIANTS.stiche, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(ids("bookend", ["schwert_hiebe"])).toEqual(DM_VARIANTS.bookend.map((d) => d.id));
    expect(moduleDrills("einzelmesser", { ...emptyState().user, skills: ["schwert_hiebe"] }, 1).map((d) => d.id)).toEqual([...echo(1), ...DM_VARIANTS.stiche].map((d) => d.id));
  });
  it("höhere Stufen schließen tiefere ein: Stich-Basics ab der Kombiformen-Stufe, mit weniger Volumen", () => {
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche"])).toEqual([...echo(2), ...DM_VARIANTS.kombiform, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(echo(2).map((d) => d.id)).toEqual(["md-b-zorn", "md-b-zwerch", "md-b-scheitel", "md-b-oberstich", "md-b-mittelstich", "md-b-unterstich", "md-b-ring-hochtief", "md-b-ring-tiefmittel"]);
    expect(ids("lernweg", ["schwert_hiebe"])).not.toContain("md-b-oberstich"); // auf der Stufe selbst läuft der volle Stich, nicht das Echo
    const b = echo(2).find((d) => d.id === "md-b-oberstich")!;
    const full = DM_VARIANTS.stiche.find((d) => d.id === "md-oberstich")!;
    expect(b.value).toBeLessThan(full.value);
    expect(b.sets ?? 1).toBeLessThan(full.sets ?? 1);
  });
  it("Ringstiche: volle Fassung auf der Stich-Stufe, verdichtet im Einnorden aller höheren Stufen", () => {
    // Stich-Stufe: die vollen Ringstiche (10 × 2) laufen mit dem Stufeninhalt
    const stiche = ids("einzelmesser", ["schwert_hiebe"]);
    expect(stiche).toContain("md-ring-hochtief");
    expect(stiche).toContain("md-ring-tiefmittel");
    // Kombiformen-Stufe: die Ringstiche bleiben als Basics im Einnorden, die volle Fassung läuft nicht mehr
    const kombi = ids("einzelmesser", ["schwert_hiebe", "schwert_stiche"]);
    expect(kombi).toContain("md-b-ring-hochtief");
    expect(kombi).toContain("md-b-ring-tiefmittel");
    expect(kombi).not.toContain("md-ring-hochtief");
    // und die Kombiform-Stufe hat ihr Dauerelement (Conditioning)
    expect(kombi).toContain("md-kombibahn");
  });
  it("Klingentanz nach dem Drehhau, Heaven Six auf der letzten Stufe", () => {
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi", "schwert_wechsel"])).toEqual([...echo(4), ...DM_VARIANTS.klingentanz, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(swordNext(["schwert_hiebe", "schwert_stiche", "schwert_kombi", "schwert_wechsel"])?.level).toBe("Doppelmesser");
    expect(ids("lernweg", SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : [])))).toContain("md-heaven6");
  });
  it("Stufe 1 nur Einzelhiebe, ohne Kombiform und ohne doppelte Basics", () => {
    expect(ids("einzelmesser", null)).toEqual(["md-zornhau", "md-zwerchhau", "md-scheitelhau"]);
  });
  it("höhere Stufe: Tag wird länger, Bestie behält ihr Budget", () => {
    const base = swordSeconds("einzelmesser", undefined);
    expect(swordSeconds("einzelmesser", ["schwert_hiebe"])).toBeGreaterThan(swordSeconds("einzelmesser", []));
    expect(base).toBeGreaterThan(0);
  });
  it("nächster Schritt nennt Stufe und Test, auf der letzten Stufe nichts", () => {
    expect(swordNext([])).toEqual({ level: "Stiche", test: expect.stringContaining("Zornhau") });
    expect(swordNext(SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : [])))).toBeNull();
  });
});

describe("Slayer", () => {
  const w = FOCUS_BY_ID.slayer;
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

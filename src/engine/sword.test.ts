import { describe, expect, it } from "vitest";
import { DM_VARIANTS, FOCUS_BY_ID, LS_VARIANTS, SB_VARIANTS, SKILLS, SWORD } from "../data";
import { moduleDrills, pathLevel, pathList, pathNext, PATHS, swordLevel, swordList, swordNext, weaponTag } from "./plan";
import { swordSeconds, weaponSeconds } from "./duration";
import { emptyState } from "../store";

const ids = (v: string, skills: string[] | null) => swordList(v, skills).map((d) => d.id);
/** Verdichtete Fassungen aller Stufen vor deiner (Einnorden), wie sie swordList vor den Stufen-Inhalt stellt */
const echo = (lv: number) => SWORD.levels.slice(0, lv).flatMap((l) => l.echo ?? []);
const echoOf = (m: "longsword" | "stab", lv: number) => PATHS[m].levels.slice(0, lv).flatMap((l) => l.echo ?? []);
const allSwordSkills = SWORD.levels.flatMap((l) => (l.skill ? [l.skill] : []));

describe("Schwert-Lernweg", () => {
  it("ohne Skill: Stufe 1, auch wenn der Orden eine schwerere Variante nennt", () => {
    expect(swordLevel(null)).toBe(0);
    expect(ids("drehhau", [])).toEqual(DM_VARIANTS.einzelmesser.map((d) => d.id));
  });
  it("Stufen nur der Reihe nach: ein späterer Skill ohne den früheren öffnet nichts", () => {
    expect(swordLevel(["schwert_kombi"])).toBe(0);
    expect(swordLevel(["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).toBe(3);
    expect(swordLevel(allSwordSkills)).toBe(SWORD.levels.length - 1);
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
  it("Stich-Check objektiviert: zählbare Ringstich-Serie statt Selbst-Rating", () => {
    const t = SKILLS.skills.find((s) => s.id === "schwert_stiche")!.test;
    expect(t).toContain("15 gültige");
    expect(t).toContain("beendet den Versuch");
  });
  it("Klinge & Faust nach den Kombiformen: die Off-Hand öffnet den Drehhau", () => {
    expect(swordNext(["schwert_hiebe", "schwert_stiche", "schwert_kombi"])?.level).toBe("Klinge & Faust");
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).toEqual([...echo(3), ...DM_VARIANTS.klinge_faust, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).toContain("md-doppelstoß");
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).toContain("md-wechsel-kombi");
    // der Drehhau liegt hinter dem Off-Hand-Gate
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi", "schwert_faust"])).toContain("md-drehhau");
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi"])).not.toContain("md-drehhau");
  });
  it("Klingentanz nach dem Drehhau, Heaven Six auf der letzten Stufe", () => {
    expect(ids("lernweg", ["schwert_hiebe", "schwert_stiche", "schwert_kombi", "schwert_faust", "schwert_wechsel"])).toEqual([...echo(5), ...DM_VARIANTS.klingentanz, ...DM_VARIANTS.lernweg].map((d) => d.id));
    expect(swordNext(["schwert_hiebe", "schwert_stiche", "schwert_kombi", "schwert_faust", "schwert_wechsel"])?.level).toBe("Doppelmesser");
    expect(ids("lernweg", allSwordSkills)).toContain("md-heaven6");
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
    expect(swordNext([])).toEqual({ level: "Stiche", test: expect.stringContaining("Ringstich-Serie") });
    expect(swordNext(allSwordSkills)).toBeNull();
  });
});

describe("Langschwert-Lernweg", () => {
  const ls = (v: string, skills: string[] | null) => pathList("longsword", v, skills).map((d) => d.id);
  it("eigener Weg ab null: ohne Skills die Grundhiebe, je Führungsseite", () => {
    expect(pathLevel("longsword", null)).toBe(0);
    expect(ls("lernweg", [])).toEqual([...LS_VARIANTS.grundhiebe.map((d) => d.id), "ls-frei"]);
    expect(ls("grundhiebe", [])).toEqual(LS_VARIANTS.grundhiebe.map((d) => d.id));
    expect(ls("bookend", [])).toEqual(["ls-bookend"]); // festes Format, kein Lernweg
  });
  it("Meisterhiebe hinter dem Grundhieb-Gate, Langer Tanz hinter dem Zorn-Ort", () => {
    expect(pathNext("longsword", [])?.level).toBe("Meisterhiebe");
    expect(pathLevel("longsword", ["langschwert_hiebe"])).toBe(1);
    expect(ls("lernweg", ["langschwert_hiebe"])).toEqual([...echoOf("longsword", 1).map((d) => d.id), ...LS_VARIANTS.meisterhiebe.map((d) => d.id), "ls-frei"]);
    expect(pathLevel("longsword", ["langschwert_hiebe", "langschwert_meister", "langschwert_ort"])).toBe(3);
    expect(pathNext("longsword", ["langschwert_hiebe", "langschwert_meister", "langschwert_ort"])).toBeNull();
    expect(ls("lernweg", ["langschwert_hiebe", "langschwert_meister", "langschwert_ort"])).toContain("ls-wechselhau");
  });
  it("Slayer und Conqueror fechten mit dem Langschwert", () => {
    const s = FOCUS_BY_ID.slayer;
    expect(s.roles.home_hypertrophie.blocks[0]).toMatchObject({ type: "module", module: "longsword", variant: "lernweg" });
    expect(FOCUS_BY_ID.conqueror.roles.work_capacity.blocks.some((b) => b.type === "module" && b.module === "longsword" && b.variant === "bookend")).toBe(true);
    expect(weaponSeconds("longsword", "lernweg", undefined)).toBeGreaterThan(0);
  });
});

describe("Stab-Lernweg", () => {
  const sb = (v: string, skills: string[] | null) => pathList("stab", v, skills).map((d) => d.id);
  it("Haltung & Atem zuerst, Hiebe in Zeitlupe dahinter", () => {
    expect(pathLevel("stab", null)).toBe(0);
    expect(sb("lernweg", [])).toEqual([...SB_VARIANTS.haltung.map((d) => d.id), "sb-frei"]);
    expect(pathNext("stab", [])?.level).toBe("Hiebe in Zeitlupe");
    expect(pathLevel("stab", ["stab_haltung"])).toBe(1);
    expect(sb("lernweg", ["stab_haltung"])).toEqual([...echoOf("stab", 1).map((d) => d.id), ...SB_VARIANTS.zeitlupe.map((d) => d.id), "sb-frei"]);
    expect(sb("lernweg", ["stab_haltung", "stab_zeitlupe"])).toContain("sb-form"); // Zeptertanz offen
  });
  it("Alchemist und King arbeiten mit dem Stab-Modul, Ersatz ohne Stock", () => {
    const a = FOCUS_BY_ID.alchemist;
    const stabBlock = a.roles.stab_tanz.blocks.find((b) => b.type === "module" && b.module === "stab");
    expect(stabBlock).toMatchObject({ variant: "lernweg", fallbackFlow: "taichi" });
    // die geführte Stabmeditation bleibt im Atem-Tag
    expect(a.roles.stab_atem.blocks.some((b) => b.type === "module" && b.module === "flow" && b.variant === "stab")).toBe(true);
    const k = FOCUS_BY_ID.king;
    expect(k.roles.redner.blocks.some((b) => b.type === "module" && b.module === "stab")).toBe(true);
    expect(weaponTag(k.roles.redner.blocks)).toBe("Stab");
    expect(weaponSeconds("stab", "lernweg", undefined)).toBeGreaterThan(0);
  });
});

describe("Slayer", () => {
  const w = FOCUS_BY_ID.slayer;
  const names = (role: string) => JSON.stringify(w.roles[role].blocks);
  it("Donnerstag: Langschwert-Lernweg zuerst, keine Beinübungen (Freitag braucht frische Beine)", () => {
    const b = w.roles.home_hypertrophie.blocks;
    expect(b[0]).toMatchObject({ type: "module", module: "longsword", variant: "lernweg" });
    expect(names("home_hypertrophie")).not.toMatch(/Squat|Lunge|Swing|Deadlift|Jump/);
  });
  it("Montag ohne schwere Kniebeuge, dafür Bein-Plage", () => {
    expect(names("kraft_a")).not.toMatch(/Back Squat/);
    expect(w.roles.kraft_a.blocks.some((b) => b.type === "beast" && b.pool?.length)).toBe(true);
  });
});

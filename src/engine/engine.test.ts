import { describe, expect, it } from "vitest";
import { BEASTS, FOCI, FOCUS_BY_ID, SKILLS } from "../data";
import { EQUIPMENT_PRESETS, emptyState, migrate } from "../store";
import type { AppState } from "../types";
import type { EquipmentProfile, SessionEntry, Slot } from "../types";
import { parseWeightList, snapDown, stepLoad } from "./loads";
import { advance, suggest } from "./progression";
import { parseReps, resolveSlot } from "./resolve";
import { blockAt, dayRoleMap, defaultRoles, expandDrills, isTestWeek, pickBeast, weekInBlock } from "./plan";

const gym = EQUIPMENT_PRESETS[0].make();
const home = EQUIPMENT_PRESETS[1].make();
const reise = EQUIPMENT_PRESETS[2].make();

/** Anonymes Beispieljahr für die Tests */
function sample(): AppState {
  const s = emptyState();
  const g = { ...gym, id: "g" }, h = { ...home, id: "h" }, r = { ...reise, id: "r" };
  return {
    ...s,
    user: { ...s.user, asym: { hip: "L" } },
    equipment: [g, h, r],
    schedule: { Mo: "g", Di: "g", Do: "h", Fr: "g" },
    plan: [
      { id: "b1", focusId: "assassin", label: "Herbst", start: "2026-09-22", end: "2026-11-30", load: "high", travel: false },
      { id: "b2", focusId: "soldier", label: "Ferien", start: "2027-02-24", end: "2027-03-31", load: "low", travel: false, schedule: { Mo: "g", Mi: "h", Fr: "g", Sa: "h" } },
    ],
  };
}

describe("Lasten", () => {
  it("liest Hantelstaffeln mit Bereichen und Dezimalkomma", () => {
    expect(parseWeightList("2; 4; 6-10/2; 12,5")).toEqual([2, 4, 6, 8, 10, 12.5]);
    expect(parseWeightList("4 8 12 16")).toEqual([4, 8, 12, 16]);
  });
  it("steigert Kurzhanteln auf die nächste vorhandene Hantel", () => {
    const p: EquipmentProfile = { ...home, dumbbells: [10, 12.5, 15, 20] };
    expect(stepLoad(p, "dumbbell", 15, 1)).toBe(20);
    expect(stepLoad(p, "dumbbell", 15, 2)).toBe(20);
    expect(stepLoad(p, "dumbbell", 12.5, 2)).toBe(20);
    expect(snapDown(p, "dumbbell", 14)).toBe(12.5);
  });
  it("Langhantel in Schritten von zwei kleinsten Scheiben", () => {
    expect(stepLoad(gym, "barbell", 60, 1)).toBe(62.5);
    expect(snapDown(gym, "barbell", 61.9)).toBe(60);
  });
  it("Kabel mit fester Schrittweite", () => {
    expect(stepLoad(gym, "cable", 30, 1)).toBe(32.5);
  });
});

describe("Übungsauswahl", () => {
  const slot: Slot = { id: "x", name: "Bench Press", home: "DB Bench Press", reise: { name: "Push-Up", reps: "AMRAP", prog: "reps" }, sets: 3, reps: "8-10", prog: "double" };
  it("wählt je Profil die passende Stufe", () => {
    expect(resolveSlot(slot, gym)!.name).toBe("Bench Press");
    expect(resolveSlot(slot, home)!.name).toBe("DB Bench Press");
    expect(resolveSlot(slot, reise)!.name).toBe("Push-Up");
    expect(resolveSlot(slot, reise)!.prog).toBe("reps");
  });
  it("fällt auf eine machbare Stufe zurück, wenn Equipment fehlt", () => {
    const labor: EquipmentProfile = { ...gym, barbell: null, dumbbells: [], kettlebells: [], has: { ...gym.has, bench: false } };
    expect(resolveSlot(slot, labor)!.name).toBe("Push-Up");
  });
  it("−1 Satz", () => {
    expect(resolveSlot(slot, gym, true)!.sets).toBe(2);
  });
  it("zerlegt Wiederholungsangaben", () => {
    expect(parseReps("8-10/Seite")).toMatchObject({ lo: 8, hi: 10, suffix: "/Seite" });
    expect(parseReps("AMRAP-2")).toMatchObject({ amrap: true, minus: 2 });
    expect(parseReps("12")).toMatchObject({ lo: 12, hi: 12 });
  });
});

describe("Progression", () => {
  const slot: Slot = { id: "s", name: "DB Bench Press", sets: 3, reps: "8-10", prog: "double" };
  const r = resolveSlot(slot, home)!;
  const entry = (reps: number[], w: number, fb?: SessionEntry["feedback"]): SessionEntry => ({
    key: r.key, slotId: "s", name: r.name, prog: "double", feedback: fb,
    sets: reps.map((x) => ({ done: true, reps: x, weight: w })),
  });
  it("oberes Ende in allen Sätzen: eine Stufe hoch, Wiederholungen unten (kleiner Sprung)", () => {
    const fine: EquipmentProfile = { ...home, dumbbells: [16, 16.5, 17, 18, 20] };
    const s = advance(r, undefined, entry([10, 10, 10], 16), fine, "2026-10-01");
    expect(s.weight).toBe(16.5);
    expect(s.target).toBe(8);
  });
  it("Lückenregel: großer Sprung hebt die Obergrenze an, danach Zielwiederholungen geschätzt", async () => {
    const { gapCeiling, landingReps } = await import("./progression");
    const studio: EquipmentProfile = { ...gym, dumbbells: parseWeightList("1-10/1; 12-40/2") };
    expect(gapCeiling(studio, "dumbbell", 10, 8, 10)).toBe(16);
    expect(gapCeiling(studio, "dumbbell", 20, 8, 10)).toBe(12);
    expect(gapCeiling(studio, "dumbbell", 38, 8, 10)).toBe(10);
    const lr = resolveSlot({ id: "lat", name: "DB Lateral Raise", sets: 3, reps: "8-10", prog: "double" }, studio)!;
    const e = (reps: number[], fb?: SessionEntry["feedback"]): SessionEntry => ({ key: lr.key, slotId: "lat", name: lr.name, prog: "double", feedback: fb, sets: reps.map((x) => ({ done: true, reps: x, weight: 10 })) });
    let st = advance(lr, undefined, e([10, 10, 10]), studio, "d1");
    expect(st.weight).toBe(10);
    expect(st.target).toBe(11);
    expect(suggest(lr, st, 1, studio).gap).toContain("12 kg");
    expect(suggest(lr, st, 1, studio).gap).toBe("→ bis 3 × 16, dann 12 kg");
    // Wiederholungsphase: OK und Leicht +1, Sehr leicht +2, Schwer gleiches Ziel
    expect(advance(lr, st, e([12, 12, 12]), studio, "x").target).toBe(13);
    expect(advance(lr, st, e([12, 12, 12], "leicht"), studio, "x").target).toBe(13);
    expect(advance(lr, st, e([12, 12, 12], "sehrleicht"), studio, "x").target).toBe(14);
    expect(advance(lr, st, e([12, 12, 12], "schwer"), studio, "x").target).toBe(12);
    st = advance(lr, st, e([16, 16, 16]), studio, "d2");
    expect(st.weight).toBe(12);
    expect(st.target).toBe(8);
    expect(landingReps(10, 12, "ok", 12, 8)).toBe(5);
    const home2: EquipmentProfile = { ...home, dumbbells: parseWeightList("4-41,5/1,5") };
    expect(gapCeiling(home2, "dumbbell", 4, 8, 10)).toBe(20);
  });
  it("Lückenregel bei festen Wiederholungen: erst mehr Wiederholungen, dann Last", () => {
    const studio: EquipmentProfile = { ...gym, dumbbells: parseWeightList("1-10/1; 12-40/2") };
    const fr = resolveSlot({ id: "f", name: "DB Shoulder Press", sets: 3, reps: "6", prog: "weight" }, studio)!;
    const e = (fb: SessionEntry["feedback"]): SessionEntry => ({ key: fr.key, slotId: "f", name: fr.name, prog: "weight", feedback: fb, sets: [6, 6, 6].map((x) => ({ done: true, reps: x, weight: 10 })) });
    let st = advance(fr, undefined, e("leicht"), studio, "d1");
    expect(st.weight).toBe(10);
    expect(st.target).toBe(7);
    st = advance(fr, st, e("leicht"), studio, "d2");
    expect(st.target).toBe(8);
    st = advance(fr, st, e("leicht"), studio, "d3");
    expect(st.weight).toBe(12);
    expect(st.target).toBe(6);
  });
  it("sonst Wiederholungen hocharbeiten, Gewicht halten", () => {
    const s = advance(r, undefined, entry([9, 8, 8], 16, "ok"), home, "2026-10-01");
    expect(s.weight).toBe(16);
    expect(s.target).toBe(9);
    expect(suggest(r, s).targetReps).toBe(9);
  });
  it("zweimal schwer: −5 % auf die nächste vorhandene Hantel darunter", () => {
    const s1 = advance(r, undefined, entry([8, 7, 6], 20, "schwer"), home, "d1");
    const s2 = advance(r, s1, entry([8, 7, 6], 20, "schwer"), home, "d2");
    expect(s2.weight).toBe(18);
  });
  it("Leiter steigt nach zwei Einheiten am oberen Ende", () => {
    const ls: Slot = { id: "l", name: "Incline Push-Up", sets: 2, reps: "8-12", prog: "ladder", ladder: ["Incline Push-Up", "Knee Push-Up", "Push-Up"] };
    const lr = resolveSlot(ls, home)!;
    const e: SessionEntry = { key: lr.key, slotId: "l", name: lr.name, prog: "ladder", sets: [{ done: true, reps: 12 }, { done: true, reps: 12 }] };
    const a = advance(lr, undefined, e, home, "d1");
    expect(a.stage).toBe(0);
    const b = advance(lr, a, e, home, "d2");
    expect(b.stage).toBe(1);
    expect(suggest(lr, b).name).toBe("Knee Push-Up");
  });
});

describe("Orden und Plan", () => {
  it("lädt alle 19 Orden", () => {
    expect(FOCI.length).toBe(19);
  });
  it("jede Rolle ist mit jedem Standardprofil auflösbar", () => {
    for (const f of FOCI) for (const role of Object.values(f.roles)) for (const b of role.blocks) {
      const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : [];
      for (const s of slots) for (const p of [gym, home, reise]) expect(resolveSlot(s, p), `${f.id}/${s.id}`).not.toBeNull();
    }
  });
  it("Rollen für 3, 4 und 5 Tage", () => {
    const w = FOCUS_BY_ID.witcher;
    expect(defaultRoles(w, 3)).toEqual(w.week_3);
    expect(defaultRoles(w, 4)).toEqual(w.week_4);
    expect(defaultRoles(w, 5)).toContain("wochenende_kondition");
  });
  it("Beispieljahr: Block, Woche, Tage", () => {
    const s = { ...sample(), onboarded: true };
    const b = blockAt(s.plan, "2026-09-28")!;
    expect(b.focusId).toBe("assassin");
    expect(weekInBlock(b, "2026-09-28")).toBe(2);
    expect(dayRoleMap(s, b).map((x) => x.day)).toEqual(["Mo", "Di", "Do", "Fr"]);
    expect(isTestWeek(FOCUS_BY_ID.assassin, b, 10)).toBe(true);
    const soldier = s.plan.find((x) => x.focusId === "soldier")!;
    expect(dayRoleMap(s, soldier).map((x) => x.day)).toEqual(["Mo", "Mi", "Fr", "Sa"]);
  });
  it("beide Seiten gleich, alte Asymmetrie-Angaben werden beim Laden entfernt", () => {
    const s = migrate(sample());
    expect(s.user.asym).toBeUndefined();
    const d = expandDrills(["base"], s.user, 1).find((x) => x.id === "wu-9090")!;
    expect(d.groups[0]).toMatchObject({ label: "Links", value: 25 });
    expect(d.groups[1]).toMatchObject({ label: "Rechts", value: 25 });
  });
  it("Bestie passt zum Equipment", () => {
    const st = emptyState();
    const b = pickBeast({ type: "beast", id: "t", classes: ["bestie"], }, { blockId: "x", week: 1, profile: reise, state: st, reduced: false, downgrade: false });
    expect(b).not.toBeNull();
    expect(b!.equipment.every((t) => ["bodyweight_only", "wall_or_open", "band"].includes(t))).toBe(true);
  });
});

describe("Geführte Varianten bei hoher Last", () => {
  it("etwa die Hälfte der freien Übungen, erster Lift bleibt frei", async () => {
    const { FOCUS_BY_ID } = await import("../data");
    const { guidedKeys, resolveSlot, toGuided } = await import("./resolve");
    const role = FOCUS_BY_ID.witcher.roles.kraft_a;
    const list = role.blocks.flatMap((b) => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : []))
      .map((s) => ({ r: resolveSlot(s, gym)!, contrast: false }));
    const keys = guidedKeys(list, gym);
    const names = list.filter((x) => keys.has(x.r.key)).map((x) => toGuided(x.r, gym)!.name);
    expect(names).toEqual(["Seated Dip Machine", "Seated Cable Row"]);
    expect(guidedKeys(list, home).size).toBe(0);
  });
  it("Doppelmesser-Schalter wird zu Schwert am Heim-Profil", async () => {
    const { migrate } = await import("../store");
    const s = migrate({ ...emptyState(), user: { ...emptyState().user, doppelmesser: true }, equipment: [home, gym] });
    expect(s.equipment.find((e) => e.tier === "home")!.has.sword).toBe(true);
    expect(s.equipment.find((e) => e.tier === "gym")!.has.sword).toBe(false);
  });
});

describe("Übung tauschen", () => {
  const slot: Slot = { id: "x1", name: "Bulgarian Split Squat", home: "Split Squat", sets: 3, reps: "8-10", prog: "double" };
  it("Tausch ersetzt die Übung, eigene Historie, Dosis bleibt", () => {
    const r = resolveSlot(slot, gym, false, "Reverse Lunge")!;
    expect(r.name).toBe("Reverse Lunge");
    expect(r.key).toBe("x1|Reverse Lunge");
    expect(r.swapped).toBe(true);
    expect(r.original).toBe("Bulgarian Split Squat");
    expect(r.sets).toBe(3);
    expect(r.reps).toBe("8-10");
  });
  it("nicht machbarer Tausch fällt aufs Original zurück", () => {
    const r = resolveSlot(slot, reise, false, "Leg Press")!;
    expect(r.swapped).toBeFalsy();
    expect(r.swapUnavailable).toBe("Leg Press");
  });
  it("Körpergewicht → Hantel wird gewichtsgesteuert", () => {
    const r = resolveSlot({ id: "x2", name: "Push-Up", sets: 3, reps: "AMRAP-2", prog: "reps" }, gym, false, "DB Bench Press")!;
    expect(r.loadable).toBe(true);
    expect(r.prog).toBe("double");
  });
  it("Optionen aus der Tauschgruppe, verfügbare zuerst", async () => {
    const { swapOptions } = await import("./resolve");
    const opts = swapOptions(resolveSlot(slot, home)!, home);
    expect(opts.find((o) => o.name === "Single-Leg Leg Press")?.available).toBe(false);
    expect(opts[0].available).toBe(true);
    expect(opts.map((o) => o.name)).toContain("Reverse Lunge");
  });
  it("getauschte Stelle wird bei hoher Last nicht geführt", async () => {
    const { guidedKeys } = await import("./resolve");
    const a = resolveSlot({ id: "a", name: "Back Squat", sets: 3, reps: "5", prog: "double" }, gym)!;
    const b = resolveSlot({ id: "b", name: "Bench Press", sets: 3, reps: "8", prog: "double" }, gym, false, "DB Bench Press")!;
    expect(guidedKeys([{ r: a, contrast: false }, { r: b, contrast: false }], gym).size).toBe(0);
  });
});

describe("Normen", () => {
  it("Sportabzeichen, Perzentile, 5RM relativ zum Körpergewicht", async () => {
    const { findNorm, normScore } = await import("./norms");
    const push = findNorm("t-pushups", undefined, "m", 37)!;
    expect(normScore(push, 30, null)!.label).toBe("Silber-Niveau");
    expect(normScore(findNorm("t-pushups", undefined, "w", 37)!, 16, null)!.label).toBe("Gold-Niveau");
    expect(findNorm("t-5rm-squat", "legpress", "w", 37)).toBeNull();
    expect(findNorm("t-pushups", undefined, "m", 45)).toBeNull();
    const lp = findNorm("t-5rm-squat", "legpress", "m", 37)!;
    // 5RM 125 kg bei 84 kg: 1RM ≈ 145,8 → 1,74 × KG ≈ Mittelwert → P50
    expect(Math.abs(normScore(lp, 125, 84)!.score - 50)).toBeLessThanOrEqual(1);
    const vo2 = findNorm("t-vo2", undefined, "m", 35)!;
    expect(normScore(vo2, 46.4, null)!.score).toBe(70);
    const coop = findNorm("t-cooper", undefined, "m", 35)!;
    expect(normScore(coop, 3000, null)!.label).toBe("exzellent");
  });
  it("Auswertung: schwächster Bereich und Vorschlag", async () => {
    const { evaluateBlock } = await import("./norms");
    const s = sample();
    s.user = { ...s.user, sex: "m", birthYear: 1989 };
    const T = (value: number, variant?: string) => [{ date: "2026-11-25", blockId: "b1", value, raw: String(value), ...(variant ? { variant } : {}) }];
    s.tests = { "t-bodyweight": T(84), "t-pushups": T(45), "t-pullups": T(15), "t-sitreach": T(-10), "t-5rm-squat": T(125, "legpress") };
    const ev = evaluateBlock(s, "b1");
    expect(ev.weakest?.id).toBe("mobility");
    expect(ev.suggestions.length).toBeGreaterThan(0);
    expect(ev.suggestions[0].goals.primary).toBe("mobility");
    const noProfile = evaluateBlock(sample(), "b1");
    expect(noProfile.missingProfile).toBe(true);
  });
});

describe("Jahresbalance", () => {
  const blk = (id: string, focusId: string, start: string, end: string) => ({ id, focusId, start, end, label: "", load: "medium" as const, travel: false });
  it("fünfmal Witcher ist spezialisiert, ein gemischtes Jahr breiter", async () => {
    const { balanceOf } = await import("./balance");
    const witcher5 = ["2026-09-28", "2026-12-07", "2027-02-22", "2027-05-03", "2027-07-12"].map((s, i) => blk(`w${i}`, "witcher", s, i < 4 ? ["2026-12-06", "2027-02-21", "2027-05-02", "2027-07-11"][i] : "2027-09-26"));
    const a = balanceOf(witcher5, "2026-09-28", "2027-09-27");
    expect(a.label).toBe("spezialisiert");
    expect(a.share.muskel).toBeGreaterThan(0.5);
    expect(a.share.beweglichkeit).toBeGreaterThan(0.05);
    const mixed = [blk("1", "assassin", "2026-09-28", "2026-12-06"), blk("2", "witcher", "2026-12-07", "2027-02-23"), blk("3", "soldier", "2027-02-24", "2027-03-31"), blk("4", "gladiator", "2027-04-01", "2027-07-15"), blk("5", "conqueror", "2027-07-16", "2027-09-24")];
    const b = balanceOf(mixed, "2026-09-28", "2027-09-27");
    expect(b.score!).toBeGreaterThan(a.score!);
    // Soldier zählt seit 0.18 nicht mehr gleichmäßig für alle Bereiche, deshalb „mit Schwerpunkt“ statt „allround“
    expect(b.label).not.toBe("spezialisiert");
  });
});

describe("Letzter Satz verfehlt", () => {
  it("schwächster Satz setzt das Ziel, deutlich verfehlt → eine Stufe runter", () => {
    const fine: EquipmentProfile = { ...home, dumbbells: [14, 15, 16, 17, 18] };
    const r = resolveSlot({ id: "m", name: "DB Bench Press", sets: 3, reps: "8-10", prog: "double" }, fine)!;
    const e = (reps: number[]): SessionEntry => ({ key: r.key, slotId: "m", name: r.name, prog: "double", feedback: "ok", sets: reps.map((x) => ({ done: true, reps: x, weight: 16 })) });
    const a = advance(r, undefined, e([9, 9, 7]), fine, "d1");
    expect(a.weight).toBe(16);
    expect(a.target).toBe(8);
    const b = advance(r, undefined, e([8, 7, 6]), fine, "d1");
    expect(b.weight).toBe(15);
    expect(b.target).toBe(8);
  });
});

describe("Skillcheck", () => {
  const none = new Set<string>();
  it("ohne Klimmzug: Latziehen statt Klimmzug mit Gewicht", () => {
    const r = resolveSlot({ id: "k", name: "Weighted Pull-Up", home: "Pull-Up + Weste", sets: 3, reps: "5-6", prog: "double" }, gym, false, undefined, none)!;
    expect(r.name).toBe("Lat Pulldown");
    expect(r.regressedFrom).toBe("Weighted Pull-Up");
    expect(resolveSlot({ id: "k", name: "Weighted Pull-Up", sets: 3, reps: "5-6", prog: "double" }, gym, false, undefined, new Set(["pullup"]))!.name).toBe("Weighted Pull-Up");
    expect(resolveSlot({ id: "k", name: "Weighted Pull-Up", sets: 3, reps: "5-6", prog: "double" }, gym)!.name).toBe("Weighted Pull-Up");
  });
  it("Leiter: leichtere Stufe davor ohne Skill, höherer Start mit Skill", () => {
    const pl: Slot = { id: "p", name: "Pistol Squat (Box)", sets: 3, reps: "3-6/Seite", prog: "ladder", ladder: ["Pistol Squat (Box)", "Pistol Squat (Gegengewicht)", "Pistol Squat"] };
    const withSkill = resolveSlot(pl, home, false, undefined, new Set(["pistol"]))!;
    expect(suggest(withSkill, undefined).name).toBe("Pistol Squat");
    const pu: Slot = { id: "q", name: "Pull-Up", sets: 3, reps: "3-8", prog: "ladder", ladder: ["Pull-Up", "Chest-to-Bar Pull-Up", "Muscle-Up-Übergang (Band)"] };
    const noSkill = resolveSlot(pu, home, false, undefined, none)!;
    expect(noSkill.ladder![0]).toBe("Band-Assisted Pull-Up");
    expect(suggest(noSkill, undefined).name).toBe("Band-Assisted Pull-Up");
  });
  it("Bestien mit Muscle-Ups nur mit Skill", async () => {
    const { beastOk, beastSkills } = await import("./skills");
    const { BEASTS } = await import("../data");
    const mu = BEASTS.filter((b) => beastSkills(b).includes("muscle_up"));
    expect(mu.length).toBeGreaterThan(0);
    expect(mu.every((b) => !beastOk(b, none))).toBe(true);
    expect(mu.every((b) => beastOk(b, null))).toBe(true);
    const free = BEASTS.filter((b) => beastOk(b, none));
    expect(free.length).toBeGreaterThan(20);
  });
});

describe("Bestien-Serien", () => {
  it("ohne passende Bestie: Serie aus kürzeren, in der Zielklasse", async () => {
    const { pickBeast, beastById, beastClass } = await import("./plan");
    const { beastOk } = await import("./skills");
    const s = sample();
    s.user = { ...s.user, skills: [] };
    // kaum eine einzelne Bestie dauert 40–60 Minuten: Serien kommen vor
    const blk = { type: "beast" as const, id: "t", classes: ["verfluchte" as const] };
    const b = pickBeast(blk, { blockId: "b1", week: 2, profile: gym, state: s, reduced: false, downgrade: false })!;
    expect(!!b.parts || !!b.repeat).toBe(true);
    expect(beastClass(b.minutes)).toBe("verfluchte");
    // ohne Skills: jeder Teil ist Basis ohne Skill oder hexed
    const units = b.parts ? b.parts.map((p) => beastById(p.id)!) : [b];
    expect(units.every((u) => u.id.includes("~hex") || beastOk(beastById(u.id.split("×")[0])!, new Set()))).toBe(true);
    expect(beastById(b.id)?.name).toBe(b.name);
    const b2 = pickBeast(blk, { blockId: "b1", week: 3, profile: gym, state: s, reduced: false, downgrade: false })!;
    expect(b2.id).not.toBe(b.id);
    // Reihenfolge der Paare wechselt: über viele Wochen kommt jede Bestie auch mal zuerst
    const firsts = new Set<string>(), seconds = new Set<string>();
    for (let w = 1; w <= 60; w++) { const x = pickBeast(blk, { blockId: "b1", week: w, profile: gym, state: s, reduced: false, downgrade: false })!; if (x.parts?.length === 2) { firsts.add(x.parts[0].id); seconds.add(x.parts[1].id); } }
    expect([...seconds].some((id) => firsts.has(id))).toBe(true);
  });
});

describe("Doppel und Triple", () => {
  it("am Stück, eigene Id und Bestzeit, keine Pause eingerechnet", async () => {
    const { beastById, repeatBeast } = await import("./plan");
    const { BEASTS } = await import("../data");
    const b = BEASTS[0];
    const d = repeatBeast(b, 2);
    expect(d.id).toBe(`${b.id}×2`);
    expect(d.minutes).toBe(b.minutes * 2);
    expect(d.parts).toBeUndefined();
    expect(beastById(d.id)?.name).toBe(`${b.name} ×2`);
    const pair = beastById(`${BEASTS[0].id}+${BEASTS[1].id}`)!;
    expect(pair.parts?.length).toBe(2);
    expect(pair.minutes).toBe(BEASTS[0].minutes + BEASTS[1].minutes + 2);
  });
});

describe("Blockfolge", () => {
  it("füllt offene Phasen, lässt laufende stehen, keine Wiederholung hintereinander", async () => {
    const { suggestSequence } = await import("./sequence");
    const blk = (id: string, focusId: string, start: string, end: string, load: "high" | "medium" | "low", travel = false) => ({ id, focusId, start, end, label: "", load, travel });
    const plan = [blk("1", "assassin", "2026-09-28", "2026-12-06", "high"), blk("2", "", "2026-12-07", "2027-02-23", "high"), blk("3", "", "2027-02-24", "2027-03-31", "low"), blk("4", "", "2027-04-01", "2027-07-15", "high", true), blk("5", "", "2027-07-16", "2027-09-24", "medium")];
    const r = suggestSequence(plan, "2026-09-29", "allround");
    expect(r.items[0]).toMatchObject({ focusId: "assassin", locked: true });
    expect(r.items.every((x) => !!FOCUS_BY_ID[x.focusId])).toBe(true);
    for (let i = 1; i < r.items.length; i++) expect(r.items[i].focusId).not.toBe(r.items[i - 1].focusId);
    expect(FOCUS_BY_ID[r.items[3].focusId].travel).toBe(true);
    const mob = suggestSequence(plan, "2026-09-29", "beweglichkeit");
    expect(mob.balance.share.beweglichkeit).toBeGreaterThan(r.balance.share.beweglichkeit);
  });
});

describe("hexed und Grundlagentempo", () => {
  it("hexed ersetzt Muscle-Ups, eigene Id, wieder auflösbar", async () => {
    const { BEASTS } = await import("../data");
    const { beastSkills, hexFor } = await import("./skills");
    const { beastById } = await import("./plan");
    const mu = BEASTS.find((b) => beastSkills(b).length === 1 && beastSkills(b)[0] === "muscle_up")!;
    const h = hexFor(mu, new Set())!;
    expect(h.name).toBe(`${mu.name} mutiert`);
    expect(h.work).toContain("Assisted Muscle-Ups (Band oder Kipping)");
    expect(h.id).toBe(`${mu.id}~hex`);
    expect(beastById(h.id)?.work).toBe(h.work);
    expect(hexFor(mu, new Set(["muscle_up"]))).toBeNull();
  });
  it("fehlt ein Skill, kommt die Bestie hexed in die Rotation statt herauszufallen", async () => {
    const { pickBeast, beastFamily } = await import("./plan");
    const s = sample();
    s.user = { ...s.user, skills: [] };
    const blk = { type: "beast" as const, id: "t", classes: ["bestie" as const] };
    const ws = Array.from({ length: 8 }, (_, i) => pickBeast(blk, { blockId: "b1", week: i + 1, profile: gym, state: s, reduced: false, downgrade: false })!);
    expect(ws.some((x) => x.id.endsWith("~hex"))).toBe(true);
    for (let i = 1; i < ws.length; i++) expect(beastFamily(ws[i].id).some((f) => beastFamily(ws[i - 1].id).includes(f))).toBe(false);
  });
  it("Assassin: Einzel, Doppel und Serien gemischt, ohne Wiederholung", async () => {
    const { pickBeast, beastFamily } = await import("./plan");
    const s = { ...sample(), schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" } as AppState["schedule"] };
    const all = SKILLS.skills.map((x) => x.id);
    for (const skills of [all, all.filter((x) => x !== "muscle_up")]) {
      const st = { ...s, user: { ...s.user, skills } };
      const b = Object.values(FOCUS_BY_ID.assassin.roles).flatMap((r) => r.blocks).find((x) => x.type === "beast" && x.id === "sk-beast") as Extract<import("../types").Block, { type: "beast" }>;
      const prof = st.equipment.find((e) => e.id === "g")!;
      const ws = Array.from({ length: 10 }, (_, i) => pickBeast(b, { blockId: "b1", week: i + 1, profile: prof, state: st, reduced: false, downgrade: false })!);
      const fams = ws.flatMap((x) => [...new Set(beastFamily(x.id))]);
      expect(new Set(fams).size).toBe(fams.length);
      const kinds = new Set(ws.map((x) => (x.parts ? "pair" : x.repeat ? "double" : "single")));
      expect(kinds.size).toBeGreaterThanOrEqual(2);
    }
  });
  it("hexed mit Faktor: Pistols ×2 Squats, Dragon Flags ×3 Leg Raises, eine Id, Dragon Flags in der Basis", async () => {
    const { beastById } = await import("./plan");
    const { hexFor } = await import("./skills");
    const lw = BEASTS.find((b) => b.name === "Lindwurm")!;
    const hx = hexFor(lw, new Set(["pullup"]))!;
    expect(hx.id).toBe("ng-thor~hex");
    expect(hx.work).toContain("100/80/60 Squats");
    expect(beastById(hx.id)?.name).toBe("Lindwurm mutiert");
    const wj = BEASTS.find((b) => b.name === "Wilde Jagd")!;
    expect(wj.work).toContain("4 Dragon Flags");
    expect(hexFor(wj, new Set(["pullup", "hspu"]))!.work).toContain("12 Leg Raises");
  });
  it("Kurzformen: weniger Runden, wenn die volle Bestie nicht ins Fenster passt; eigene Id, Familie bleibt", async () => {
    const { pickBeast, beastFamily, beastById, shortBeast, canShorten } = await import("./plan");
    const s = sample();
    const blk = { type: "beast" as const, id: "t", classes: ["plage" as const] };
    const ws = Array.from({ length: 12 }, (_, i) => pickBeast(blk, { blockId: "b1", week: i + 1, profile: { ...gym, id: "g" }, state: s, reduced: false, downgrade: false })!);
    expect(ws.some((x) => x.id.includes("~r"))).toBe(true);
    expect(new Set(ws.map((x) => beastFamily(x.id)[0])).size).toBeGreaterThanOrEqual(10);
    const sb = ws.find((x) => x.id.includes("~r"))!;
    expect(beastById(sb.id)?.name).toBe(sb.name);
    expect(canShorten(BEASTS.find((b) => b.name === "Nachzehrer")!)).toBe(false); // 21/15/9
    expect(shortBeast(BEASTS.find((b) => b.name === "Banshee")!, 2)?.rounds).toBe(2);
  });
  it("jeder Orden hat mindestens eine Bestie pro Woche", () => {
    for (const f of FOCI.filter((x) => !x.medley)) for (const ab of ["A", "B"]) {
      const n = f.week_4.flatMap((rk) => f.roles[rk].blocks).filter((b) => b.type === "beast" && (!b.rotation || b.rotation === ab)).length;
      expect(n, `${f.id} ${ab}`).toBeGreaterThanOrEqual(1);
    }
  });
  it("kein Laufen: Laufblock wird Bestie", async () => {
    const { collectItems, sessionId } = await import("../ui/SessionView");
    const s = sample();
    const block = { id: "bx", focusId: "conqueror", start: "2026-09-28", end: "2026-12-06", label: "", load: "medium" as const, travel: false };
    s.plan = [block];
    const focus = FOCUS_BY_ID.conqueror;
    s.noRun = { [sessionId("bx", 2, "ausdauer")]: true };
    const items = collectItems({ state: s, update: () => {}, block, focus, week: 2, roleKey: "ausdauer", profile: gym, date: "2026-10-06", reduced: false });
    expect(items.some((it) => it.block.type === "beast")).toBe(true);
  });
});

describe("Testwoche als eigener Block", () => {
  it("einschieben verschiebt spätere Phasen, Vorblock ohne eigene Testwoche", async () => {
    const { insertTestWeek, followedByTest, isTestBlock } = await import("./plan");
    const { suggestSequence } = await import("./sequence");
    const s = sample();
    const plan = insertTestWeek(s.plan, "b1", "t1");
    const t = plan.find((b) => b.id === "t1")!;
    expect(isTestBlock(t)).toBe(true);
    expect(t.start).toBe("2026-12-01");
    expect(t.end).toBe("2026-12-07");
    expect(plan.find((b) => b.id === "b2")!.start).toBe("2027-03-03");
    expect(followedByTest(plan, plan.find((b) => b.id === "b1")!)).toBe(true);
    const r = suggestSequence(plan, "2026-09-29", "allround");
    expect(r.items.find((x) => x.id === "t1")).toMatchObject({ focusId: "test", locked: true });
  });
});

describe("Testwoche abtrennen", () => {
  it("letzte Woche wird Testwoche, nichts verschiebt sich", async () => {
    const { splitTestWeek } = await import("./plan");
    const s = sample();
    const plan = splitTestWeek(s.plan, "b1", "t2");
    expect(plan.find((b) => b.id === "b1")!.end).toBe("2026-11-23");
    expect(plan.find((b) => b.id === "t2")).toMatchObject({ start: "2026-11-24", end: "2026-11-30", focusId: "test" });
    expect(plan.find((b) => b.id === "b2")!.start).toBe(s.plan[1].start);
  });
});

describe("Wochenform", () => {
  it("drei Tage: vierter Tag eingearbeitet, in der Zeit, Bestie bleibt", async () => {
    const { shapeFocus } = await import("./weekplan");
    const { estimateRole } = await import("./duration");
    const P = { gym, home, reise };
    for (const f of FOCI.filter((x) => !x.medley)) {
      const s = shapeFocus(f, 3);
      for (const k of s.week_3) expect(estimateRole(s.roles[k], P[s.roles[k].location]).total, `${f.id}.${k}`).toBeLessThanOrEqual(Math.max(f.roles[k].minutes, 60) + 8);
      expect(s.week_3.some((k) => s.roles[k].blocks.some((b) => b.type === "beast")), f.id).toBe(true);
    }
    const k3 = shapeFocus(FOCUS_BY_ID.knight, 3);
    const names = k3.week_3.flatMap((k) => k3.roles[k].blocks.flatMap((b) => (b.type === "single" ? [b.slot.name] : b.type === "superset" ? b.slots.map((x) => x.name) : [])));
    expect(names).toContain("Bulgarian Split Squat");
    expect(k3.week_3.some((k) => k3.roles[k].blocks.some((b) => b.type === "superset" && b.slots.length === 2))).toBe(true);
  });
  it("fünf Tage: Zusatztag in der Mitte", () => {
    expect(defaultRoles(FOCUS_BY_ID.knight, 5)).toEqual(["upper_a", "lower_a", "bonus", "upper_b", "lower_b"]);
  });
  it("Harlequin: jede Woche ein anderer Orden", async () => {
    const { focusFor } = await import("./weekplan");
    const s = sample();
    const b = { ...s.plan[0], focusId: "harlequin" };
    expect(focusFor(s, b, 1)!.id).toBe("witcher");
    expect(focusFor(s, b, 2)!.id).toBe("pugilist");
    expect(focusFor(s, b, 13)!.id).toBe("witcher");
  });
});

describe("Wochenvolumen", () => {
  it("jede Kraftübung in den Orden zählt für mindestens einen Muskel", async () => {
    const { musclesOf } = await import("./volume");
    const { EXERCISES } = await import("../data");
    const missing = new Set<string>();
    for (const f of FOCI) for (const r of Object.values(f.roles)) for (const b of r.blocks) {
      const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy] : [];
      for (const s of slots) {
        if ((s.prog ?? "none") === "none" || (s.kind ?? "strength") !== "strength") continue;
        const eq = EXERCISES[s.name]?.equip;
        if (eq === "cardio" || eq === "skill") continue;
        if (!Object.keys(musclesOf(s.name)).length) missing.add(s.name);
      }
    }
    expect([...missing]).toEqual([]);
  });
  it("zählt Sätze pro Muskel, mitbeteiligte halb, Richtwert nach Erfahrung", async () => {
    const { weeklyVolume, volumeRange } = await import("./volume");
    const s = sample();
    const e = (name: string, n: number): SessionEntry => ({ key: `x|${name}`, slotId: "x", name, prog: "double", sets: Array.from({ length: n }, () => ({ done: true, reps: 8, weight: 20 })) });
    s.sessions = [{ id: "s1", date: "2026-09-29", blockId: "b1", focusId: "knight", week: 2, role: "upper_a", profileId: "g", entries: { a: e("Bench Press", 4), b: e("Lat Pulldown", 3) }, drills: {}, menu: {}, done: true }];
    const [w] = weeklyVolume(s, "2026-10-10");
    expect(w.sets.Brust).toBe(4);
    expect(w.sets.Trizeps).toBe(2);
    expect(w.sets.Rücken).toBe(3);
    expect(volumeRange({ ...s.user, level: "einsteiger" })).toEqual([6, 10]);
    expect(volumeRange({ ...s.user, volumeRange: [12, 16] })).toEqual([12, 16]);
  });
});

describe("Messfehler in der Testauswertung", () => {
  it("kleine Unterschiede gelten als gleich", async () => {
    const { evaluateBlock } = await import("./norms");
    const s = sample();
    s.tests = { "t-sprint10": [{ date: "2026-06-01", blockId: "b0", value: 1.92, raw: "1.92" }, { date: "2026-11-25", blockId: "b1", value: 1.89, raw: "1.89" }],
      "t-broad": [{ date: "2026-06-01", blockId: "b0", value: 200, raw: "200" }, { date: "2026-11-25", blockId: "b1", value: 212, raw: "212" }] };
    const ev = evaluateBlock(s, "b1");
    const t = Object.fromEntries(ev.domains.flatMap((d) => d.tests).map((x) => [x.test.id, x.change]));
    expect(t["t-sprint10"]).toBe("same");
    expect(t["t-broad"]).toBe("better");
  });
});

describe("Gleiche Übung, gleiche Gewichtsdaten", () => {
  it("Ersatz an anderer Stelle nimmt das jüngste Gewicht dieser Übung, auf die Stufen des Profils gelegt", async () => {
    const { sharedState } = await import("./progression");
    const homeP: EquipmentProfile = { ...home, dumbbells: [4, 5.5, 7, 8.5, 10, 11.5, 13] };
    const r = resolveSlot({ id: "x", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" }, homeP)!;
    const slots = {
      "a|DB Lateral Raise": { weight: 10, target: 13, stage: 0, fb: [], topHits: 0, updated: "2026-10-01" },
      "b|DB Lateral Raise": { weight: 12, target: 12, stage: 0, fb: [], topHits: 0, updated: "2026-10-05" },
      "c|Cable Lateral Raise": { weight: 30, target: 12, stage: 0, fb: [], topHits: 0, updated: "2026-10-09" },
    };
    const st = sharedState(slots, r)!;
    expect(st.weight).toBe(12);
    expect(suggest(r, st, 1, homeP).weight).toBe(11.5);
  });
});

describe("Ortswechsel und dreimal OK", () => {
  const studio: EquipmentProfile = { ...gym, dumbbells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20] };
  const homeP: EquipmentProfile = { ...home, dumbbells: [4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5] };
  const slot = { id: "lr", name: "DB Lateral Raise", sets: 3, reps: "12-15", prog: "double" as const };
  const entry = (r: ReturnType<typeof resolveSlot>, w: number, reps: number[], fb: "ok" | "leicht"): SessionEntry =>
    ({ key: r!.key, slotId: "lr", name: r!.name, prog: "double", feedback: fb, sets: reps.map((x) => ({ done: true, reps: x, weight: w })) });
  it("12 kg im Studio leicht: zuhause 13 kg, im Studio mehr Wiederholungen", () => {
    const rs = resolveSlot(slot, studio)!;
    const st = advance(rs, undefined, entry(rs, 12, [12, 12, 12], "leicht"), studio, "2026-10-01");
    const gymS = suggest(rs, st, 1, studio);
    expect(gymS.weight).toBe(12);
    expect(gymS.targetReps).toBeGreaterThan(12);
    const rh = resolveSlot(slot, homeP)!;
    const homeS = suggest(rh, st, 1, homeP);
    expect(homeS.weight).toBe(13);
    expect(homeS.targetReps).toBeGreaterThanOrEqual(9);
  });
  it("12 kg im Studio OK: zuhause 11,5 kg mit mehr Wiederholungen", () => {
    const rs = resolveSlot(slot, studio)!;
    const st = advance(rs, undefined, entry(rs, 12, [12, 12, 12], "ok"), studio, "2026-10-01");
    const homeS = suggest(resolveSlot(slot, homeP)!, st, 1, homeP);
    expect(homeS.weight).toBe(11.5);
    expect(homeS.targetReps).toBeGreaterThanOrEqual(14);
  });
  it("dreimal OK mit gleichem Gewicht und gleichen Wiederholungen: nächste Stufe", () => {
    const r = resolveSlot({ id: "bp", name: "Bench Press", sets: 3, reps: "5", prog: "weight" }, gym)!;
    const e = (w: number): SessionEntry => ({ key: r.key, slotId: "bp", name: r.name, prog: "weight", feedback: "ok", sets: [5, 5, 5].map((x) => ({ done: true, reps: x, weight: w })) });
    let st = advance(r, undefined, e(80), gym, "d1");
    st = advance(r, st, e(80), gym, "d2");
    expect(st.weight).toBe(80);
    st = advance(r, st, e(80), gym, "d3");
    expect(st.nudge).toBe(true);
    expect(st.weight! > 80 || st.target! > 5).toBe(true);
    expect(suggest(r, st, 1, gym).gap).toMatch(/Dreimal OK/);
    // danach wieder normal
    st = advance(r, st, e(st.weight!), gym, "d4");
    expect(st.nudge).toBe(false);
  });
});

describe("Start-Bestie", () => {
});

describe("Bestien: Ausrüstung und Wochenvolumen", () => {
  it("Zahhak braucht Ringe und Band", async () => {
    const { beastFits, beastNeeds } = await import("./plan");
    const k = BEASTS.find((b) => b.name === "Zahhak")!;
    expect([...beastNeeds(k)].sort()).toEqual(["band", "band_or_cable", "rings"]);
    const withRings: EquipmentProfile = { ...home, has: { ...home.has, rings: true }, bands: ["mittel"] };
    expect(beastFits(k, withRings)).toBe(true);
    expect(beastFits(k, { ...withRings, has: { ...withRings.has, rings: false } })).toBe(false);
    const undine = BEASTS.find((b) => b.name === "Undine")!;
    expect(beastFits(undine, { ...withRings, has: { ...withRings.has, rower: false } })).toBe(false);
  });
  it("Bestien zählen halb: Undine (1 Runde, 20 Muscle-Ups, 100 Squats) gibt je Übung einen halben Satz", async () => {
    const { beastSets } = await import("./volume");
    const v = beastSets("ng-nanna");
    expect(v.Rücken).toBeCloseTo(1); // zweimal Muscle-Ups × 0,5
    expect(v.Quadrizeps).toBeCloseTo(0.5);
    expect(v.Brust ?? 0).toBe(0); // Rudern zählt nicht
  });
});

describe("Bandstärken", () => {
});

describe("Gewichte in Bestien", () => {
});

describe("Lastbestien", () => {
  it("Item, Timecap, 1RM-Prozent, Rekord nur im Timecap", async () => {
    const { capOf, loadKind, pctLift, oneRM, suggestLoad, loadRecord } = await import("./loadbeast");
    const by = (n: string) => BEASTS.find((b) => b.name === n)!;
    expect(loadKind(by("Kusarikku"))).toBe("kettlebell");
    expect(loadKind(by("Anzu"))).toBe("dumbbell");
    expect(loadKind(by("Ugallu"))).toBe("barbell");
    expect(loadKind(by("Peri"))).toBe("band");
    expect(loadKind(by("Undine"))).toBeNull();
    expect(capOf(by("Lamassu"))).toBe(17);
    expect(capOf(by("Undine"))).toBeNull();
    const lam = by("Lamassu");
    expect(pctLift(lam)).toEqual({ exercise: "Bench Press", pct: 0.5 });
    const s = sample();
    expect(suggestLoad(s, lam, gym)).toBeNull(); // 1RM unbekannt: selbst festlegen
    const withRM = { ...s, oneRM: { "Bench Press": { kg: 100, date: "2026-10-01" } } };
    expect(suggestLoad(withRM, lam, gym)?.kg).toBe(50);
    const logged = { ...s, sessions: [{ id: "x", date: "2026-10-01", blockId: "b1", focusId: "knight", week: 1, role: "a", profileId: "g", drills: {}, menu: {}, done: true,
      entries: { k: { key: "k", slotId: "k", name: "Bench Press", prog: "double" as const, sets: [{ done: true, reps: 5, weight: 90 }] } } }] };
    expect(oneRM(logged, "Bench Press")?.kg).toBe(105);
    const rec = loadRecord(lam, [{ date: "a", seconds: 900, kg: 50 }, { date: "b", seconds: 1200, kg: 60 }, { date: "c", seconds: 1000, kg: 55 }]);
    expect(rec?.kg).toBe(55); // 60 kg lag über dem Timecap von 17 Min
  });
});

describe("Start-Bestie nicht doppelt", () => {
});

describe("Keine Bestie zweimal hintereinander", () => {
  it("alle Orden, 12 Wochen, mit und ohne Skill-Training, auch nach Entlastungswochen: Vorwoche und Folgewoche teilen keine Bestie", async () => {
    const { beastFamily } = await import("./plan");
    const s = sample();
    const users = [s.user, { ...s.user, skills: [], skillTraining: true }, { ...s.user, skills: ["pullup", "dip"], skillTraining: true }];
    const bad: string[] = [];
    for (const f of Object.values(FOCUS_BY_ID)) {
      const blocks = Object.values(f.roles).flatMap((r) => r.blocks).filter((x) => x.type === "beast") as Extract<import("../types").Block, { type: "beast" }>[];
      for (const b of blocks) for (const user of users) for (const prof of [{ ...gym, id: "g" }, { ...reise, id: "r" }]) {
        const st = { ...s, user };
        for (let w = 2; w <= 12; w++) for (const prevRed of [false, true]) {
          const o = (week: number, reduced: boolean) => pickBeast(b, { blockId: `b-${f.id}`, week, profile: prof, state: st, reduced, downgrade: false });
          const a = o(w - 1, prevRed), c = o(w, false);
          if (!a || !c) continue;
          const fa = new Set(beastFamily(a.id));
          if (beastFamily(c.id).some((x) => fa.has(x))) bad.push(`${f.id}/${b.id} W${w - 1}${prevRed ? "(entl.)" : ""}→W${w}: ${a.name} → ${c.name}`);
        }
      }
    }
    if (bad.length) console.log(bad.join("\n"));
    expect(bad).toEqual([]);
  }, 60000);
  it("geloggte Bestie der Vorwoche zählt, auch aus der vorigen Phase", () => {
    const s = sample();
    const b = Object.values(FOCUS_BY_ID.assassin.roles).flatMap((r) => r.blocks).find((x) => x.type === "beast" && x.id === "sk-beast") as Extract<import("../types").Block, { type: "beast" }>;
    const plan = [{ id: "b-assassin", focusId: "assassin", label: "", start: "2026-10-05", end: "2026-11-29", load: "medium" as const, travel: false }];
    const st = { ...s, plan };
    const opts = { blockId: "b-assassin", week: 1, profile: { ...gym, id: "g" }, state: st, reduced: false, downgrade: false };
    const w1 = pickBeast(b, opts)!;
    const prev = { id: "x:9:a", date: "2026-10-02", blockId: "x", focusId: "witcher", week: 9, role: "a", profileId: "g", entries: {}, drills: {}, menu: {}, done: true, beast: { id: w1.id, seconds: 900 } };
    const w1b = pickBeast(b, { ...opts, state: { ...st, sessions: [prev] } })!;
    expect(w1b.id).not.toBe(w1.id);
  });
});

describe("Nord und Süd", () => {
  it("Morgenlandbestien haben externen Widerstand, Nordbestien nicht, und die Namen passen", async () => {
    const { beastRegion } = await import("./plan");
    const sued = BEASTS.filter((b) => beastRegion(b) === "sued").map((b) => b.name).sort();
    expect(sued).toEqual(["Anzu", "Asag", "Bahamut", "Ghul", "Girtablullu", "Gugalanna", "Huma", "Humbaba", "Ifrit", "Karkadann", "Kingu", "Kusarikku", "Lamaschtu", "Lamassu", "Mantikor", "Marid", "Pazuzu", "Peri", "Qarin", "Roch", "Schahmaran", "Schedu", "Simurgh", "Sirrusch", "Tiamat", "Ugallu", "Zahhak"]);
    expect(BEASTS.filter((b) => beastRegion(b) === "nord").length).toBe(54);
    expect(beastRegion(BEASTS.find((b) => b.name === "Undine")!)).toBe("nord");
  });
});

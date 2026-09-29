import { describe, expect, it } from "vitest";
import { FOCI, FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
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
    user: { ...s.user, asym: { hip: "L", neck: null, shoulder_ir: null, shoulder_er: null } },
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
  it("lädt alle 18 Orden", () => {
    expect(FOCI.length).toBe(18);
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
  it("Asymmetrie verlängert die schwache Seite", () => {
    const s = sample();
    const d = expandDrills(["base"], s.user, 1).find((x) => x.id === "wu-9090")!;
    expect(d.groups[0]).toMatchObject({ label: "Links", value: 40 });
    expect(d.groups[1]).toMatchObject({ label: "Rechts", value: 25 });
  });
  it("Bestie passt zum Equipment", () => {
    const st = emptyState();
    const b = pickBeast({ type: "beast", id: "t", classes: ["bestie"], draw: "rotate" }, { blockId: "x", week: 1, profile: reise, state: st, reduced: false, downgrade: false });
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
    expect(findNorm("t-pushups", undefined, "w", 37)).toBeNull();
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
    expect(b.label).toBe("allround");
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
    const blk = { type: "beast" as const, id: "t", classes: ["uralte" as const] };
    const b = pickBeast(blk, { blockId: "b1", week: 1, profile: gym, state: s, reduced: false, downgrade: false })!;
    expect(b.parts?.length).toBeGreaterThan(0);
    expect(beastClass(b.minutes)).toBe("uralte");
    expect(b.parts!.every((p) => beastOk(beastById(p.id)!, new Set()))).toBe(true);
    expect(beastById(b.id)?.name).toBe(b.name);
    const b2 = pickBeast(blk, { blockId: "b1", week: 2, profile: gym, state: s, reduced: false, downgrade: false })!;
    expect(b2.id).not.toBe(b.id);
    // Reihenfolge der Paare wechselt: über viele Wochen kommt jede Bestie auch mal zuerst
    const firsts = new Set<string>(), seconds = new Set<string>();
    for (let w = 1; w <= 60; w++) { const x = pickBeast(blk, { blockId: "b1", week: w, profile: gym, state: s, reduced: false, downgrade: false })!; if (x.parts?.length === 2) { firsts.add(x.parts[0].id); seconds.add(x.parts[1].id); } }
    expect([...seconds].some((id) => firsts.has(id))).toBe(true);
  });
});

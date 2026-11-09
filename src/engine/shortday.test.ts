import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import type { Block, Focus, Slot } from "../types";
import { estimateRole } from "./duration";
import { CLASS_ORDER, defaultRoles, moduleDrills, shortSwordDrills } from "./plan";
import { equipOf } from "./resolve";
import { isStrength } from "./slots";
import { SHORT_MAX, SHORT_LIMIT, shortDay, shortDeload, shortEligible } from "./shortday";

const P = { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() };
const user = emptyState().user;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const strengthBlocks = (bs: Block[], ab: "A" | "B") => bs.filter((b) => (b.type === "single" || b.type === "superset" || b.type === "contrast") && (!b.rotation || b.rotation === ab));

describe("Kurztag", () => {
  for (const f of Object.values(FOCUS_BY_ID)) {
    if (f.medley?.length) continue;
    for (const n of [3, 4, 5]) {
      const wr = defaultRoles(f, n);
      for (const rk of wr.filter((k) => shortEligible(f.roles[k]))) it(`${f.id}.${rk} (${n} Tage): bis fünf Übungen verdichtet, kurze Bestie und kurzes Schwert, Ziel 30 Minuten, Ausgleich mit Deckel +15 Minuten`, () => {
        const { focus, report } = shortDay(f, rk, user, wr);
        const short = focus.roles[rk];
        // Die vier Kernübungen (je A/B-Woche), Bestie und Schwerttraining bleiben drin, aber kürzer
        for (const ab of ["A", "B"] as const) expect(strengthBlocks(short.blocks, ab).length).toBeLessThanOrEqual(SHORT_MAX);
        const oBeast = f.roles[rk].blocks.find((b) => b.type === "beast");
        const nBeast = short.blocks.find((b) => b.type === "beast");
        if (oBeast && nBeast) expect(nBeast.classes).toEqual((oBeast.classes?.length ? oBeast.classes : (["bestie", "ungeheuer"] as const)).map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]));
        const hadSword = f.roles[rk].blocks.some((b) => b.type === "module" && b.module === "sword");
        if (hadSword) expect((short.blocks.find((b) => b.type === "module" && b.module === "sword") as { short?: true } | undefined)?.short).toBe(true);
        // Ziel 30 Minuten — wenn es nicht reicht, sind alle Sätze schon unten (oder die Timer an ihrer Untergrenze)
        const est = estimateRole(short, P[short.location]).total;
        const timerFloor = (x: Slot) => { const o = f.roles[rk].blocks.flatMap(slotsOf).find((y) => y.id === x.id); return (x.minutes ?? 0) <= Math.max(10, Math.ceil((o?.minutes ?? 0) / 2 / (x.step ?? 5)) * (x.step ?? 5)); };
        const atFloor = short.blocks.flatMap(slotsOf).filter(isStrength).every((s) => (s.sets ?? 3) <= 1) && short.blocks.flatMap(slotsOf).filter((x) => x.kind === "timer").every(timerFloor);
        expect(est <= SHORT_LIMIT + 0.6 || atFloor).toBe(true);
        // Ausgleich: kein Tag über seiner Obergrenze und nie mehr als 15 Minuten über seiner normalen Dauer
        for (const k of wr.filter((x) => x !== rk)) {
          const orig = estimateRole(f.roles[k], P[f.roles[k].location]).total;
          const lim = Math.min(Math.max(f.roles[k].cap ?? Math.max(f.roles[k].minutes, f.session_min), orig), orig + 15);
          expect(estimateRole(focus.roles[k], P[focus.roles[k].location]).total, `${k}`).toBeLessThanOrEqual(lim + 0.6);
        }
        // Kernübungen: am Kurztag oder an einem anderen Tag, sonst offen gemeldet
        const all = new Set(wr.flatMap((k) => JSON.stringify(focus.roles[k].blocks).match(/"id":"[^"]+"/g) ?? []));
        const cores = (JSON.stringify(f.roles[rk].blocks).match(/"id":"[^"]+","core":true/g) ?? []).map((x) => x.replace(/,"core":true/, ""));
        const missing = cores.filter((c) => !all.has(c));
        expect(missing.length <= report.unresolved.filter((u) => u.includes("passt an keinem")).length).toBe(true);
        // Ausgleich: im Studio nie zwei Maschinen oder Kabel als Superset
        for (const k of wr.filter((x) => x !== rk)) {
          const r = focus.roles[k];
          if (r.location !== "gym") continue;
          const ids = (x: { slots: { id: string }[] }) => x.slots.map((y) => y.id).join("+");
          const orig = new Set(f.roles[k].blocks.flatMap((x) => (x.type === "superset" ? [ids(x)] : [])));
          for (const bl of r.blocks) if (bl.type === "superset" && !bl.finisher && !orig.has(ids(bl))) {
            const st = bl.slots.filter((x) => ["machine", "cable"].includes(equipOf(x.name)));
            expect(st.length, `${k}: ${bl.slots.map((x) => x.name).join(" + ")}`).toBeLessThan(2);
          }
        }
      });
    }
  }
  it("leidet das Ziel nicht, bleiben die anderen Tage unverändert", () => {
    const f = FOCUS_BY_ID.knight;
    const wr = defaultRoles(f, 4);
    const { focus, report } = shortDay(f, "lower_a", user, wr);
    expect(report.changes).toEqual([]);
    for (const k of wr.filter((x) => x !== "lower_a")) expect(focus.roles[k]).toEqual(f.roles[k]);
  });
  it("Assassin: Kurztag am Dienstag behält alle vier Kernübungen, höchstens 30 Minuten", () => {
    const f = FOCUS_BY_ID.assassin;
    const { report, focus } = shortDay(f, "arme_schultern", user, defaultRoles(f, 4));
    for (const n of ["Chest Press Machine", "Chest-Supported Row Machine", "Face Pull", "Incline Cable Curl"]) expect(report.kept).toContain(n);
    expect(focus.roles.arme_schultern.minutes).toBeLessThanOrEqual(30);
  });
  it("Kurz verdichtet: Gegenspieler als Superset (Smith: Bench Press + Pull-Up)", () => {
    const f = FOCUS_BY_ID.smith;
    const { focus } = shortDay(f, "kraft_1", user, defaultRoles(f, 4));
    expect(focus.roles.kraft_1.blocks.some((b) => b.type === "superset" && b.slots.some((x) => x.why?.some((w) => w.startsWith("Verdichtet"))))).toBe(true);
  });
  it("Kurz in der Entlastungswoche: keine Supersets dazu, keine anderen Tage verändert", () => {
    const f = FOCUS_BY_ID.knight;
    const out = shortDeload(f, "upper_a");
    const added = out.roles.upper_a.blocks.filter((b) => b.type === "superset").length;
    expect(added).toBeLessThanOrEqual(f.roles.upper_a.blocks.filter((b) => b.type === "superset").length);
    for (const k of Object.keys(f.roles).filter((k) => k !== "upper_a")) expect(out.roles[k]).toBe(f.roles[k]);
  });
  it("Grundlagentag ohne Kraftübungen: Inhalt bleibt, Dauer geht Richtung 30 Minuten", () => {
    const f = FOCUS_BY_ID.pilgrim;
    const orig = f.roles.grundlage.blocks.flatMap(slotsOf).find((s) => s.kind === "timer")!;
    const { focus, report } = shortDay(f, "grundlage", user, defaultRoles(f, 4));
    const r = focus.roles.grundlage;
    expect(report.dropped).toEqual([]);
    expect(r.blocks.length).toBe(f.roles.grundlage.blocks.length);
    const t = r.blocks.flatMap(slotsOf).find((s) => s.kind === "timer")!;
    expect(t.minutes!).toBeLessThan(orig.minutes!);
    expect(t.minutes!).toBeGreaterThanOrEqual(Math.max(10, Math.ceil(orig.minutes! / 2 / (orig.step ?? 5)) * (orig.step ?? 5)));
    expect(estimateRole(r, P[r.location]).total <= SHORT_LIMIT + 0.6 || t.minutes! <= Math.max(10, Math.ceil(orig.minutes! / 2 / (orig.step ?? 5)) * (orig.step ?? 5))).toBe(true);
    expect(report.unresolved).toEqual([]);
    expect(report.changes).toEqual([]);
  });
  it("Schwerttraining: kurze Fassung behält jede Übung und zieht nur je einen Satz ab", () => {
    const full = moduleDrills("einzelmesser", user, 1);
    const short = shortSwordDrills(full);
    expect(short.length).toBe(full.length);
    for (let i = 0; i < full.length; i++) {
      expect(short[i].id).toBe(full[i].id);
      expect(short[i].sets).toBe(Math.max(1, (full[i].sets ?? 1) - 1));
      expect(short[i].groups?.map((g) => g.sets)).toEqual(full[i].groups?.map((g) => Math.max(1, g.sets - 1)));
    }
  });
  it("Kürzung verteilt gleich: auch Kernübungen geben einen Satz ab, Supersets behalten gleiche Sätze", () => {
    const mk = (id: string, name: string, sets: number, extra?: Partial<Slot>): Slot => ({ id, name, sets, reps: "8-10", prog: "none", rest: 180, kind: "strength", ...extra });
    const f: Focus = {
      ...FOCUS_BY_ID.smith, id: "kurztest",
      roles: { k: { name: "Gleichmäßig", location: "gym", minutes: 60, warmup: ["short_base"], cooldown: [],
        blocks: [
          { type: "single", slot: mk("k1", "Back Squat", 4, { core: true }) },
          { type: "single", slot: mk("k2", "Barbell Row", 4, { core: true }) },
          { type: "superset", rest: 60, slots: [mk("k3", "Band Face Pull", 4), mk("k4", "Wrist Curl", 4)] },
          { type: "superset", rest: 60, slots: [mk("k5", "DB Lateral Raise", 4), mk("k6", "DB Rear Delt Fly", 4)] },
        ] } },
    };
    const { focus } = shortDay(f, "k", user, ["k"]);
    const r = focus.roles.k;
    const sets = (id: string) => r.blocks.flatMap(slotsOf).find((s) => s.id === id)!.sets!;
    // Die Kürzung rotiert über alle Übungen: auch die beiden Kernübungen geben Sätze ab
    expect(sets("k1")).toBeLessThan(4);
    expect(sets("k2")).toBeLessThan(4);
    // Supersets bleiben Supersets: beide Teile immer mit derselben Satzanzahl
    expect(sets("k3")).toBe(sets("k4"));
    expect(sets("k5")).toBe(sets("k6"));
    expect(estimateRole(r, P.gym).total).toBeLessThanOrEqual(SHORT_LIMIT + 0.6);
  });
  it("ungleiche Supersets werden erst angeglichen: nach der Kürzung haben beide Teile gleich viele Sätze", () => {
    const mk = (id: string, name: string, sets: number, extra?: Partial<Slot>): Slot => ({ id, name, sets, reps: "8-10", prog: "none", rest: 180, kind: "strength", ...extra });
    const f: Focus = {
      ...FOCUS_BY_ID.smith, id: "angleich",
      roles: { k: { name: "Angleich", location: "gym", minutes: 60, warmup: ["short_base"], cooldown: [],
        blocks: [
          { type: "superset", rest: 60, slots: [mk("a1", "Band Face Pull", 3), mk("a2", "Wrist Curl", 2)] },
          { type: "superset", rest: 60, slots: [mk("b1", "DB Lateral Raise", 3), mk("b2", "DB Rear Delt Fly", 2)] },
          { type: "single", slot: mk("a3", "Back Squat", 5, { core: true }) },
          { type: "single", slot: mk("a4", "Barbell Row", 5, { core: true }) },
        ] } },
    };
    const { focus } = shortDay(f, "k", user, ["k"]);
    const sets = (id: string) => focus.roles.k.blocks.flatMap(slotsOf).find((s) => s.id === id)!.sets!;
    expect(sets("a1")).toBe(sets("a2"));
    expect(sets("b1")).toBe(sets("b2"));
    expect(estimateRole(focus.roles.k, P.gym).total).toBeLessThanOrEqual(SHORT_LIMIT + 0.6);
  });
});

import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import type { Block, Slot } from "../types";
import { estimateRole } from "./duration";
import { CLASS_ORDER, defaultRoles } from "./plan";
import { equipOf } from "./resolve";
import { isStrength } from "./slots";
import { SHORT_KEEP, SHORT_LIMIT, shortDay, shortEligible } from "./shortday";

const P = { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() };
const user = emptyState().user;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : b.type === "menu" ? Object.values(b.options).slice(0, 1) : []);
const strengthBlocks = (bs: Block[], ab: "A" | "B") => bs.filter((b) => (b.type === "single" || b.type === "superset" || b.type === "contrast" || b.type === "menu") && (!b.rotation || b.rotation === ab));

describe("Kurztag", () => {
  for (const f of Object.values(FOCUS_BY_ID)) {
    if (f.medley?.length) continue;
    for (const n of [3, 4, 5]) {
      const wr = defaultRoles(f, n);
      for (const rk of wr.filter((k) => shortEligible(f.roles[k]))) it(`${f.id}.${rk} (${n} Tage): vier Kernübungen, kurze Bestie und kurzes Schwert, Ziel 35 Minuten, Ausgleich mit Deckel +15 Minuten`, () => {
        const { focus, report } = shortDay(f, rk, user, wr);
        const short = focus.roles[rk];
        // Die vier Kernübungen (je A/B-Woche), Bestie und Schwerttraining bleiben drin, aber kürzer
        for (const ab of ["A", "B"] as const) expect(strengthBlocks(short.blocks, ab).length).toBeLessThanOrEqual(SHORT_KEEP);
        const oBeast = f.roles[rk].blocks.find((b) => b.type === "beast");
        const nBeast = short.blocks.find((b) => b.type === "beast");
        if (oBeast && nBeast) expect(nBeast.classes).toEqual((oBeast.classes?.length ? oBeast.classes : (["bestie", "ungeheuer"] as const)).map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]));
        const hadSword = f.roles[rk].blocks.some((b) => b.type === "module" && b.module === "sword");
        if (hadSword) expect((short.blocks.find((b) => b.type === "module" && b.module === "sword") as { short?: true } | undefined)?.short).toBe(true);
        // Ziel 35 Minuten — wenn es nicht reicht, sind alle Sätze schon unten
        const est = estimateRole(short, P[short.location]).total;
        const atFloor = short.blocks.flatMap(slotsOf).filter(isStrength).every((s) => (s.sets ?? 3) <= 1);
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
    const f = FOCUS_BY_ID.smith;
    const wr = defaultRoles(f, 4);
    const { focus, report } = shortDay(f, "kraft_1", user, wr);
    expect(report.changes).toEqual([]);
    for (const k of wr.filter((x) => x !== "kraft_1")) expect(focus.roles[k]).toEqual(f.roles[k]);
  });
  it("Assassin: Kurztag am Dienstag behält alle vier Kernübungen, höchstens 35 Minuten", () => {
    const f = FOCUS_BY_ID.assassin;
    const { report, focus } = shortDay(f, "arme_schultern", user, defaultRoles(f, 4));
    expect(report.kept).toEqual(["Chest Press Machine", "Chest-Supported Row Machine", "Face Pull", "Incline Cable Curl"]);
    expect(focus.roles.arme_schultern.minutes).toBeLessThanOrEqual(35);
  });
  it("Grundlagentag ohne Kraftübungen: Inhalt bleibt, Dauer geht Richtung 35 Minuten", () => {
    const f = FOCUS_BY_ID.pilgrim;
    const orig = f.roles.grundlage.blocks.flatMap(slotsOf).find((s) => s.kind === "timer")!;
    const { focus, report } = shortDay(f, "grundlage", user, defaultRoles(f, 4));
    const r = focus.roles.grundlage;
    expect(report.dropped).toEqual([]);
    expect(r.blocks.length).toBe(f.roles.grundlage.blocks.length);
    const t = r.blocks.flatMap(slotsOf).find((s) => s.kind === "timer")!;
    expect(t.minutes!).toBeLessThan(orig.minutes!);
    expect(t.minutes!).toBeGreaterThanOrEqual(Math.max(10, Math.ceil(orig.minutes! / 2 / (orig.step ?? 5)) * (orig.step ?? 5)));
    expect(estimateRole(r, P[r.location]).total).toBeLessThanOrEqual(SHORT_LIMIT + 0.6);
    expect(report.unresolved).toEqual([]);
    expect(report.changes).toEqual([]);
  });
});

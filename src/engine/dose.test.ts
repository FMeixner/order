import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Beast, PlanBlock } from "../types";
import { collectItems } from "../ui/session/items";
import { beastDose, cardioRange, coreTarget, doseMode, DOSE_GROUPS, DOSE_MUSCLES, packetSize, repsPerRound, wavePos } from "./dose";
import { dayRoleMap, doseAt, shortBeast, composeBeast } from "./plan";
import { musclesOf, volumeRange } from "./volume";
import { focusFor } from "./weekplan";

const [gym, home, reise] = EQUIPMENT_PRESETS.map((p) => p.make());
const user = emptyState().user; // fortgeschritten
const beast = (work: string, rounds: number, minutes = 15): Beast => ({ id: `x-${work}`, name: "X", orig: "X", rounds, minutes, equipment: [], work });
const state = (fid: string, weeks = 12, extra: Partial<AppState> = {}): AppState => {
  const s = emptyState();
  const end = new Date(Date.UTC(2026, 8, 28 + weeks * 7 - 1)).toISOString().slice(0, 10);
  return {
    ...s, equipment: [{ ...gym, id: "g" }, { ...home, id: "h" }, { ...reise, id: "r" }], schedule: { Mo: "g", Di: "r", Do: "h", Fr: "g" },
    plan: [{ id: "b1", focusId: fid, label: "", start: "2026-09-28", end, load: "medium", travel: false }], ...extra,
  };
};

describe("Päckchen-Zählung", () => {
  it("Venus: 4 Runden 50 Push-ups, 20 Crunches, 50 Squats → 4 + 2 + 2 Sätze, über die Muskelanteile verteilt", () => {
    const st = { packets: { Pushups: 25, Crunches: 20, Squats: 50 }, tests: {} };
    const d = beastDose(beast("50 Pushups · 20 Crunches · 50 Squats", 4), user, st);
    const exp = (name: string, sets: number, m: string) => sets * (musclesOf(name)[m] ?? 0);
    expect(d.Brust).toBeCloseTo(exp("Pushups", 4, "Brust"));
    expect(d.Quadrizeps).toBeCloseTo(exp("Squats", 2, "Quadrizeps"));
    expect(d.Rumpf ?? 0).toBeCloseTo(exp("Pushups", 4, "Rumpf") + exp("Crunches", 2, "Rumpf") + exp("Squats", 2, "Rumpf"));
  });
  it("Leitern je Runde, Halten und Strecken ein Päckchen je Runde, Kondition zählt keine Sätze", () => {
    expect(repsPerRound("40/30/20/10 Pistol Squats", 4)).toEqual([40, 30, 20, 10]);
    expect(repsPerRound("30s Hollow Hold", 3)).toBeNull();
    expect(repsPerRound("2x40m Sprints", 3)).toBeNull();
    const st = { packets: { "Pistol Squats": 10 }, tests: {} };
    const lad = beastDose(beast("40/30/20/10 Pistol Squats", 4), user, st);
    expect(lad.Quadrizeps).toBeCloseTo((4 + 3 + 2 + 1) * 0.5 * (musclesOf("Pistol Squats").Quadrizeps ?? 0));
    const hold = beastDose(beast("30s Hollow Hold", 3), user);
    expect(hold.Rumpf).toBeCloseTo(3 * 0.5 * (musclesOf("Hollow Hold").Rumpf ?? 0));
    expect(Object.keys(beastDose(beast("1k Run · Rest 60s", 3), user))).toEqual([]);
  });
  it("Partial, Doppel, Triple skalieren die Dosis", () => {
    const b = beast("20 Pushups · 20 Squats", 4, 12);
    const full = beastDose(b, user).Brust!;
    expect(beastDose(shortBeast(b, 2)!, user).Brust).toBeCloseTo(full / 2);
    expect(beastDose(composeBeast([[b, 2]]), user).Brust).toBeCloseTo(full * 2);
    expect(beastDose(composeBeast([[b, 3]]), user).Brust).toBeCloseTo(full * 3);
  });
  it("Päckchengröße: Niveau, Testwert (60 %), eigener Wert schlägt alles", () => {
    expect(packetSize("Pushups", { ...user, level: "einsteiger" })).toBeLessThan(packetSize("Pushups", { ...user, level: "erfahren" }));
    const tests = { "t-pushups": [{ date: "2026-09-01", blockId: "t", value: 40, raw: "40" }] };
    expect(packetSize("Pushups", user, { tests })).toBe(24);
    expect(packetSize("Pushups", user, { tests, packets: { Pushups: 30 } })).toBe(30);
    // Wer stärker wird, braucht weniger Päckchen für dieselbe Bestie
    const weak = beastDose(beast("50 Pushups", 4), user, { tests: { "t-pushups": [{ date: "2026-09-01", blockId: "t", value: 20, raw: "20" }] } });
    const strong = beastDose(beast("50 Pushups", 4), user, { tests });
    expect(strong.Brust!).toBeLessThan(weak.Brust!);
  });
});

describe("Modus je Achse", () => {
  it("aus den Zielen; Pilgrim, King, Magician wie entschieden; Hirsch hält", () => {
    expect(doseMode(FOCUS_BY_ID.knight)).toEqual({ muscle: "progress", cardio: "maintain" });
    expect(doseMode(FOCUS_BY_ID.gladiator)).toEqual({ muscle: "progress", cardio: "progress" });
    expect(doseMode(FOCUS_BY_ID.pilgrim)).toEqual({ muscle: "maintain", cardio: "progress" });
    expect(doseMode(FOCUS_BY_ID.king)).toEqual({ muscle: "soft", cardio: "soft" });
    expect(doseMode(FOCUS_BY_ID.alchemist)).toEqual({ muscle: "maintain", cardio: "soft" });
    expect(doseMode(FOCUS_BY_ID.monk, { klammer: "regeneration" } as PlanBlock)).toEqual({ muscle: "maintain", cardio: "maintain" });
  });
});

describe("Welle und Trajektorie", () => {
  it("12 Wochen: Entlastung in Woche 5 und 9, Stufe steigt danach, Woche 1 Start, Woche 4 Gipfel", () => {
    const st = state("knight");
    const b = st.plan[0];
    expect(wavePos(st.plan, b, 1)).toMatchObject({ stage: 1, pos: 0, len: 4, deload: false });
    expect(wavePos(st.plan, b, 4)).toMatchObject({ stage: 1, pos: 3 });
    expect(wavePos(st.plan, b, 5)).toMatchObject({ deload: true });
    expect(wavePos(st.plan, b, 6)).toMatchObject({ stage: 2, pos: 0 });
    expect(wavePos(st.plan, b, 10)).toMatchObject({ stage: 3, pos: 0 });
  });
  it("Knight: Ziel steigt in der Welle, nie unter den festen Übungen, Entlastung halbiert, Obergrenze +15 %", () => {
    const st = state("knight");
    const b = st.plan[0];
    const [lo, hi] = volumeRange(st.user);
    const w1 = doseAt(st, b, 1)!, w4 = doseAt(st, b, 4)!, w5 = doseAt(st, b, 5)!;
    for (const mu of DOSE_MUSCLES) {
      expect(w4.muscle[mu]).toBeGreaterThanOrEqual(w1.muscle[mu]);
      expect(w1.muscle[mu]).toBeGreaterThanOrEqual(Math.round((w1.fixed[mu] ?? 0) * 2) / 2 - 0.01);
      expect(w1.cap[mu]).toBeCloseTo(Math.round(w1.muscle[mu] * 1.15 * 2) / 2);
      expect(w4.muscle[mu]).toBeLessThanOrEqual(Math.max(hi, Math.ceil(w4.fixed[mu] ?? 0)) + 0.01);
    }
    expect(Math.max(...DOSE_MUSCLES.map((m) => w4.muscle[m]))).toBeGreaterThanOrEqual(lo);
    expect(w5.deload).toBe(true);
  });
  it("Testwoche: keine Dosis; jede Woche jedes Ordens hat ein erreichbares Ziel", () => {
    expect(doseAt(state("knight"), { id: "t", focusId: "test", label: "", start: "2026-12-21", end: "2026-12-27", load: "medium", travel: false }, 1)).toBeNull();
    for (const fid of Object.keys(FOCUS_BY_ID)) {
      const st = state(fid, 10);
      for (let w = 1; w <= 10; w++) {
        const d = doseAt(st, st.plan[0], w);
        if (!d) continue;
        for (const mu of DOSE_MUSCLES) expect(d.cap[mu], `${fid} W${w} ${mu}`).toBeGreaterThanOrEqual(d.muscle[mu]);
        expect(d.cardio).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("Rumpf: festes Ziel in jedem Orden, unabhängig von Modus und Welle (Knight, Monk, Pilgrim)", () => {
    for (const fid of ["knight", "monk", "pilgrim"]) {
      const st = state(fid);
      const w1 = doseAt(st, st.plan[0], 1)!, w4 = doseAt(st, st.plan[0], 4)!;
      expect(w1.muscle.Rumpf, fid).toBe(w4.muscle.Rumpf);
      expect(w1.muscle.Rumpf, fid).toBeLessThanOrEqual(Math.max(coreTarget(st.user), w1.fixed.Rumpf ?? 0) + 0.01);
    }
  });
  it("Kondition: Spanne je Niveau", () => {
    expect(cardioRange({ ...user, level: "einsteiger" })[1]).toBeLessThan(cardioRange({ ...user, level: "erfahren" })[1]);
  });
});

describe("Wahl und feste Konditionsslots", () => {
  it("die Bestien einer Woche schieben keine Gruppe über die Obergrenze, wenn es anders geht (Stichprobe King, Gladiator, Knight)", () => {
    for (const fid of ["king", "gladiator", "knight"]) {
      const st = state(fid);
      const b = st.plan[0];
      let over = 0, n = 0;
      for (let w = 1; w <= 8; w++) {
        const d = doseAt(st, b, w);
        const f = focusFor(st, b, w)!;
        if (!d) continue;
        const sum: Record<string, number> = {};
        for (const day of dayRoleMap(st, b, f)) {
          const profile = st.equipment.find((e) => e.id === day.profileId)!;
          for (const it of collectItems({ state: st, block: b, focus: f, week: w, roleKey: day.role, profile, date: "2026-10-01", reduced: false } as never)) {
            if (!it.beast) continue;
            for (const [m, v] of Object.entries(beastDose(it.beast, st.user, st))) sum[m] = (sum[m] ?? 0) + v;
          }
        }
        for (const ms of Object.values(DOSE_GROUPS)) {
          n++;
          const room = ms.reduce((x, mu) => x + Math.max(0, d.cap[mu] - (d.fixed[mu] ?? 0)), 0);
          if (ms.reduce((x, mu) => x + (sum[mu] ?? 0), 0) > room + 0.6) over++;
        }
      }
      // Grenzfälle erlaubt (Varianz geht vor, dann der kleinste Überhang), aber selten
      expect(over / n, fid).toBeLessThan(0.15);
    }
  });
  it("Pilgrim: Intervalle wachsen in der Welle, nach der Entlastung zurück, nie über das Zeitlimit", () => {
    const st = state("pilgrim");
    const b = st.plan[0];
    const rounds = (w: number) => {
      const r = focusFor(st, b, w)!.roles.intervalle;
      const s = r.blocks.find((x) => x.type === "single" && x.slot.kind === "interval");
      return s && s.type === "single" ? s.slot.interval!.rounds : 0;
    };
    const base = (FOCUS_BY_ID.pilgrim.roles.intervalle.blocks.find((x) => x.type === "single" && x.slot.kind === "interval") as { slot: { interval: { rounds: number } } }).slot.interval.rounds;
    expect(rounds(1)).toBe(base);
    expect(rounds(4)).toBeGreaterThanOrEqual(base);
    expect(rounds(4)).toBeLessThanOrEqual(base + 2);
    expect(rounds(6)).toBe(base);
  });
});

describe("Ids", () => {
  it("„~hex“ findet die Bestie auch, wenn ein Skill keinen Ersatz hat", async () => {
    const { beastById } = await import("./plan");
    expect(beastById("ng-aslaug~hex")).not.toBeNull();
  });
});

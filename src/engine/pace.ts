/* Dein Tempo (1.51.7, Friedrich): Die Dauerschätzung lernt aus den Häkchen-Uhrzeiten.
   - Je Übung ergibt der Abstand zweier abgehakter Sätze einen Zyklus aus Pause + Satz (der erste Satz zählt nicht,
     er wird erst nach dem Satz abgehakt). Erwartet: geplante Pause + Wiederholungen × 3,5 s.
   - Gelernt wird ein Faktor je Übungsart (Kraft, Körpergewicht, explosiv) × Ausrichtung des Ordens (Hauptklasse),
     als Median der letzten 30 Zyklen. Fehlen Daten (< 8), gilt die Übungsart über alle Orden, sonst der Standard (1).
   - Wechsel zwischen Übungen (letztes Häkchen → erstes der nächsten) ergibt einen eigenen Faktor für Umbau und ersten Satz.
   - Nicht gezählt: Supersets und Kontrastpaare (eigener Rhythmus), Entlastungswochen, Intensiv-Tage, Ausreißer
     (unter 0,3- oder über 3-fach erwartet, z. B. ein Telefonat). */
import { EXERCISES, FOCUS_BY_ID } from "../data";
import type { AppState, Block, OrderClass, Slot } from "../types";

/** Wie POWER in weekplan.ts (hier kopiert, um einen Import-Kreis über duration.ts zu vermeiden) */
const POWER_RX = /jump|sprung|sprint|shuttle|throw|wurf|slam|hop|bound|clap|plyo|skater|medball|medizinball|brustpass|chest pass|broad|depth/i;

export type PaceCat = "strength" | "bodyweight" | "explosive";
export const SEC_PER_REP = 3.5;
export const SETUP_SEC = 45;
const KEEP = 30;
const MIN_N = 8;

export const paceCat = (name: string): PaceCat =>
  POWER_RX.test(name) ? "explosive" : EXERCISES[name]?.equip === "bodyweight" ? "bodyweight" : "strength";

export interface Pace {
  /** Faktor für Pause + Satz je Übungsart in diesem Orden */
  cycle: (cat: PaceCat) => number;
  /** Faktor für Umbau und ersten Satz */
  setup: number;
  /** Zyklen, auf denen die Schätzung beruht */
  n: number;
}
export const NEUTRAL_PACE: Pace = { cycle: () => 1, setup: 1, n: 0 };

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const slotsOf = (b: Block): { s: Slot; single: boolean; rest?: number }[] =>
  b.type === "single" ? [{ s: b.slot, single: true }] : b.type === "superset" ? b.slots.map((s) => ({ s, single: false })) : b.type === "contrast" ? [{ s: b.heavy, single: false }, { s: b.explosive, single: false }] : b.type === "module" && b.fallback ? [{ s: b.fallback, single: true }] : [];

type Learned = { cyc: Map<string, number[]>; setup: number[] };
const memo = new WeakMap<AppState["sessions"], Learned>();

function learn(state: AppState): Learned {
  const hit = memo.get(state.sessions);
  if (hit) return hit;
  const cyc = new Map<string, number[]>();
  const setup: number[] = [];
  const push = (k: string, v: number) => { const a = cyc.get(k) ?? []; if (a.length < KEEP) { a.push(v); cyc.set(k, a); } };
  const sessions = state.sessions.filter((s) => s.done).sort((a, b) => b.date.localeCompare(a.date));
  for (const se of sessions) {
    if (state.energy?.[se.id] || state.deload?.[`${se.blockId}:${se.week}`] === "ja") continue;
    const f = FOCUS_BY_ID[se.focusId];
    const cls: OrderClass | "?" = f?.class?.primary ?? "?";
    const info = new Map<string, { rest: number; single: boolean }>();
    for (const r of Object.values(f?.roles ?? {})) for (const b of r.blocks) for (const x of slotsOf(b)) info.set(x.s.id, { rest: x.s.rest ?? 90, single: x.single });
    const firsts: { t0: number; t1: number; reps: number; name: string }[] = [];
    for (const e of Object.values(se.entries)) {
      const sets = e.sets.filter((x) => x.done && x.doneAt).map((x) => ({ t: Date.parse(x.doneAt!), reps: x.reps })).sort((a, b) => a.t - b.t);
      if (!sets.length) continue;
      firsts.push({ t0: sets[0].t, t1: sets[sets.length - 1].t, reps: sets[0].reps ?? 8, name: e.name });
      const inf = info.get(e.slotId);
      if (!inf?.single) continue;
      const cat = paceCat(e.name);
      for (let i = 1; i < sets.length; i++) {
        const reps = sets[i].reps;
        if (reps == null) continue;
        const ratio = (sets[i].t - sets[i - 1].t) / 1000 / (inf.rest + reps * SEC_PER_REP);
        if (ratio < 0.3 || ratio > 3) continue;
        push(`${cat}|${cls}`, ratio);
        push(`${cat}|*`, ratio);
      }
    }
    firsts.sort((a, b) => a.t0 - b.t0);
    for (let i = 1; i < firsts.length; i++) {
      const ratio = (firsts[i].t0 - firsts[i - 1].t1) / 1000 / (SETUP_SEC + firsts[i].reps * SEC_PER_REP);
      if (ratio >= 0.3 && ratio <= 4 && setup.length < KEEP * 2) setup.push(ratio);
    }
  }
  const out = { cyc, setup };
  memo.set(state.sessions, out);
  return out;
}

/** Dein Tempo für einen Orden (Ausrichtung aus seiner Hauptklasse) */
export function paceFor(state: AppState, cls?: OrderClass): Pace {
  const l = learn(state);
  const pick = (cat: PaceCat) => {
    const own = l.cyc.get(`${cat}|${cls ?? "?"}`) ?? [];
    if (own.length >= MIN_N) return median(own);
    const any = l.cyc.get(`${cat}|*`) ?? [];
    return any.length >= MIN_N ? median(any) : 1;
  };
  const n = [...l.cyc.entries()].filter(([k]) => k.endsWith("|*")).reduce((a, [, v]) => a + v.length, 0);
  return { cycle: pick, setup: l.setup.length >= MIN_N ? median(l.setup) : 1, n };
}

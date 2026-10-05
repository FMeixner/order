/* Sätze pro Muskel und Woche, aus den abgeschlossenen Einheiten. Wertneutral: ein Richtwert, kein Soll. */
import { allRuns } from "./runs";
import { SWAP_GROUPS } from "../data";
import musclesJson from "../../data/modules/muscles.json";
import type { AppState, UserProfile } from "../types";
import { addDays, beastById, beastPartName, mondayOf } from "./plan";

type Share = Record<string, number>;
const M = musclesJson as unknown as { muscles: string[]; groups: Record<string, Share>; exercises: Record<string, Share>; patterns: [string, Share][] };
export const MUSCLES = M.muscles;
const PATTERNS = M.patterns.map(([rx, s]) => ({ rx: new RegExp(rx, "i"), s }));

export function musclesOf(name: string): Share {
  if (M.exercises[name]) return M.exercises[name];
  for (const [g, members] of Object.entries(SWAP_GROUPS)) if (members.includes(name) && M.groups[g]) return M.groups[g];
  return PATTERNS.find((p) => p.rx.test(name))?.s ?? {};
}

/** Bestien zählen halb: jede Übung je Runde ein halber Satz. Laufen, Rudern, Pausen zählen nicht. */
export const BEAST_FACTOR = 0.5;
const CARDIO = /^(row|run|sprints?|bike|rest\b|obstacle run|jumping jacks|single unders|handstand practice)/i;
export function beastSets(id: string): Share {
  const b = beastById(id);
  if (!b) return {};
  const units = b.parts ?? [{ rounds: b.rounds, work: b.work }];
  const out: Share = {};
  for (const u of units) {
    for (const part of u.work.split(" · ")) {
      const name = beastPartName(part);
      if (!name || CARDIO.test(name)) continue;
      for (const [m, f] of Object.entries(musclesOf(name))) out[m] = (out[m] ?? 0) + u.rounds * BEAST_FACTOR * f;
    }
  }
  return out;
}

/** Richtwert nach Erfahrung, oder der eigene */
export function volumeRange(u: UserProfile): [number, number] {
  if (u.volumeRange) return u.volumeRange;
  return u.level === "einsteiger" ? [6, 10] : u.level === "erfahren" ? [12, 20] : [10, 16];
}

export interface WeekVolume { monday: string; sessions: number; sets: Record<string, number>; running: boolean }

/** Wochen mit Einheiten, neueste zuerst */
export function weeklyVolume(state: AppState, today: string): WeekVolume[] {
  const byWeek = new Map<string, WeekVolume>();
  for (const s of state.sessions.filter((x) => x.done)) {
    const mon = mondayOf(s.date);
    const w = byWeek.get(mon) ?? { monday: mon, sessions: 0, sets: {}, running: addDays(mon, 6) >= today };
    w.sessions += 1;
    for (const e of Object.values(s.entries)) {
      if (e.prog === "none") continue;
      const n = e.sets.filter((x) => x.done).length;
      if (!n) continue;
      for (const [m, f] of Object.entries(musclesOf(e.name))) w.sets[m] = (w.sets[m] ?? 0) + n * f;
    }
    // Bestien: halb gezählt
    const runs = allRuns(s).filter((x) => !!x.seconds);
    for (const r of runs) for (const [m, v] of Object.entries(beastSets(r.id))) w.sets[m] = (w.sets[m] ?? 0) + v;
    byWeek.set(mon, w);
  }
  return [...byWeek.values()].sort((a, b) => b.monday.localeCompare(a.monday));
}

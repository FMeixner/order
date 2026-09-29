/* Sätze pro Muskel und Woche, aus den abgeschlossenen Einheiten. Wertneutral: ein Richtwert, kein Soll. */
import { SWAP_GROUPS } from "../data";
import musclesJson from "../../data/modules/muscles.json";
import type { AppState, UserProfile } from "../types";
import { addDays, mondayOf } from "./plan";

type Share = Record<string, number>;
const M = musclesJson as unknown as { muscles: string[]; groups: Record<string, Share>; exercises: Record<string, Share>; patterns: [string, Share][] };
export const MUSCLES = M.muscles;
const PATTERNS = M.patterns.map(([rx, s]) => ({ rx: new RegExp(rx, "i"), s }));

export function musclesOf(name: string): Share {
  if (M.exercises[name]) return M.exercises[name];
  for (const [g, members] of Object.entries(SWAP_GROUPS)) if (members.includes(name) && M.groups[g]) return M.groups[g];
  return PATTERNS.find((p) => p.rx.test(name))?.s ?? {};
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
    byWeek.set(mon, w);
  }
  return [...byWeek.values()].sort((a, b) => b.monday.localeCompare(a.monday));
}

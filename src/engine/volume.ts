/* Sätze pro Muskel und Woche, aus den abgeschlossenen Einheiten. Wertneutral: ein Richtwert, kein Soll. */
import { allRuns, isHunt } from "./runs";
import { SWAP_GROUPS } from "../data";
import musclesJson from "../../data/modules/muscles.json";
import type { AppState, UserProfile } from "../types";
import { addDays, beastById, mondayOf } from "./plan";
import { beastDose } from "./dose";

type Share = Record<string, number>;
const M = musclesJson as unknown as { muscles: string[]; groups: Record<string, Share>; exercises: Record<string, Share>; patterns: [string, Share][] };
export const MUSCLES = M.muscles;
const PATTERNS = M.patterns.map(([rx, s]) => ({ rx: new RegExp(rx, "i"), s }));

export function musclesOf(name: string): Share {
  if (M.exercises[name]) return M.exercises[name];
  for (const [g, members] of Object.entries(SWAP_GROUPS)) if (members.includes(name) && M.groups[g]) return M.groups[g];
  return PATTERNS.find((p) => p.rx.test(name))?.s ?? {};
}

/** Bestien zählen nach Päckchen (dose.ts): Wiederholungen am Stück je Niveau, ein Päckchen = ein halber Satz.
    Laufen, Rudern, Pausen zählen nicht als Sätze. */
export { BEAST_FACTOR } from "./dose";
const DEFAULT_USER = { level: "fortgeschritten" } as UserProfile;
export function beastSets(id: string, user: UserProfile = DEFAULT_USER, state?: Pick<AppState, "packets" | "tests">): Share {
  const b = beastById(id);
  return b ? beastDose(b, user, state) : {};
}

/** Richtwert nach Erfahrung, oder der eigene */
export function volumeRange(u: UserProfile): [number, number] {
  if (u.volumeRange) return u.volumeRange;
  return u.level === "einsteiger" ? [6, 10] : u.level === "erfahren" ? [12, 20] : [10, 16];
}

/** Erhaltung: in etwa die Hälfte des unteren Richtwerts. Erhaltung gelingt meist schon mit einem Drittel bis der Hälfte des Aufbauvolumens, darunter wird Halten von Kraft und Masse knapp. */
export function maintenanceVolume(u: UserProfile): number {
  return volumeRange(u)[0] / 2;
}

export interface WeekVolume { monday: string; sessions: number; sets: Record<string, number>; running: boolean }

/** Wochen mit Einheiten, neueste zuerst */
export function weeklyVolume(state: AppState, today: string): WeekVolume[] {
  const byWeek = new Map<string, WeekVolume>();
  for (const s of state.sessions.filter((x) => x.done)) {
    const mon = mondayOf(s.date);
    const w = byWeek.get(mon) ?? { monday: mon, sessions: 0, sets: {}, running: addDays(mon, 6) >= today };
    if (!isHunt(s)) w.sessions += 1;
    for (const e of Object.values(s.entries)) {
      if (e.prog === "none") continue;
      const n = e.sets.filter((x) => x.done).length;
      if (!n) continue;
      for (const [m, f] of Object.entries(musclesOf(e.name))) w.sets[m] = (w.sets[m] ?? 0) + n * f;
    }
    // Bestien: halb gezählt
    const runs = allRuns(s).filter((x) => !!x.seconds);
    for (const r of runs) for (const [m, v] of Object.entries(beastSets(r.id, state.user, state))) w.sets[m] = (w.sets[m] ?? 0) + v;
    byWeek.set(mon, w);
  }
  return [...byWeek.values()].sort((a, b) => b.monday.localeCompare(a.monday));
}

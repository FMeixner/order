/* Skill-Sterne (1.51, Friedrich; strenger seit 1.51.3): Drücken, Ziehen, Beine, Körperbeherrschung, je bis zu fünf Sterne
   (data/modules/stars.json).
   - Ein Kriterium ist geschafft, wenn es im Training geloggt ist (ein erledigter Satz mit mindestens so vielen
     Wiederholungen bzw. Sekunden) oder sein Können-Häkchen gesetzt ist (Umstieg aus der alten Liste).
   - Ein Stern gilt erst, wenn ALLE seine Kriterien geschafft sind. Ein höherer Stern schließt die niedrigeren ein.
   - Umgekehrt setzt ein geloggtes Kriterium sein Können-Häkchen — daran hängen Übungs- und Bestienwahl wie bisher.
   - Lernpfade (paths): je Kriterium die Schritte davor. Die Schwerpunkt-Karte Skill übt in der Dimension mit den
     wenigsten Sternen den ersten offenen Schritt zum nächsten Stern, der am Ort geht (Progressionen nach Low, 2016).
   - Eine begonnene Karte bleibt stehen: Was in der laufenden Einheit geloggt wird, zählt erst ab der nächsten. */
import starsJson from "../../data/modules/stars.json";
import { EXERCISES } from "../data";
import type { AppState, EquipmentProfile, Slot } from "../types";
import { available } from "./resolve";

export type StarDim = "push" | "pull" | "legs" | "control";
export interface StarCrit { name: string; reps?: number; seconds?: number; skill?: string }
const S = starsJson as unknown as { dims: Record<StarDim, string>; stars: Record<StarDim, StarCrit[][]>; paths: Record<string, StarCrit[]> };
export const STAR_DIMS = Object.keys(S.dims) as StarDim[];
export const DIM_NAME = S.dims;
export const STARS = S.stars;
export const PATHS = S.paths;
/** Höchster erreichbarer Stern je Dimension (Drücken hat keinen fünften) */
export const maxStar = (d: StarDim) => STARS[d].filter((x) => x.length).length;

type SetLike = { done: boolean; reps?: number; seconds?: number };
/** Bestleistung je Übung aus dem Log (ohne die genannte Einheit) */
export type Log = Map<string, SetLike[]>;
export function starLog(state: Pick<AppState, "sessions">, excludeId?: string): Log {
  const byName: Log = new Map();
  for (const s of state.sessions) {
    if (s.id === excludeId) continue;
    for (const e of Object.values(s.entries)) {
      const arr = byName.get(e.name) ?? [];
      arr.push(...e.sets);
      byName.set(e.name, arr);
    }
  }
  return byName;
}
const loggedMet = (c: StarCrit, log: Log) =>
  (log.get(c.name) ?? []).some((x) => x.done && (c.seconds != null ? (x.seconds ?? 0) >= c.seconds : (x.reps ?? 0) >= (c.reps ?? Infinity)));
/** Kriterium geschafft: geloggt oder per Können-Häkchen */
export const critMet = (c: StarCrit, log: Log, ticks: Set<string>) => loggedMet(c, log) || (!!c.skill && ticks.has(c.skill));

/** Geloggte Kriterien mit Häkchen (zum Nachtragen in user.skills) */
export function loggedStars(state: Pick<AppState, "sessions">): { level: Record<StarDim, number>; skills: Set<string> } {
  const log = starLog(state);
  const skills = new Set<string>();
  for (const d of STAR_DIMS) for (const crits of STARS[d]) for (const c of crits) if (c.skill && loggedMet(c, log)) skills.add(c.skill);
  return { level: levelsFrom(log, new Set()), skills };
}

function levelsFrom(log: Log, ticks: Set<string>): Record<StarDim, number> {
  const out = { push: 0, pull: 0, legs: 0, control: 0 } as Record<StarDim, number>;
  for (const d of STAR_DIMS) STARS[d].forEach((crits, i) => {
    if (crits.length && crits.every((c) => critMet(c, log, ticks))) out[d] = Math.max(out[d], i + 1);
  });
  return out;
}

/** Sterne je Dimension: höchster Stern, dessen Kriterien alle geschafft sind */
export function starLevels(state: Pick<AppState, "sessions" | "user">, excludeId?: string): Record<StarDim, number> {
  return levelsFrom(starLog(state, excludeId), new Set(state.user.skills ?? []));
}

/** Häkchen, die das Log neu verdient hat (zum Nachtragen in user.skills); null, wenn nichts fehlt oder kein Skillcheck */
export function skillsToAdd(state: Pick<AppState, "sessions" | "user">): string[] | null {
  if (state.user.skills == null) return null;
  const have = new Set(state.user.skills);
  const add = [...loggedStars(state).skills].filter((s) => !have.has(s));
  return add.length ? add : null;
}

/** Schwächste Dimensionen (ohne volle): wenigste Sterne zuerst; bei Gleichstand dreht die Woche die Reihenfolge */
export function weakestDims(levels: Record<StarDim, number>, week: number): StarDim[] {
  const open = STAR_DIMS.filter((d) => levels[d] < maxStar(d));
  const rot = (d: StarDim) => (STAR_DIMS.indexOf(d) - week + 400) % STAR_DIMS.length;
  return open.sort((a, b) => levels[a] - levels[b] || rot(a) - rot(b));
}

/** Lernpfad eines Kriteriums: Schritte davor, zuletzt das Kriterium */
export const pathOf = (c: StarCrit): StarCrit[] => [...(PATHS[c.name] ?? []), c];

/** Was die Karte übt: im nächsten Stern das erste offene Kriterium, das am Ort geht, darin der erste offene Schritt.
    Geht kein Schritt eines Kriteriums am Ort, kommt das nächste Kriterium dran. */
export function practiceFor(d: StarDim, level: number, p: EquipmentProfile, log: Log = new Map(), ticks: Set<string> = new Set()):
  { crit: StarCrit; step: StarCrit; target: number } | null {
  const ok = (c: StarCrit) => !!EXERCISES[c.name] && available(c.name, p);
  const star = STARS[d][level] ?? [];
  for (const crit of star) {
    if (critMet(crit, log, ticks)) continue;
    const step = pathOf(crit).find((s) => ok(s) && !loggedMet(s, log));
    if (step) return { crit, step, target: level + 1 };
  }
  return null;
}

/** Skill-Übung: zwei Sätze (Friedrich, 1.51.3). Wiederholungen so viele wie sauber gehen, Halten mit Zielzeit. */
export function practiceSlot(d: StarDim, level: number, p: EquipmentProfile, roleKey: string, log?: Log, ticks?: Set<string>): Slot | null {
  const x = practiceFor(d, level, p, log, ticks);
  if (!x) return null;
  const base = { id: `${roleKey}-skill-${d}`, name: x.step.name, sets: 2, rest: 120 } as Slot;
  return x.step.seconds != null
    ? { ...base, kind: "hold", hold: x.step.seconds, prog: "hold", max: x.step.seconds } as Slot
    : { ...base, reps: "AMRAP", prog: "reps", note: `Ziel: ${x.step.reps} saubere Wiederholungen am Stück.` } as Slot;
}

/** Klartext: „Ziehen ★★★☆☆“ */
export const starLine = (d: StarDim, n: number) => `${DIM_NAME[d]} ${"★".repeat(n)}${"☆".repeat(Math.max(0, maxStar(d) - n))}`;
/** Ziel als Text */
export const critText = (c: StarCrit) => `${c.name} ${c.seconds != null ? `${c.seconds} s` : `${c.reps} Wdh`}`;

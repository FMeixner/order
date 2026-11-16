/* Skill-Sterne (1.51, Friedrich): Drücken, Ziehen, Beine, Körperbeherrschung, je bis zu fünf Sterne (data/modules/stars.json).
   - Ein Stern gilt, sobald eines seiner Kriterien im Training geloggt ist: ein erledigter Satz mit mindestens so vielen
     Wiederholungen bzw. Sekunden. Höhere Sterne schließen die niedrigeren ein.
   - Die Können-Häkchen (Setup › Können) zählen beim Umstieg als Sterne (legacy). Umgekehrt setzt ein verdienter Stern die
     Häkchen, die sein Kriterium mit erfüllt — daran hängen Übungs- und Bestienwahl (fehlt der Stern, läuft die mutierte
     Fassung) wie bisher.
   - Der Schwerpunkt Skill übt die Dimension mit den wenigsten Sternen (bevorzugt, nicht ausschließlich), bei Gleichstand
     zwei; geübt wird das erste Kriterium des nächsten Sterns, das am Ort geht, sonst eines des aktuellen. */
import starsJson from "../../data/modules/stars.json";
import { EXERCISES } from "../data";
import type { AppState, EquipmentProfile, Slot } from "../types";
import { available } from "./resolve";

export type StarDim = "push" | "pull" | "legs" | "control";
export interface StarCrit { name: string; reps?: number; seconds?: number; skill?: string }
const S = starsJson as unknown as { dims: Record<StarDim, string>; stars: Record<StarDim, StarCrit[][]>; legacy: Record<string, [StarDim, number]> };
export const STAR_DIMS = Object.keys(S.dims) as StarDim[];
export const DIM_NAME = S.dims;
export const STARS = S.stars;
/** Höchster erreichbarer Stern je Dimension (Drücken hat keinen fünften) */
export const maxStar = (d: StarDim) => STARS[d].filter((x) => x.length).length;

const met = (c: StarCrit, sets: { done: boolean; reps?: number; seconds?: number }[]) =>
  sets.some((x) => x.done && (c.seconds != null ? (x.seconds ?? 0) >= c.seconds : (x.reps ?? 0) >= (c.reps ?? Infinity)));

/** Geloggte Kriterien: je Dimension der höchste Stern, dazu die Häkchen, die sie mit erfüllen */
export function loggedStars(state: Pick<AppState, "sessions">): { level: Record<StarDim, number>; skills: Set<string> } {
  const level = { push: 0, pull: 0, legs: 0, control: 0 } as Record<StarDim, number>;
  const skills = new Set<string>();
  const byName = new Map<string, { done: boolean; reps?: number; seconds?: number }[]>();
  for (const s of state.sessions) for (const e of Object.values(s.entries)) {
    const arr = byName.get(e.name) ?? [];
    arr.push(...e.sets);
    byName.set(e.name, arr);
  }
  for (const d of STAR_DIMS) STARS[d].forEach((crits, i) => {
    for (const c of crits) {
      const sets = byName.get(c.name);
      if (!sets || !met(c, sets)) continue;
      level[d] = Math.max(level[d], i + 1);
      if (c.skill) skills.add(c.skill);
    }
  });
  return { level, skills };
}

/** Sterne je Dimension: höher aus Können-Häkchen (Umstieg) und Log */
export function starLevels(state: Pick<AppState, "sessions" | "user">): Record<StarDim, number> {
  const { level } = loggedStars(state);
  const out = { ...level };
  for (const id of state.user.skills ?? []) {
    const l = S.legacy[id];
    if (l) out[l[0]] = Math.max(out[l[0]], l[1]);
  }
  return out;
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

/** Übung für den nächsten Stern am Ort: erstes verfügbares Kriterium des nächsten Sterns, sonst eines des aktuellen */
export function practiceFor(d: StarDim, level: number, p: EquipmentProfile): { crit: StarCrit; target: number } | null {
  const ok = (c: StarCrit) => !!EXERCISES[c.name] && available(c.name, p);
  for (const target of [level + 1, level]) {
    const c = (STARS[d][target - 1] ?? []).find(ok);
    if (c) return { crit: c, target };
  }
  return null;
}

/** Slot für die Schwerpunkt-Karte Skill: Wiederholungen als AMRAP (die Eingabe verdient den Stern), Halten mit Zielzeit */
export function practiceSlot(d: StarDim, level: number, p: EquipmentProfile, roleKey: string): Slot | null {
  const x = practiceFor(d, level, p);
  if (!x) return null;
  const base = { id: `${roleKey}-skill-${d}`, name: x.crit.name, sets: 3, rest: 90 } as Slot;
  return x.crit.seconds != null
    ? { ...base, kind: "hold", hold: x.crit.seconds, prog: "hold", max: x.crit.seconds } as Slot
    : { ...base, reps: "AMRAP", prog: "reps" } as Slot;
}

/** Klartext: „Ziehen ★★★☆☆“ */
export const starLine = (d: StarDim, n: number) => `${DIM_NAME[d]} ${"★".repeat(n)}${"☆".repeat(Math.max(0, maxStar(d) - n))}`;
/** Ziel des nächsten Sterns als Text */
export const critText = (c: StarCrit) => `${c.name} ${c.seconds != null ? `${c.seconds} s` : `${c.reps} Wdh`}`;

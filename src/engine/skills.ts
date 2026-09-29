/* Skillcheck: filtert Übungen und Bestien nach dem, was jemand sauber kann. Daten in data/modules/skills.json. */
import { SKILLS } from "../data";
import type { Beast } from "../types";

/** Übung → Skill, den sie voraussetzt */
const NEEDS: Record<string, string> = {};
for (const s of SKILLS.skills) for (const e of s.exercises) NEEDS[e] = s.id;
const BEAST_RX = SKILLS.skills.filter((s) => s.beast).map((s) => ({ id: s.id, rx: new RegExp(s.beast, "i") }));

export type SkillSet = ReadonlySet<string> | null | undefined;

export const requiredSkill = (name: string): string | undefined => NEEDS[name];

/** Ohne Skillcheck (null) ist alles erlaubt */
export function skillOk(name: string, skills: SkillSet): boolean {
  if (!skills) return true;
  const need = NEEDS[name];
  return !need || skills.has(need);
}

/** Leichtere Übungen für eine Übung, deren Skill fehlt (in Reihenfolge) */
export function regressions(name: string): string[] {
  const need = NEEDS[name];
  if (!need) return [];
  return SKILLS.skills.find((s) => s.id === need)?.regress[name] ?? [];
}

/** Skills, die eine Bestie voraussetzt */
export function beastSkills(b: Beast): string[] {
  return BEAST_RX.filter(({ rx }) => b.work.split(" · ").some((w) => rx.test(w))).map((x) => x.id);
}
export function beastOk(b: Beast, skills: SkillSet): boolean {
  if (!skills) return true;
  return beastSkills(b).every((id) => skills.has(id));
}

/** Startstufe einer Leiter: höchste Stufe, die ein vorhandener Skill belegt */
export function ladderStart(ladder: string[], skills: SkillSet): number {
  if (!skills) return 0;
  let start = 0;
  for (const s of SKILLS.skills) if (skills.has(s.id)) for (const n of s.start ?? []) {
    const i = ladder.indexOf(n);
    if (i > start) start = i;
  }
  return start;
}

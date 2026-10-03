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

/* ---------- hexed: Bestie mit leichterer Übung für einen fehlenden Skill ---------- */
const HEX: Record<string, { rx: RegExp; to: string; factor: number }[]> = Object.fromEntries(
  SKILLS.skills.filter((s) => s.hex?.length).map((s) => [s.id, s.hex!.map(([rx, to, factor]) => ({ rx: new RegExp(rx, "i"), to, factor: factor ?? 1 }))]),
);

/** Wiederholungen am Anfang einer Teilaufgabe skalieren: „6/5/4 Clapping Pullups“ ×2 → „12/10/8 …“ */
function scaleLead(line: string, f: number): string {
  if (f === 1) return line;
  return line.replace(/^((?:Buy-(?:in|out):\s*|AMRAP[^:]*:\s*)?)([\d/]+)(?=[a-z]?\s)/i, (_m, pre: string, nums: string) => pre + nums.split("/").map((n) => String(Math.round(parseInt(n) * f))).join("/"));
}

/** hexed-Variante: jede Übung, deren Skill fehlt, durch ihren Ersatz getauscht (Wiederholungen nach Faktor, damit die Dauer etwa bleibt).
    Eine Id je Bestie („a~hex“), alle hexed-Varianten teilen sich eine Bestzeit. null, wenn für einen der Skills kein Ersatz hinterlegt ist. */
export function hexWith(b: Beast, skillIds: string[]): Beast | null {
  if (!skillIds.length || skillIds.some((id) => !HEX[id])) return null;
  const ids = [...skillIds].sort();
  const work = b.work.split(" · ").map((line) => {
    let out = line;
    for (const id of ids) for (const r of HEX[id]) if (r.rx.test(out)) out = scaleLead(out.replace(r.rx, r.to), r.factor);
    return out;
  }).join(" · ");
  return { ...b, id: `${b.id}~hex`, name: `${b.name} mutiert`, work, hexed: ids };
}

/** hexed-Variante für die Skills, die jemandem noch fehlen. null, wenn nichts fehlt oder kein Ersatz existiert. */
export function hexFor(b: Beast, skills: SkillSet): Beast | null {
  if (!skills) return null;
  return hexWith(b, beastSkills(b).filter((id) => !skills.has(id)));
}

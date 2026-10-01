/* Lädt alle Inhalte aus /data. Eine neue Datei in data/orders/ ist nach dem nächsten Build automatisch ein neuer Orden. */
import type { Beast, Cup, Drill, Exercise, Focus, Goal, Norm } from "./types";
import exercisesJson from "../data/exercises.json";
import beastsJson from "../data/beasts.json";
import correctivesJson from "../data/modules/correctives.json";
import swordJson from "../data/modules/sword.json";
import testweekJson from "../data/modules/testweek.json";
import guidedJson from "../data/modules/guided.json";
import swapsJson from "../data/modules/swaps.json";
import normsJson from "../data/modules/norms.json";
import skillsJson from "../data/modules/skills.json";
import flowsJson from "../data/modules/flows.json";
import sharpenJson from "../data/modules/sharpen.json";
import bandsJson from "../data/modules/bands.json";
import beastLoadsJson from "../data/modules/beast_loads.json";

const fociModules = import.meta.glob("../data/orders/*.json", { eager: true, import: "default" }) as Record<string, Focus>;

const ORDER = ["initiate", "knight", "smith", "olympian", "pilgrim", "troubadour", "herald", "monk", "king", "alchemist", "acrobat", "huntsman", "pugilist", "assassin", "witcher", "soldier", "gladiator", "conqueror", "harlequin"];

export const FOCI: Focus[] = Object.values(fociModules).sort((a, b) => {
  const ia = ORDER.indexOf(a.id), ib = ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
});
export const FOCUS_BY_ID: Record<string, Focus> = Object.fromEntries(FOCI.map((f) => [f.id, f]));

export const EXERCISES = exercisesJson as Record<string, Exercise>;
export const BEASTS = beastsJson as Beast[];
export const BEAST_BY_ID: Record<string, Beast> = Object.fromEntries(BEASTS.map((b) => [b.id, b]));
export const DRILL_LISTS = (correctivesJson as unknown as { lists: Record<string, Drill[]> }).lists;
export const DM_VARIANTS = (swordJson as unknown as { variants: Record<string, Drill[]> }).variants;
/** Freie Übung → geführte Variante (Maschine/Kabel) für Phasen mit hoher Last */
export const GUIDED = (guidedJson as unknown as { map: Record<string, string> }).map;
export const TESTWEEK = testweekJson as unknown as { cups: Cup[]; who5: string[]; who5_intro: string; who5_scale: string[] };
/** Tauschgruppen: Übungen mit ähnlichem Bewegungsmuster */
export const SWAP_GROUPS = (swapsJson as unknown as { groups: Record<string, string[]> }).groups;
export const NORMS = (normsJson as unknown as { norms: Norm[] }).norms;
export const DOMAINS = (normsJson as unknown as { domains: { id: string; name: string; goal: Goal; tests: string[] }[] }).domains;
export interface SkillDef { id: string; group: string; name: string; test: string; start?: string[]; exercises: string[]; regress: Record<string, string[]>; beast: string; hex?: [string, string][] }
export const SKILLS = skillsJson as unknown as { groups: { id: string; name: string }[]; skills: SkillDef[] };
/** Geführte Flows (Yoga, Qigong, Tai Chi, Animal Flow, Mobility) */
/** Bandstärken für Bestien-Übungen (relative Stufen) */
export const BANDS = bandsJson as unknown as { levels: string[]; exercises: Record<string, string> };
/** Gewichte für Bestien-Übungen ohne eigene Angabe */
export const BEAST_LOADS = beastLoadsJson as unknown as { tolerance: number; exercises: Record<string, { n: number; kg: number }> };
/** Schwerpunkt-Slot: Erhaltungsdosis je Bereich */
export interface SharpenDef { name: string; place: "start" | "end"; days: "all" | 1 | 2; why: string; drills: Drill[] }
export const SHARPEN = (sharpenJson as unknown as { domains: Record<string, SharpenDef> }).domains;
export const FLOWS = (flowsJson as unknown as { variants: Record<string, { name: string; drills: Drill[] }> }).variants;

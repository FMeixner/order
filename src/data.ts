/* Lädt alle Inhalte aus /data. Eine neue Datei in data/orders/ ist nach dem nächsten Build automatisch ein neuer Orden. */
import type { Beast, Cup, Drill, Exercise, Focus } from "./types";
import exercisesJson from "../data/exercises.json";
import beastsJson from "../data/beasts.json";
import correctivesJson from "../data/modules/correctives.json";
import doppelmesserJson from "../data/modules/doppelmesser.json";
import testweekJson from "../data/modules/testweek.json";

const fociModules = import.meta.glob("../data/orders/*.json", { eager: true, import: "default" }) as Record<string, Focus>;

const ORDER = ["initiate", "knight", "smith", "olympian", "pilgrim", "troubadour", "herald", "monk", "king", "alchemist", "acrobat", "huntsman", "pugilist", "assassin", "witcher", "soldier", "gladiator", "conqueror"];

export const FOCI: Focus[] = Object.values(fociModules).sort((a, b) => {
  const ia = ORDER.indexOf(a.id), ib = ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
});
export const FOCUS_BY_ID: Record<string, Focus> = Object.fromEntries(FOCI.map((f) => [f.id, f]));

export const EXERCISES = exercisesJson as Record<string, Exercise>;
export const BEASTS = beastsJson as Beast[];
export const BEAST_BY_ID: Record<string, Beast> = Object.fromEntries(BEASTS.map((b) => [b.id, b]));
export const DRILL_LISTS = (correctivesJson as unknown as { lists: Record<string, Drill[]> }).lists;
export const DM_VARIANTS = (doppelmesserJson as unknown as { variants: Record<string, Drill[]> }).variants;
export const TESTWEEK = testweekJson as unknown as { cups: Cup[]; who5: string[]; who5_intro: string; who5_scale: string[] };

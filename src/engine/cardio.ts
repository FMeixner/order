/* Laufen ersetzen: Rudergerät, Rad, Seilspringen oder Stepper statt Laufen, nicht 1:1, sondern nach vergleichbarer Belastungszeit.
   Und die Ortsregel: Wo Stationen weit auseinander liegen (Studio), keine Bestie, die Cardio mit einer festen Station mischt. */
import type { Beast, EquipmentProfile } from "../types";
import { beastNeeds } from "./plan";

export type CardioSub = "row" | "bike" | "rope" | "stair";
/** Was „Laufen ersetzen“ anbietet; "beast" = Laufblock wird zur Bestie (früher „Kein Laufen“) */
export type RunSub = CardioSub | "beast";

export const SUB_LABEL: Record<RunSub, string> = { row: "Rudergerät", bike: "Rad", rope: "Seilspringen", stair: "Stepper", beast: "Bestie" };
/** Übung in der Bibliothek, die einen Laufblock ersetzt */
export const SUB_EXERCISE: Record<CardioSub, string> = { row: "Rudergerät", bike: "Fahrrad-Ergometer", rope: "Seilspringen", stair: "Stepper (Stair Climber)" };

/* Richtwerte bei gleicher Anstrengung in einer Bestie (zügig, nicht maximal):
   Laufen etwa 5:00/km = 0,30 s/m, Rudern 2:00/500 m = 0,24 s/m, Rad-Ergometer etwa 30 km/h = 0,12 s/m.
   400 m Laufen ≈ 2 Min ≈ 500 m Rudern ≈ 1000 m Rad ≈ 2 Min Seil oder Stepper (übliche Umrechnung im funktionellen Training). */
const RUN_S_PER_M = 0.3;
const ROW_S_PER_M = 0.24;
const BIKE_S_PER_M = 0.12;
/** Sprint: etwa 0,17 s pro Meter, mindestens 5 s */
const SPRINT_S_PER_M = 0.17;

const roundTo = (x: number, step: number) => Math.max(step, Math.round(x / step) * step);
const meters = (n: number, unit: string) => (unit.toLowerCase() === "k" ? n * 1000 : n);

/** Laufstrecke (Meter) → Angabe für das Ersatzgerät, gleiche Zahl von Stufen wie im Original */
function convertRun(nums: number[], unit: string, to: CardioSub): string {
  const secs = nums.map((n) => meters(n, unit) * RUN_S_PER_M);
  switch (to) {
    case "row": return `${secs.map((s) => roundTo(s / ROW_S_PER_M, 50)).join("/")}m Row`;
    case "bike": return `${secs.map((s) => roundTo(s / BIKE_S_PER_M, 100)).join("/")}m Bike`;
    case "rope": return `${secs.map((s) => roundTo(s, 15)).join("/")}s Seilspringen`;
    case "stair": return `${secs.map((s) => roundTo(s, 15)).join("/")}s Stepper`;
  }
}
const SPRINT_NAME: Record<CardioSub, string> = { row: "Row-Sprints", bike: "Bike-Sprints", rope: "Seil-Sprints (so schnell wie möglich)", stair: "Stepper-Sprints" };

const RUN_RX = /(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)\s?(m|k)\s+(?:obstacle\s+)?run\b/gi;
const SPRINT_RX = /(\d+)\s?x\s?(\d+)\s?m\s+sprints?\b/gi;

/** Teilaufgaben mit Laufen tauschen; alles andere bleibt */
export function swapRunText(work: string, to: CardioSub): string {
  return work
    .replace(RUN_RX, (_m, n: string, unit: string) => convertRun(n.split("/").map(Number), unit, to))
    .replace(SPRINT_RX, (_m, k: string, m: string) => `${k}x${Math.max(5, Math.round(Number(m) * SPRINT_S_PER_M))}s ${SPRINT_NAME[to]}`);
}
export const hasRunText = (work: string) => new RegExp(RUN_RX.source, "i").test(work) || new RegExp(SPRINT_RX.source, "i").test(work);

/** Bestie mit ersetztem Laufen (Id bleibt: dieselbe Bestie, nur anderes Gerät) */
export function swapRunBeast(b: Beast, to: CardioSub | undefined): Beast {
  if (!to) return b;
  const works = [b.work, ...(b.parts?.map((p) => p.work) ?? [])];
  if (!works.some(hasRunText)) return b;
  return { ...b, work: swapRunText(b.work, to), parts: b.parts?.map((p) => ({ ...p, work: swapRunText(p.work, to) })) };
}

/* ---------- Ortsregel ---------- */
/** Stationen weit auseinander? Fehlt die Angabe: ja bei Profilen mit Maschinen (Studio) */
export const spreadOut = (p: Pick<EquipmentProfile, "spread" | "has">) => p.spread ?? !!p.has.machines;

const CARDIO_KINDS: [string, RegExp][] = [["run", /\brun\b|sprints?\b/i], ["row", /\d\s*c?\s*row\b|\d+m row\b/i], ["bike", /\bbike\b/i]];
/** Feste Station: Stange, Ringe, Langhantel, Kabel, Kasten, Wand für Handstand */
function needsStation(b: Beast): boolean {
  const n = beastNeeds(b);
  if (n.has("bar") || n.has("rings") || n.has("barbell") || n.has("band_or_cable")) return true;
  return /box jump|handstand/i.test(b.work);
}
/** Mischt die Bestie ein Cardiogerät (oder Laufstrecke) mit einer festen Station oder mit einem zweiten Cardiogerät? */
export function mixesStations(b: Beast): boolean {
  const kinds = CARDIO_KINDS.filter(([, rx]) => rx.test(b.work)).length;
  if (!kinds) return false;
  return kinds > 1 || needsStation(b);
}

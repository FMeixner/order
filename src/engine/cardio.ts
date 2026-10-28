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

/* ---------- Cardio am Ort: was der Ort nicht hergibt, wird nur bei diesem Element ersetzt ----------
   „Laufen möglich“ und „Sprints möglich“ sind Schalter am Equipment-Profil; Rudergerät und Rad stehen als Geräte drin.
   Fehlt etwas, wird nur das betroffene Element umgerechnet (gleiche Belastungszeit wie bei „Laufen ersetzen“),
   der Rest der Bestie bleibt — sie zählt als mutiert und teilt sich mit allen mutierten Varianten eine Bestzeit. */
/** Row-Kalorien („50c Row“) ≈ 4,5 Sekunden je Kalorie bei zügigem Tempo */
const ROW_S_PER_CAL = 4.5;
const ROW_RX = /(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)\s?(m|c)\s+row\b/gi;
const BIKE_RX = /(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)\s?(m|k)\s+bike\b/gi;
/** Ziel eines ersetzten Elements: „run“ zählt dazu, denn auch eine Laufstrecke kann fehlen */
export type LocSub = "run" | CardioSub;
const subAvail = (p: EquipmentProfile, t: LocSub): boolean =>
  t === "rope" ? true : t === "run" ? p.has.run : t === "row" ? p.has.rower : t === "bike" ? p.has.bike : false;
/** Erstes verfügbares Ziel; Seilspringen geht fast immer (kein eigenes Equipment-Flag) */
const subTarget = (p: EquipmentProfile, order: LocSub[]): CardioSub =>
  (order.find((t) => subAvail(p, t)) ?? "rope") as CardioSub;

/** Belastungszeit (Sekunden je Stufe) als Angabe für das Zielgerät */
function secsToTarget(secs: number[], to: LocSub): string {
  switch (to) {
    case "run": return `${secs.map((s) => roundTo(s / RUN_S_PER_M, 50)).join("/")}m Run`;
    case "row": return `${secs.map((s) => roundTo(s / ROW_S_PER_M, 50)).join("/")}m Row`;
    case "bike": return `${secs.map((s) => roundTo(s / BIKE_S_PER_M, 100)).join("/")}m Bike`;
    case "rope": return `${secs.map((s) => roundTo(s, 15)).join("/")}s Seilspringen`;
    case "stair": return `${secs.map((s) => roundTo(s, 15)).join("/")}s Stepper`;
  }
}

/** Cardiogerät am Ort ersetzen: Läufe, Sprints, Rudern und Rad nach verfügbarer Alternative, gleiche Belastungszeit */
export function swapLocText(work: string, p: EquipmentProfile): string {
  let out = work;
  if (!p.has.sprint) {
    const to = subTarget(p, ["row", "bike", "rope"]);
    out = out.replace(SPRINT_RX, (_m, k: string, m: string) => `${k}x${Math.max(5, Math.round(Number(m) * SPRINT_S_PER_M))}s ${SPRINT_NAME[to]}`);
  }
  if (!p.has.run) {
    const to = subTarget(p, ["row", "bike", "rope"]);
    out = out.replace(RUN_RX, (_m, n: string, unit: string) => secsToTarget(n.split("/").map(Number).map((x) => meters(x, unit) * RUN_S_PER_M), to));
  }
  if (!p.has.rower) {
    const to = subTarget(p, ["run", "bike", "rope"]);
    out = out.replace(ROW_RX, (_m, n: string, unit: string) => secsToTarget(n.split("/").map(Number).map((x) => (unit.toLowerCase() === "c" ? x * ROW_S_PER_CAL : x * ROW_S_PER_M)), to));
  }
  if (!p.has.bike) {
    const to = subTarget(p, ["run", "row", "rope"]);
    out = out.replace(BIKE_RX, (_m, n: string, unit: string) => secsToTarget(n.split("/").map(Number).map((x) => meters(x, unit) * BIKE_S_PER_M), to));
  }
  return out;
}
/** Steht in der Bestie ein Cardio-Element, das der Ort nicht hergibt? */
export const hasLocText = (work: string, p: EquipmentProfile): boolean =>
  (!p.has.sprint && new RegExp(SPRINT_RX.source, "i").test(work)) ||
  (!p.has.run && new RegExp(RUN_RX.source, "i").test(work)) ||
  (!p.has.rower && new RegExp(ROW_RX.source, "i").test(work)) ||
  (!p.has.bike && new RegExp(BIKE_RX.source, "i").test(work));

/** Bestie am Ort: Was der Ort nicht hergibt (Strecke für Läufe und Sprints, Rudergerät, Rad), wird nur bei diesen Elementen
    umgerechnet, der Rest bleibt. Die Bestie zählt als mutiert („X mutiert“, Id auf die hexed-Form) und teilt sich mit allen
    mutierten Varianten eine Bestzeit — das entfesselte Original behält seine eigene. null, wenn nichts zu ersetzen ist. */
export function beastLocSub(b: Beast, p: EquipmentProfile): Beast | null {
  const works = [b.work, ...(b.parts?.map((x) => x.work) ?? [])];
  if (!works.some((w) => hasLocText(w, p))) return null;
  return {
    ...b,
    id: `${b.id.split("~")[0]}~hex`,
    name: b.name.endsWith(" mutiert") ? b.name : `${b.name} mutiert`,
    work: swapLocText(b.work, p),
    parts: b.parts?.map((x) => ({ ...x, work: swapLocText(x.work, p) })),
  };
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

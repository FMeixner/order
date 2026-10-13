/* Wählt für einen Slot die konkrete Übung passend zum Equipment-Profil des Tages. */
import { EXERCISES, GUIDED, SWAP_GROUPS } from "../data";
import type { Choice, Equip, EquipmentProfile, Prog, Slot, SlotKind, Tier } from "../types";
import { isLoadable, loadScale } from "./loads";
import { ladderStart, regressions, skillOk, type SkillSet } from "./skills";

export interface Resolved {
  slotId: string;
  key: string; // slotId|Name: daran hängt die Historie
  name: string;
  /** Welche Variante des Slots gewählt wurde (Hauptübung = gym) */
  tier: Tier;
  equip: Equip;
  sets: number;
  reps: string;
  prog: Prog;
  kind: SlotKind;
  hold?: number;
  minutes?: number;
  max?: number;
  step: number;
  interval?: { work: number; rest: number; rounds: number };
  ladder?: string[];
  rest: number;
  note?: string;
  proposal?: boolean;
  missingEquipment: boolean;
  loadable: boolean;
  /** Geführte Variante statt freier Übung (Phase mit hoher Last) */
  guided?: boolean;
  /** Vom Nutzer getauschte Übung */
  swapped?: boolean;
  /** Anpassungen durch die App, für die Details */
  why?: string[];
  /** Übung, die ohne Tausch dran wäre */
  original: string;
  /** Übungen, die im Slot selbst stehen (Studio, Zuhause, Unterwegs, Leiter) */
  alts: string[];
  /** Gewählter Tausch, der mit diesem Profil nicht machbar ist */
  swapUnavailable?: string;
  /** Leichtere Übung, weil der Skill fehlt: ursprünglicher Name */
  regressedFrom?: string;
  /** Startstufe der Leiter nach Skillcheck */
  ladderStart?: number;
}

/** Schlüssel für einen Tausch: gilt je Slot und Ort (Equipment-Profil) */
export const swapKey = (slotId: string, profileId: string) => `${slotId}:${profileId}`;

/** Reihenfolge der Varianten eines Slots: Hauptübung des Ordens, dann die Varianten mit weniger Equipment.
    Der Ort hat keine Kategorie; es zählt nur, was dort verfügbar ist. */
const VARIANT_ORDER: Tier[] = ["gym", "home", "reise"];

function choiceFor(slot: Slot, tier: Tier): Choice | null | undefined {
  const own: Choice = slot.load ? { name: slot.name, load: slot.load } : { name: slot.name };
  if (tier === "gym") return own;
  const v = tier === "home" ? slot.home : slot.reise;
  if (v === null) return null;
  if (v === undefined) {
    if (tier === "reise") return slot.home === undefined ? own : choiceFor(slot, "home");
    return own;
  }
  return typeof v === "string" ? { name: v } : v;
}

export function equipOf(name: string): Equip {
  return EXERCISES[name]?.equip ?? "bodyweight";
}

/** Ist die Übung mit diesem Profil (und, wenn angegeben, diesen Skills) machbar? */
export function available(name: string, p: EquipmentProfile, skills?: SkillSet): boolean {
  if (!skillOk(name, skills)) return false;
  const ex = EXERCISES[name];
  if (!ex) return true;
  const e = ex.equip;
  if (e === "band" && !p.bands.length) return false;
  if (isLoadable(e) && e !== "vest" && !loadScale(p, e)) return false;
  for (const n of ex.needs ?? []) {
    if (n === "bar" && !p.has.bar) return false;
    if (n === "rings" && !p.has.rings) return false;
    if (n === "bench" && !p.has.bench) return false;
    if (n === "rower" && !p.has.rower) return false;
    if (n === "medball" && !p.has.medball) return false;
    if (n === "box" && !p.has.box) return false;
    if (n === "dip" && !p.has.dip) return false;
    if (n === "wheel" && !p.has.wheel) return false;
    // Defizit: Liegestützgriffe, Yoga-Blöcke, Ringe oder Kurzhanteln als Griffe
    if (n === "deficit" && !p.has.handles && !p.has.rings && !p.dumbbells.length) return false;
  }
  return true;
}

/** Zusatzlast (Gürtel mit Scheiben oder Weste): nur mit Langhantelscheiben oder Weste am Ort */
function loadOk(c: Choice, p: EquipmentProfile): boolean {
  return c.load !== "plate" || !!p.barbell || p.vest.length > 0;
}

/** Ersatz einer Übung, die am Ort nicht geht (Feld „instead“ in exercises.json) */
export function insteadOf(name: string, p: EquipmentProfile, skills?: SkillSet): { name: string; sets?: number } | null {
  if (available(name, p, skills)) return null;
  return EXERCISES[name]?.instead?.find((x) => available(x.name, p, skills)) ?? null;
}

function slotNames(slot: Slot): string[] {
  const n = (v: Slot["home"]) => (v == null ? null : typeof v === "string" ? v : v.name);
  return [slot.name, n(slot.home), n(slot.reise), ...(slot.ladder ?? [])].filter((x): x is string => !!x);
}

export function resolveSlot(slot: Slot, p: EquipmentProfile, reduced = false, swap?: string, skills?: SkillSet): Resolved | null {
  const base = resolveBase(slot, p, reduced, skills);
  if (!base || !swap || swap === base.name) return base;
  if (!available(swap, p, skills)) return { ...base, swapUnavailable: swap };
  const equip = equipOf(swap);
  let prog: Prog = base.prog;
  if (prog === "ladder") prog = base.kind === "hold" ? "hold" : "reps";
  if (isLoadable(equip) && (prog === "reps" || prog === "none") && base.kind === "strength" && slot.prog !== "none") prog = "double";
  if ((prog === "double" || prog === "weight" || prog === "topset") && !isLoadable(equip)) prog = "reps";
  const loadable = isLoadable(equip) && (prog === "double" || prog === "weight" || prog === "topset");
  return { ...base, key: `${slot.id}|${swap}`, name: swap, equip, prog, loadable, ladder: undefined, missingEquipment: false, swapped: true };
}

function resolveBase(slot: Slot, p: EquipmentProfile, reduced: boolean, skills?: SkillSet): Resolved | null {
  let chosen: { c: Choice; tier: Tier } | null = null;
  let fallback: { c: Choice; tier: Tier } | null = null;
  let regressedFrom: string | undefined;
  const cands = VARIANT_ORDER.map((t) => ({ t, c: choiceFor(slot, t) })).filter((x): x is { t: Tier; c: Choice } => !!x.c);
  // Erster Durchgang: Varianten des Ordens, die am Ort gehen (Hauptübung zuerst)
  for (const { t, c } of cands) {
    fallback = { c, tier: t }; // nichts machbar: die Variante mit dem wenigsten Equipment zeigen
    const ladderHere = !!slot.ladder && (t === "gym" || c.name === slot.name);
    if (!skillOk(c.name, skills) && !ladderHere) {
      // Skill fehlt: erst eine leichtere Variante derselben Übung, dann die nächste Alternative des Slots
      const easier = regressions(c.name).find((n) => available(n, p, skills));
      if (easier) { chosen = { c: { ...c, name: easier, load: undefined }, tier: t }; regressedFrom = c.name; break; }
      continue;
    }
    if (!available(c.name, p)) continue;
    if (loadOk(c, p)) { chosen = { c, tier: t }; break; }
    // Zusatzlast fehlt: dieselbe Übung ohne Last, außer der Orden hat dafür eine eigene Variante (z. B. AMRAP statt 5er)
    if (!cands.some((x) => x.c !== c && x.c.name === c.name && loadOk(x.c, p))) { chosen = { c: { ...c, load: undefined }, tier: t }; break; }
  }
  // Zweiter Durchgang: Ersatz aus der Bibliothek (z. B. Deficit Push-Up ohne Griffe: Banded Push-Up, sonst Push-Up mit einem Satz mehr)
  // Die Variante mit dem wenigsten Equipment zuerst: für diesen Fall hat der Orden sie vorgesehen
  if (!chosen) for (const { t, c } of [...cands].reverse()) {
    if (!skillOk(c.name, skills) && !(slot.ladder && (t === "gym" || c.name === slot.name))) continue;
    const alt = insteadOf(c.name, p, skills);
    if (alt) { chosen = { c: { ...c, name: alt.name, load: undefined, sets: (c.sets ?? slot.sets ?? 1) + (alt.sets ?? 0) }, tier: t }; break; }
  }
  const pick = chosen ?? fallback;
  if (!pick) return null;
  const c = pick.c;
  // Zusatzlast (Weste oder Gürtel): die Übung bleibt dieselbe, nur die Last kommt dazu
  const equip: Equip = c.load === "plate" ? "plate" : equipOf(c.name);
  const kind: SlotKind = (c as Choice & { kind?: SlotKind }).kind ?? slot.kind ?? "strength";
  let prog: Prog = c.prog ?? slot.prog ?? "none";
  if (c.load === "plate" && (prog === "reps" || prog === "ladder")) prog = "double";
  // Leiter: fehlt der Skill für die erste Stufe, kommt eine leichtere davor; mit Skill startet sie höher
  let ladder = pick.tier === "gym" || c.name === slot.name ? slot.ladder : undefined;
  if (ladder && !skillOk(ladder[0], skills)) {
    const easier = regressions(ladder[0]).find((n) => available(n, p, skills) && !ladder!.includes(n));
    if (easier) ladder = [easier, ...ladder];
  }
  if (regressedFrom && ladder) ladder = undefined;
  // Stufen, die am Ort nicht gehen, durch ihren Ersatz tauschen (Länge bleibt, damit die Stufe passt)
  if (ladder) ladder = ladder.map((n) => (available(n, p) ? n : insteadOf(n, p, skills)?.name ?? n));
  if (ladder && new Set(ladder).size === 1) ladder = undefined; // alle Stufen ersetzt: keine Leiter mehr
  if (prog === "ladder" && !ladder) prog = kind === "hold" ? "hold" : "reps";
  const loadable = isLoadable(equip) && (prog === "double" || prog === "weight" || prog === "topset");
  if ((prog === "double" || prog === "weight" || prog === "topset") && !isLoadable(equip)) prog = "reps";
  const baseSets = c.sets ?? slot.sets ?? 1;
  return {
    slotId: slot.id,
    key: `${slot.id}|${c.name}`,
    name: c.name,
    tier: pick.tier,
    equip,
    sets: reduced ? Math.max(1, baseSets - 1) : baseSets,
    reps: c.reps ?? slot.reps ?? "",
    prog,
    kind,
    hold: c.hold ?? slot.hold,
    minutes: slot.minutes,
    max: slot.max,
    step: slot.step ?? (prog === "hold" ? 5 : prog === "minutes" ? 5 : 1),
    interval: slot.interval,
    ladder,
    ladderStart: ladder ? ladderStart(ladder, skills) : undefined,
    regressedFrom,
    rest: compactRest(slot.rest ?? 90),
    note: slot.note,
    why: slot.why,
    proposal: slot.proposal,
    missingEquipment: !chosen,
    loadable,
    original: c.name,
    alts: slotNames(slot),
  };
}

/** Pausen 15 s kürzer als in der Orden-Datei, mit Untergrenzen: schwere Sätze nie unter 2 Min,
    übrige nie unter 60 s, kurze Pausen bleiben. Mehr Dichte ohne messbaren Verlust für Muskelaufbau
    (Singer et al., 2024); für Maximalkraft bleiben lange Pausen wichtig (Grgic et al., 2018). */
export function compactRest(rest: number): number {
  if (rest >= 150) return Math.max(120, rest - 15);
  if (rest >= 75) return Math.max(60, rest - 15);
  return rest;
}

/** Tauschoptionen für eine Stelle: alle Übungen aus den passenden Tauschgruppen,
    die Alternativen des Slots und die geführte Variante. Verfügbare zuerst. */
export function swapOptions(r: Resolved, p: EquipmentProfile, skills?: SkillSet): { name: string; available: boolean }[] {
  const seeds = new Set([r.original, ...r.alts]);
  const out = new Set<string>(r.alts);
  for (const members of Object.values(SWAP_GROUPS)) if (members.some((m) => seeds.has(m))) members.forEach((m) => out.add(m));
  for (const s of seeds) if (GUIDED[s]) out.add(GUIDED[s]);
  out.delete(r.name);
  out.delete(r.original);
  return [...out]
    .map((name) => ({ name, available: available(name, p, skills) }))
    .sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name));
}

/* ---------- Geführte Varianten bei hoher Phasenlast ---------- */
export const FREE_WEIGHT: Equip[] = ["barbell", "dumbbell", "kettlebell", "plate", "vest", "sandbag"];

/** Die gleiche Stelle mit geführter Übung. null, wenn es keine gibt oder das Profil sie nicht hat. */
export function toGuided(r: Resolved, p: EquipmentProfile): Resolved | null {
  const name = GUIDED[r.name];
  if (!name || !available(name, p)) return null;
  const equip = equipOf(name);
  if (!isLoadable(equip)) return null;
  const prog: Prog = r.prog === "topset" || r.prog === "weight" ? r.prog : "double";
  return { ...r, key: `${r.slotId}|${name}`, name, equip, prog, loadable: true, ladder: undefined, missingEquipment: false, guided: true };
}

/** Welche Stellen eines Tages geführt werden: Ziel ist, dass etwa die Hälfte aller Kraftübungen des Tages an
    Maschine oder Kabel läuft. Was schon geführt ist, zählt mit; ein Maschinentag bleibt also, wie er ist.
    Der erste freie Lift bleibt frei, schwere Sätze in Kontrastpaaren bleiben frei,
    bevorzugt die späteren Übungen des Tages. Gibt die Slot-Schlüssel zurück. */
export function guidedKeys(list: { r: Resolved; contrast: boolean; group?: number }[], p: EquipmentProfile): Set<string> {
  // Superset: nie zwei feste Geräte im Wechsel. Ist der Partner schon Maschine oder Kabel, bleibt die Übung frei (und zählt nicht mit).
  const station = (r: Resolved) => r.equip === "machine" || r.equip === "cable";
  const partnerStation = (x: { r: Resolved; group?: number }) => x.group != null && list.some((o) => o !== x && o.group === x.group && station(o.r));
  const free = list.filter((x) => FREE_WEIGHT.includes(x.r.equip) && !partnerStation(x));
  const strength = list.filter((x) => x.r.kind === "strength");
  const n = Math.max(0, Math.round(strength.length / 2) - strength.filter((x) => station(x.r)).length);
  if (!n) return new Set();
  const cands = free.slice(1).filter((x) => !x.contrast && !x.r.swapped && !partnerStation(x) && toGuided(x.r, p));
  const out = new Set<string>();
  const taken = new Set<number>();
  for (const x of cands.slice().reverse()) {
    if (out.size >= n) break;
    if (x.group != null && taken.has(x.group)) continue;
    out.add(x.r.key);
    if (x.group != null) taken.add(x.group);
  }
  return out;
}

/** Wiederholungsangabe zerlegen: "8-10/Seite", "AMRAP-2", "12", "40 m" */
export function parseReps(reps: string): { lo: number | null; hi: number | null; amrap: boolean; minus: number; suffix: string } {
  const s = reps.trim();
  const am = s.match(/^AMRAP(?:\s*[-−]\s*(\d+))?(.*)$/i);
  if (am) return { lo: null, hi: null, amrap: true, minus: am[1] ? parseInt(am[1]) : 0, suffix: am[2] ?? "" };
  const m = s.match(/^(\d+)(?:\s*[-–]\s*(\d+))?(\/Seite)?$/);
  if (m) {
    const lo = parseInt(m[1]);
    const hi = m[2] ? parseInt(m[2]) : lo;
    return { lo, hi, amrap: false, minus: 0, suffix: m[3] ?? "" };
  }
  return { lo: null, hi: null, amrap: false, minus: 0, suffix: s };
}

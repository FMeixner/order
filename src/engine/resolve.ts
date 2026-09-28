/* Wählt für einen Slot die konkrete Übung passend zum Equipment-Profil des Tages. */
import { EXERCISES } from "../data";
import type { Choice, Equip, EquipmentProfile, Prog, Slot, SlotKind, Tier } from "../types";
import { isLoadable, loadScale } from "./loads";

export interface Resolved {
  slotId: string;
  key: string; // slotId|Name: daran hängt die Historie
  name: string;
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
}

const TIER_ORDER: Record<Tier, Tier[]> = {
  gym: ["gym", "home", "reise"],
  home: ["home", "gym", "reise"],
  reise: ["reise", "home", "gym"],
};

function choiceFor(slot: Slot, tier: Tier): Choice | null | undefined {
  if (tier === "gym") return { name: slot.name };
  const v = tier === "home" ? slot.home : slot.reise;
  if (v === null) return null;
  if (v === undefined) {
    if (tier === "reise") return slot.home === undefined ? { name: slot.name } : choiceFor(slot, "home");
    return { name: slot.name };
  }
  return typeof v === "string" ? { name: v } : v;
}

export function equipOf(name: string): Equip {
  return EXERCISES[name]?.equip ?? "bodyweight";
}

/** Ist die Übung mit diesem Profil machbar? */
export function available(name: string, p: EquipmentProfile): boolean {
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
  }
  return true;
}

export function resolveSlot(slot: Slot, p: EquipmentProfile, reduced = false): Resolved | null {
  let chosen: { c: Choice; tier: Tier } | null = null;
  let fallback: { c: Choice; tier: Tier } | null = null;
  for (const t of TIER_ORDER[p.tier]) {
    const c = choiceFor(slot, t);
    if (!c) continue;
    if (!fallback) fallback = { c, tier: t };
    if (available(c.name, p)) { chosen = { c, tier: t }; break; }
  }
  const pick = chosen ?? fallback;
  if (!pick) return null;
  const c = pick.c;
  const equip = equipOf(c.name);
  const kind: SlotKind = (c as Choice & { kind?: SlotKind }).kind ?? slot.kind ?? "strength";
  let prog: Prog = c.prog ?? slot.prog ?? "none";
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
    ladder: pick.tier === "gym" || c.name === slot.name ? slot.ladder : undefined,
    rest: slot.rest ?? 90,
    note: slot.note,
    proposal: slot.proposal,
    missingEquipment: !chosen,
    loadable,
  };
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

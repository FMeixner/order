/* Schätzt die Dauer einer Einheit aus ihren Bausteinen. Grob, aber ehrlich:
   Arbeitszeit je Wiederholung, Pausen aus der Orden-Datei, Aufwärmsätze vor schweren Grundübungen,
   Umbau zwischen den Übungen, Warm-up und Cool-down aus den Listen. */
import { BEAST_BY_ID, DM_VARIANTS } from "../data";
import type { BeastClass, Block, Drill, EquipmentProfile, Role, Slot, UserProfile } from "../types";
import { expandDrills, moduleDrills } from "./plan";
import { parseReps, resolveSlot, type Resolved } from "./resolve";
import { WARM_SEC, warmupKeys } from "./warmup";

const SEC_PER_REP = 3.5;
const SETUP = 45; // Umbau, Gewicht holen, einstellen
const CLASS_MIN: Record<BeastClass, number> = { plage: 8, bestie: 14, ungeheuer: 21, uralte: 32, verfluchte: 45 };
const NEUTRAL_USER: UserProfile = { name: "" };

function repsOf(reps: string | undefined): number {
  const rp = parseReps(reps ?? "");
  const perSide = /\/Seite/.test(reps ?? "") ? 2 : 1;
  if (rp.amrap) return 12;
  if (rp.lo != null) return ((rp.lo + (rp.hi ?? rp.lo)) / 2) * perSide;
  const m = (reps ?? "").match(/(\d+)\s*m\b/); // "30 m", "6×20 m"
  if (m) return 8;
  return 8;
}

/** Sekunden Arbeit in einem Satz */
function workOf(s: Slot, p: EquipmentProfile, red = false): number {
  const r = resolveSlot(s, p, red);
  if (!r) return 0;
  if (r.kind === "timer") return (r.minutes ?? 10) * 60;
  if (r.kind === "interval" && r.interval) return r.interval.rounds * (r.interval.work + r.interval.rest);
  if (r.kind === "hold") return (r.hold ?? 20) * (/\/Seite/.test(r.reps) ? 2 : 1);
  return repsOf(r.reps) * SEC_PER_REP;
}
function setsOf(s: Slot, p: EquipmentProfile, red = false): number {
  const r = resolveSlot(s, p, red && (s.kind ?? "strength") !== "timer");
  if (!r) return 0;
  return r.kind === "timer" || r.kind === "interval" ? 1 : r.sets;
}
/** Kraft-Slots eines Blocks in der Reihenfolge der Einheit */
function blockSlots(b: Block): Slot[] {
  switch (b.type) {
    case "single": return [b.slot];
    case "superset": return b.slots;
    case "contrast": return [b.heavy, b.explosive];
    case "menu": { const f = Object.values(b.options)[0]; return f ? [f] : []; }
    case "module": return b.fallback ? [b.fallback] : [];
    default: return [];
  }
}
/** Übungen einer Einheit in Reihenfolge (aufgelöst für dieses Profil) */
export function roleSlots(blocks: Block[], p: EquipmentProfile): Resolved[] {
  return blocks.flatMap((b) => (b.type === "module" && p.has.sword && b.module === "sword" ? [] : blockSlots(b))).map((s) => resolveSlot(s, p)).filter((r): r is Resolved => !!r);
}

export function drillSeconds(d: Drill, groups: { value: number; sets: number }[]): number {
  return groups.reduce((sum, g) => sum + g.sets * (d.mode === "reps" ? g.value * (d.rep_s ?? 3) : g.value), 0) + 10;
}

export function blockSeconds(b: Block, p: EquipmentProfile, red = false): number {
  switch (b.type) {
    case "single": {
      const s = b.slot;
      const n = setsOf(s, p, red);
      if (!n) return 0;
      const r = resolveSlot(s, p)!;
      const rest = r.kind === "timer" || r.kind === "interval" ? 0 : (n - 1) * r.rest;
      return SETUP + n * workOf(s, p, red) + rest;
    }
    case "superset": {
      const rounds = Math.max(...b.slots.map((s) => setsOf(s, p, red)));
      const work = b.slots.reduce((sum, s) => sum + workOf(s, p) + 15, 0);
      return SETUP * b.slots.length + rounds * work + (rounds - 1) * (b.rest ?? 60);
    }
    case "contrast": {
      const rounds = setsOf(b.heavy, p, red);
      return SETUP * 2 + rounds * (workOf(b.heavy, p) + (b.transfer ?? 30) + workOf(b.explosive, p)) + (rounds - 1) * (b.rest ?? 180);
    }
    case "beast": {
      if (red) return CLASS_MIN.plage * 60 + SETUP; // −1 Satz: Bestie der Klasse Plage
      if (b.pool?.length) {
        const ms = b.pool.map((id) => BEAST_BY_ID[id]?.minutes ?? 15);
        return (ms.reduce((a, c) => a + c, 0) / ms.length) * 60 + SETUP;
      }
      const cls = b.classes?.length ? b.classes : (["bestie"] as BeastClass[]);
      return (cls.reduce((a, c) => a + CLASS_MIN[c], 0) / cls.length) * 60 + SETUP;
    }
    case "module": {
      if (b.module === "flow" || b.module === "sharpen") return moduleDrills(b.variant, NEUTRAL_USER, 1, b.module).reduce((sum, d) => sum + drillSeconds(d, d.groups), 0) + SETUP;
      if (p.has.sword) return (DM_VARIANTS[b.variant] ?? []).reduce((sum, d) => sum + d.value * (d.sets ?? 1) * (d.sides ? 2 : 1), 0) + SETUP;
      return b.fallback ? blockSeconds({ type: "single", slot: b.fallback }, p, red) : 0;
    }
    case "menu": {
      const first = Object.values(b.options)[0];
      return first ? blockSeconds({ type: "single", slot: first }, p, red) : 0;
    }
  }
}

export interface DurationEstimate { warmup: number; main: number; cooldown: number; total: number }

/** Geschätzte Minuten einer Einheit (A-Woche, ohne −1 Satz). */
export function estimateRole(role: Role, p: EquipmentProfile, user: UserProfile = NEUTRAL_USER, week = 1, reduced = false): DurationEstimate {
  const ab = week % 2 === 1 ? "A" : "B";
  const blocks = role.blocks.filter((b) => !b.rotation || b.rotation === ab);
  const drills = (lists: string[]) => expandDrills(lists, user, week).reduce((s, d) => s + drillSeconds(d, d.groups), 0);
  const warmup = drills((role.warmup ?? ["base"]).filter((l) => !l.startsWith("sword") || p.has.sword)) / 60;
  const cooldown = drills(role.cooldown ?? ["cd_general"]) / 60;
  // Aufwärmsätze vor der ersten schweren Mehrgelenksübung je Körperhälfte
  const warmSets = [...warmupKeys(roleSlots(blocks, p)).values()].reduce((a, c) => a + c, 0);
  const main = (blocks.reduce((s, b) => s + blockSeconds(b, p, reduced), 0) + warmSets * WARM_SEC) / 60;
  return { warmup, main, cooldown, total: warmup + main + cooldown };
}

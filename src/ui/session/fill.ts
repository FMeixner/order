/* „Mehr vom Ordensziel“ (1.35): Findet der Orden keinen Schwerpunkt (Automatisch, aber kein Bereich passt), legt der
   Platzhalter aus applySlots an einem Tag etwas vom Hauptziel nach – aber nur, wenn es kein Junk-Volumen wäre:
   - Muskel: 2–3 Sätze für die Muskelgruppe mit der größten Lücke zum Wochenziel (feste Sätze + Bestien der Woche),
     mit einer Übung aus dem Orden, die heute nicht dran ist. Lücke unter 2 Sätzen: nichts.
   - Kraft: ein schwerer Satz mehr bei der ersten Hauptübung des Tages, solange deren Hauptmuskel das Wochenziel nicht hat.
   - Kondition, Ausdauer, Fettabbau: 10 Minuten lockere Grundlage, solange das Konditionsziel der Woche fehlt (≥ 5 Min).
   - Schnellkraft, Schnelligkeit: 2 Sätze der ersten Sprung- oder Sprintübung des Ordens, frisch am Anfang; nie am Tag
     nach einem Sprungtag im Falken.
   - Skill, Beweglichkeit, Wohlbefinden: eine Runde mehr im Flow des Ordens; ohne Flow nichts.
   Die Schwellen sind gesetzt, nicht aus Studien; mehr Volumen über dem Wochenziel bringt kaum noch etwas (Pelland et al., 2024). */
import { DOSE_GROUPS, beastDose } from "../../engine/dose";
import { dayRoleMap, doseAt, moduleDrills, pickBeast } from "../../engine/plan";
import { WEEKDAYS } from "../../types";
import { resolveSlot } from "../../engine/resolve";
import { musclesOf } from "../../engine/volume";
import type { Block, Slot } from "../../types";
import type { SessionCtx } from "./ctx";
import type { Item } from "./items";

export const FILL_VARIANT = "ordensziel";
const EXPLOSIVE = /jump|sprung|sprint|shuttle|throw|wurf|slam|hop\b|hops\b|bound|clap|plyo|skater|medicine ball|chest pass|broad|depth/i;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const mainMuscle = (name: string): string | undefined => Object.entries(musclesOf(name)).sort((a, c) => c[1] - a[1])[0]?.[0];

/** Was Bestien diese Woche je Muskel bringen (so, wie die App sie wählt) */
function weekBeastDose(ctx: SessionCtx): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dayRoleMap(ctx.state, ctx.block, ctx.focus, ctx.week)) {
    const profile = ctx.state.equipment.find((e) => e.id === d.profileId) ?? ctx.profile;
    for (const b of ctx.focus.roles[d.role]?.blocks ?? []) {
      if (b.type !== "beast") continue;
      const x = pickBeast(b, { blockId: ctx.block.id, week: ctx.week, profile, state: ctx.state, reduced: ctx.reduced, downgrade: false });
      if (x) for (const [m, v] of Object.entries(beastDose(x, ctx.state.user, ctx.state))) out[m] = (out[m] ?? 0) + v;
    }
  }
  return out;
}

const fillSlot = (s: Slot, sets: number): Slot => ({ ...s, id: `${s.id}~mehr`, sets, ladder: undefined, finish: undefined, note: undefined });

export interface Fill { item: Item; title: string; start: boolean }
/** Ist der Block der Platzhalter für „Mehr vom Ordensziel“? */
export const isFillMarker = (b: Block) => b.type === "module" && b.module === "sharpen" && b.variant === FILL_VARIANT;

export function goalFill(ctx: SessionCtx, marker: Block): Fill | null {
  const f = ctx.focus;
  const goal = f.goals.primary;
  const today = new Set(slotsOf({ type: "superset", slots: ctx.focus.roles[ctx.roleKey]?.blocks.flatMap(slotsOf) ?? [] }).map((s) => s.name));
  const all = Object.values(f.roles).flatMap((r) => r.blocks.flatMap(slotsOf));
  const dw = doseAt(ctx.state, ctx.block, ctx.week);
  const single = (s: Slot): Item | null => {
    const r = resolveSlot(s, ctx.profile, false);
    return r ? { block: { type: "single", slot: s }, resolved: [r] } : null;
  };

  if (goal === "hypertrophy") {
    if (!dw) return null;
    const beasts = weekBeastDose(ctx);
    const gap = (m: string) => Math.max(0, (dw.muscle[m] ?? 0) - (dw.fixed[m] ?? 0) - (beasts[m] ?? 0));
    const groups = Object.entries(DOSE_GROUPS).filter(([g]) => g !== "Rumpf").map(([g, ms]) => ({ g, ms, sum: ms.reduce((a, m) => a + gap(m), 0) })).sort((a, c) => c.sum - a.sum);
    for (const grp of groups) {
      if (grp.sum < 2) break;
      const m = [...grp.ms].sort((a, c) => gap(c) - gap(a))[0];
      const cand = all.find((s) => (s.kind ?? "strength") === "strength" && mainMuscle(s.name) === m && !today.has(s.name) && resolveSlot(s, ctx.profile));
      if (!cand) continue;
      const sets = Math.min(3, Math.floor(gap(m) >= 2 ? gap(m) : grp.sum));
      const it = single(fillSlot(cand, Math.max(2, sets)));
      if (it) return { item: it, title: `Mehr vom Ordensziel · Muskel: ${m} +${Math.max(2, sets)} Sätze`, start: false };
    }
    return null;
  }
  if (goal === "strength") {
    const role = ctx.focus.roles[ctx.roleKey];
    const core = role?.blocks.flatMap(slotsOf).find((s) => s.core && (s.kind ?? "strength") === "strength");
    if (!core || !dw) return null;
    const m = mainMuscle(core.name);
    const beasts = weekBeastDose(ctx);
    if (m && (dw.fixed[m] ?? 0) + (beasts[m] ?? 0) >= (dw.muscle[m] ?? 0)) return null;
    const it = single(fillSlot(core, 1));
    return it ? { item: it, title: `Mehr vom Ordensziel · Kraft: ein schwerer Satz ${core.name}`, start: false } : null;
  }
  if (goal === "conditioning" || goal === "endurance" || goal === "fatloss") {
    if (!dw || dw.cardio - dw.fixedCardio < 5) return null;
    const it = single({ id: `${ctx.roleKey}-mehr-grundlage`, name: "Lockere Grundlage", kind: "timer", minutes: 10, sets: 1, prog: "none" } as Slot);
    return it ? { item: it, title: "Mehr vom Ordensziel · Kondition: 10 Min lockere Grundlage", start: false } : null;
  }
  if (goal === "power" || goal === "speed") {
    // Nie am Tag nach einem Sprungtag (Falke)
    const days = dayRoleMap(ctx.state, ctx.block, ctx.focus, ctx.week);
    const own = days.find((d) => d.role === ctx.roleKey);
    const prev = own && days.find((d) => d.day === WEEKDAYS[(WEEKDAYS.indexOf(own.day) + 6) % 7]);
    if (ctx.block.klammer === "athletik" && prev && ctx.focus.roles[prev.role]?.blocks.flatMap(slotsOf).some((s) => EXPLOSIVE.test(s.name))) return null;
    const ex = all.find((s) => (s.kind ?? "strength") !== "interval" && (s.kind ?? "strength") !== "timer" && EXPLOSIVE.test(s.name) && resolveSlot(s, ctx.profile));
    if (!ex) return null;
    const it = single(fillSlot(ex, 2));
    return it ? { item: it, title: `Mehr vom Ordensziel · Schnellkraft: 2 Sätze ${ex.name}, frisch`, start: true } : null;
  }
  // Skill, Beweglichkeit, Wohlbefinden: eine Runde mehr im Flow des Ordens
  const flow = Object.values(f.roles).flatMap((r) => r.blocks).find((b): b is Extract<Block, { type: "module" }> => b.type === "module" && b.module === "flow");
  if (!flow || ctx.focus.roles[ctx.roleKey]?.blocks.some((b) => b.type === "module" && b.module === "flow" && b.variant === flow.variant)) return null;
  const drills = moduleDrills(flow.variant, ctx.state.user, ctx.week, "flow");
  if (!drills.length) return null;
  return { item: { block: { ...flow, rotation: marker.rotation }, resolved: [], drills }, title: "Mehr vom Ordensziel · eine Runde mehr im Flow", start: false };
}

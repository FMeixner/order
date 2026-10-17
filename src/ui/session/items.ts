/* Inhalte einer Einheit sammeln (Übungen, Bestien, Module) und Bestien festhalten. */
import { EXERCISES } from "../../data";
import type { AppState, Beast, BeastClass, BeastRun, Block, Session } from "../../types";
import { dayMods, withDay } from "../../engine/dayadj";
import { blockSeconds } from "../../engine/duration";
import { affectDowngrade, beastById, beastForDay, type BeastTarget, dayRoleMap, type DrillView, finisherBlock, isAWeek, moduleDrills, pickBeast, roleAt, setWeekBeastBlocks } from "../../engine/plan";
import { loadPhase } from "../../engine/progression";
import { guidedKeys, type Resolved, resolveSlot, swapKey, toGuided } from "../../engine/resolve";
import { menuDefault } from "../../engine/sharpen";
import { focusFor } from "../../engine/weekplan";
import { boostOf, type SessionCtx, sessionId, skillSet } from "./ctx";

/* ---------- Slots dieser Einheit sammeln ---------- */
export interface Item { block: Block; resolved: Resolved[]; beast?: Beast | null; drills?: DrillView[]; /** Schwertblock, der hier mangels Schwert ersetzt ist (Vorschau zeigt trotzdem das Schwert) */ sword?: Extract<Block, { type: "module" }> }

function slotsOf(b: Block, ctx: SessionCtx): Resolved[] {
  const r = (s: Parameters<typeof resolveSlot>[0]) => {
    if (s.gate_week && ctx.week < s.gate_week) return null;
    const res = resolveSlot(s, ctx.profile, ctx.reduced && (s.kind ?? "strength") !== "timer", ctx.state.swaps?.[swapKey(s.id, ctx.profile.id)], skillSet(ctx.state));
    // Grenze erreicht: dieselbe Übung mit Zusatzlast
    return res && loadPhase(res, ctx.state.slots[res.key], ctx.profile);
  };
  switch (b.type) {
    case "single": return [r(b.slot)].filter(Boolean) as Resolved[];
    case "superset": return b.slots.map(r).filter(Boolean) as Resolved[];
    case "contrast": return [r(b.heavy), r(b.explosive)].filter(Boolean) as Resolved[];
    case "menu": {
      const choice = ctx.state.menuChoice[`${ctx.block.id}:${b.id}`] ?? menuDefault(ctx.state, ctx.block, b);
      const s = choice ? b.options[choice] : null;
      return s ? ([r(s)].filter(Boolean) as Resolved[]) : [];
    }
    case "module": return b.module === "sword" && !ctx.profile.has.sword && b.fallback ? ([r(b.fallback)].filter(Boolean) as Resolved[]) : [];
    default: return [];
  }
}

/** Läuft in diesem Block gelaufen? */
export const isRunBlock = (b: Block) => b.type === "single" && !!EXERCISES[b.slot.name]?.run;

/** Alle Bestien einer Woche mit Ort, so wie die Einheiten sie zeigen (A/B-Wechsel, „kein Laufen“) */
setWeekBeastBlocks((state, pb, week) => {
  const f = focusFor(state, pb, week);
  if (!f) return [];
  const ab = isAWeek(week) ? "A" : "B";
  return dayRoleMap(state, pb, f, week).flatMap((d) => {
    const pid = state.profileFor?.[sessionId(pb.id, week, d.role)] ?? d.profileId;
    const p0 = state.equipment.find((e) => e.id === pid);
    if (!p0) return [];
    const profile = withDay(p0, dayMods(state, pb, week, d.role, d.day));
    const noRun = !!state.noRun?.[sessionId(pb.id, week, d.role)];
    const ctx = { profile } as SessionCtx;
    return (f.roles[d.role] ? roleAt(f.roles[d.role], profile).blocks : [])
      .filter((b) => !b.rotation || b.rotation === ab)
      .map((b) => (noRun && isRunBlock(b) ? runToBeast(b, ctx) : finisherBlock(b, week) ?? b))
      .filter((b): b is Extract<Block, { type: "beast" }> => b.type === "beast")
      .map((b) => [b, profile] as BeastTarget);
  });
});

/** Kein Laufen möglich: Laufblock wird zur Bestie ähnlicher Dauer */
function runToBeast(b: Block, ctx: SessionCtx): Block {
  if (b.type !== "single") return b;
  const min = blockSeconds(b, ctx.profile) / 60;
  const cls: BeastClass = min <= 10.5 ? "plage" : min <= 17.5 ? "bestie" : min <= 25.5 ? "ungeheuer" : "uralte";
  return { type: "beast", id: `norun-${b.slot.id}`, classes: [cls], note: `Statt ${b.slot.name}.`, rotation: b.rotation };
}

export function collectItems(ctx: SessionCtx): Item[] {
  const role = roleAt(ctx.focus.roles[ctx.roleKey], ctx.profile);
  const ab = isAWeek(ctx.week) ? "A" : "B";
  const noRun = !!ctx.state.noRun?.[sessionId(ctx.block.id, ctx.week, ctx.roleKey)];
  const cur = ctx.state.sessions.find((s) => s.id === sessionId(ctx.block.id, ctx.week, ctx.roleKey));
  const done = cur?.done ? cur : undefined;
  // Angefangen oder erledigt: die Bestien bleiben, wie sie beim ersten Klick waren (nicht neu würfeln)
  const pinned = cur?.beastRuns;
  const beastItem = (b: Extract<Block, { type: "beast" }>): Item => {
    const r = pinned?.[b.id] ?? (done && !done.beastRuns && role.blocks.filter((x) => x.type === "beast").length === 1 ? { beast: done.beast, parts: done.beastParts } : undefined);
    const logged = r?.parts?.length ? r.parts.map((p) => p.id).join("+") : r?.beast?.id;
    const lb = logged ? beastById(logged) : null;
    // Festgehalten, aber noch ohne echte Zeit: passt sie nicht zu Leise oder Kein Platz, wird neu gewählt
    if (lb && (done || hasTime(r) || beastForDay(lb, ctx.profile))) return { block: b, resolved: [], beast: lb };
    return { block: b, resolved: [], beast: pickBeast(b, { blockId: ctx.block.id, week: ctx.week, profile: ctx.profile, state: ctx.state, reduced: ctx.reduced, downgrade: !!ctx.focus.affect_rule && affectDowngrade(ctx.state), boost: boostOf(ctx) }) };
  };
  const otherItem = (b: Block): Item => {
    if (b.type === "module" && (b.module !== "sword" || ctx.profile.has.sword)) {
      const drills = moduleDrills(b.variant, ctx.state.user, ctx.week, b.module);
      // Viel Energie: jede Schwertübung einen Satz mehr
      return { block: b, resolved: [], drills: b.module === "sword" && boostOf(ctx) ? drills.map((d) => ({ ...d, groups: d.groups.map((g) => ({ ...g, sets: g.sets + 1 })) })) : drills };
    }
    if (b.type === "module" && b.fallbackFlow) {
      const flow: Block = { type: "module", module: "flow", variant: b.fallbackFlow, rotation: b.rotation };
      return { block: flow, resolved: [], drills: moduleDrills(b.fallbackFlow, ctx.state.user, ctx.week, "flow"), sword: b };
    }
    return { block: b, resolved: slotsOf(b, ctx), ...(b.type === "module" && b.module === "sword" ? { sword: b } : {}) };
  };
  const all: Item[] = role.blocks
    .filter((b) => !b.rotation || b.rotation === ab)
    .map((b) => (noRun && isRunBlock(b) ? runToBeast(b, ctx) : b))
    .map((b) => {
      // Finisher: passt eine Bestie aus dem Pool, kommt sie statt des Supersets (erledigte Einheit: so, wie sie war)
      const fb = finisherBlock(b, ctx.week);
      if (fb && (pinned ? pinned[fb.id] : !done)) {
        const it = beastItem(fb);
        if (it.beast) return it;
      }
      return b.type === "beast" ? beastItem(b) : otherItem(b);
    });
  // Nie zwei feste Geräte (Maschine, Kabel) im Superset, auch nicht nach Tausch oder Ortswechsel: dann nacheinander
  const station = (r: Resolved) => r.equip === "machine" || r.equip === "cable";
  const split = all.flatMap((it): Item[] => {
    const b = it.block;
    if (b.type !== "superset" || (b.sameStation && it.resolved.every((r) => r.equip === "cable")) || it.resolved.filter(station).length < 2) return [it];
    return it.resolved.map((r, i) => ({ block: { type: "single", slot: { ...(b.slots.find((x) => x.id === r.slotId) ?? b.slots[i]), rest: b.rest ?? 60 } }, resolved: [r] }));
  });
  const items: Item[] = split.filter((it) => it.resolved.length || it.beast !== undefined || it.drills || it.sword || it.block.type === "menu");
  // Phase mit hoher Alltagslast: etwa die Hälfte aller Übungen geführt (schon geführte zählen mit), sofern das Profil Maschinen oder Kabel hat
  if (ctx.block.load === "high") {
    const all = items.flatMap((it, g) => it.resolved.map((r, i) => ({ r, contrast: it.block.type === "contrast" && i === 0, group: it.block.type === "superset" ? g : undefined })));
    const keys = guidedKeys(all, ctx.profile);
    if (keys.size) for (const it of items) it.resolved = it.resolved.map((r) => (keys.has(r.key) ? toGuided(r, ctx.profile) ?? r : r));
  }
  return items;
}

/** Gezeigte Bestien festhalten, sobald die Einheit angefangen ist: spätere Änderungen am Zustand würfeln sie nicht neu */
export function runFor(beast: Beast): BeastRun {
  return beast.parts ? { parts: beast.parts.map((p) => ({ id: p.id, seconds: null })) } : { beast: { id: beast.id, seconds: null } };
}
/** Bewusste Anpassung (Ort, −1 Satz, viel Energie, kein Laufen): festgehaltene Bestien ohne Zeit freigeben, damit sie neu passen */
/** Echte Zeit eingetragen (0 Sekunden zählt nicht) */
export const hasTime = (r?: BeastRun) => !!r && ((r.beast?.seconds ?? 0) > 0 || !!r.parts?.some((p) => (p.seconds ?? 0) > 0));
export function unpinBeasts(st: AppState, match: (s: Session) => boolean): AppState {
  const timed = hasTime;
  return {
    ...st,
    sessions: st.sessions.map((s) => {
      if (s.done || !s.beastRuns || !match(s)) return s;
      const runs = Object.fromEntries(Object.entries(s.beastRuns).filter(([, r]) => timed(r)));
      return { ...s, beastRuns: runs };
    }),
  };
}
export function pinBeasts(s: Session, items: Item[]): Session {
  if (s.done || (s.beast !== undefined || s.beastParts?.length) && !s.beastRuns) return s;
  // Fehlt der Eintrag oder zeigt die Einheit inzwischen eine andere Bestie (alter Eintrag ohne Zeit), gilt die gezeigte
  const shownId = (r: BeastRun) => (r.parts?.length ? r.parts.map((p) => p.id).join("+") : r.beast?.id);
  const missing = items.flatMap((it) => {
    if (!it.beast || it.block.type !== "beast") return [];
    const r = s.beastRuns?.[it.block.id];
    return !r || (!hasTime(r) && shownId(r) !== shownId(runFor(it.beast))) ? [{ id: it.block.id, beast: it.beast }] : [];
  });
  if (!missing.length) return s;
  const runs = { ...(s.beastRuns ?? {}) };
  for (const m of missing) runs[m.id] = runFor(m.beast);
  return { ...s, beastRuns: runs };
}

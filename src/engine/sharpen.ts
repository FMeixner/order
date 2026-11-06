/* Zwei Schwerpunkt-Slots: Slot 1 (Schwachstelle) heilt den Bereich, der nach der letzten Testwoche am
   meisten fehlt; Slot 2 (Vertiefung) vertieft das Sekundärziel des Ordens — beim Allrounder stattdessen
   das zweite slotfähige Defizit, beim Spezialisten immer die Vertiefung. Regeln:
   1. Klein: die Dosis kommt aus data/modules/sharpen.json; beide Slots zusammen höchstens SLOT_BUDGET
      (25 %) der geschätzten Wochenzeit. Bei Überschreitung kürzt zuerst Slot 2 seine Tage (auf einen,
      dann ganz), erst danach Slot 1 — die Schwachstelle ist messungsgetrieben und fällt nie zuerst.
   2. Ein Slot pro Tag: Slot 1 belegt seine Tage zuerst, Slot 2 füllt die übrigen (nie am selben Tag).
   3. Passend: Bereiche, die der Orden selbst trainiert, überspringt der Slot. Bereiche, die das Ziel
      stören (Interferenz) oder einen eigenen Block brauchen (Maximalkraft, Skill), kommen in den
      Vorschlag für die Blockfolge. Slot 1 und Slot 2 liegen nie auf derselben Achse der Jahresbalance.
   4. Kein Nachlaufen: Defizit nur deutlich unter der Norm (≤ 40 Punkte bei mehreren Tests, ≤ 30 bei einem)
      oder, ohne Norm, wenn Tests jenseits des Messfehlers schlechter wurden und keiner besser.
   Seit 0.93 heilt auch der Spezialist mit (Slot 1); die Allrounder/Spezialist-Wahl steuert nur Slot 2.
   Laufende Phasen bekommen Slot 1 nur, wenn vor ihrem Start getestet wurde; Slot 2 läuft auch ohne Testwoche. */
import { DOMAINS, SHARPEN } from "../data";
import type { AppState, Block, Focus, Goal, PlanBlock } from "../types";
import type { AxisId } from "./balance";
import { estimateRole } from "./duration";
import { blockFocus, focusName, rolesFor } from "./plan";
import { evaluateBlock } from "./norms";

export type DomainId = "speed" | "power" | "strength" | "ke" | "anaerob" | "aerob" | "skill" | "mobility";
export interface Deficit { id: DomainId; name: string; score: number | null; kind: "norm" | "trend" }

/** Welche Bereiche ein Ziel direkt trainiert */
export const GOAL_DOMAINS: Record<Goal, DomainId[]> = {
  speed: ["speed"], power: ["power"], strength: ["strength"], hypertrophy: ["strength"],
  conditioning: ["ke", "anaerob"], fatloss: ["anaerob"], endurance: ["aerob"], mobility: ["mobility"],
  skill: ["skill"], wellbeing: [], test: [],
};
/** Bereich → Achse der Jahresbalance */
export const DOMAIN_AXIS: Record<DomainId, AxisId> = {
  speed: "schnellkraft", power: "schnellkraft", strength: "kraft", ke: "kondition", anaerob: "kondition",
  aerob: "ausdauer", skill: "skill", mobility: "beweglichkeit",
};
const INTERFERE_GOALS: Goal[] = ["hypertrophy", "strength", "power", "speed"];
const domainName = (id: string) => SHARPEN[id]?.name ?? DOMAINS.find((d) => d.id === id)?.name ?? id;

/** Anteil der geschätzten Wochenzeit, den beide Slots zusammen höchstens einnehmen dürfen */
export const SLOT_BUDGET = 0.25;

/** Orden mit Slots: mindestens 45 Min., keine wöchentlich wechselnden Orden */
export function slotEligible(f: Focus): boolean {
  return f.session_min >= 45 && !f.medley?.length;
}
export const interferes = (f: Focus, d: DomainId) => (d === "aerob" || d === "anaerob") && INTERFERE_GOALS.includes(f.goals.primary);

/** Defizite aus einer Testauswertung, schwächstes zuerst */
export function deficitsOf(state: AppState, blockId: string): Deficit[] {
  const ev = evaluateBlock(state, blockId);
  const norm: Deficit[] = [], trend: Deficit[] = [];
  for (const d of ev.domains) {
    const scored = d.tests.filter((t) => t.norm && !t.norm.noScore);
    if (d.score != null) {
      if ((scored.length >= 2 && d.score <= 40) || (scored.length === 1 && d.score <= 30)) norm.push({ id: d.id as DomainId, name: d.name, score: d.score, kind: "norm" });
      continue;
    }
    const ch = d.tests.map((t) => t.change);
    if (ch.includes("worse") && !ch.includes("better")) trend.push({ id: d.id as DomainId, name: d.name, score: null, kind: "trend" });
  }
  return [...norm.sort((a, b) => a.score! - b.score!), ...trend];
}

/** Letzte Testwoche vor einem Datum (Block der jüngsten Testergebnisse) */
export function latestTest(state: AppState, before: string): { blockId: string; date: string } | null {
  let best: { blockId: string; date: string } | null = null;
  for (const list of Object.values(state.tests)) for (const r of list) {
    if (r.date < before && (!best || r.date > best.date)) best = { blockId: r.blockId, date: r.date };
  }
  return best;
}
export function deficitsBefore(state: AppState, date: string): { blockId: string; list: Deficit[] } | null {
  const t = latestTest(state, date);
  return t ? { blockId: t.blockId, list: deficitsOf(state, t.blockId) } : null;
}

export interface SlotPlan {
  domain: DomainId | null;
  source: "auto" | "manual" | "off" | "none";
  /** Klartext, warum dieser Bereich (oder keiner) */
  reason: string;
}
export interface SlotsPlan {
  /** Slot 1: Schwachstelle aus der letzten Testwoche */
  s1: SlotPlan;
  /** Slot 2: Vertiefung des Sekundärziels — beim Allrounder stattdessen das zweite Defizit */
  s2: SlotPlan;
  /** Defizite, die in keinen Slot passen: Kandidaten für die Blockfolge */
  deferred: Deficit[];
}

/** Vertiefung: erste Domäne aus den Sekundärzielen des Ordens, die ein Slot-Modul hat, das Primat nicht stört
    und weder Slot 1 selbst noch dessen Achse doppelt */
function deepening(f: Focus, s1: DomainId | null): SlotPlan {
  const s1Axis = s1 ? DOMAIN_AXIS[s1] : null;
  for (const goal of f.goals.secondary) for (const d of GOAL_DOMAINS[goal]) {
    if (!SHARPEN[d] || interferes(f, d)) continue;
    if (s1 && (d === s1 || DOMAIN_AXIS[d] === s1Axis)) continue;
    return { domain: d, source: "auto", reason: `Vertiefung: ${domainName(d)} trägt das Sekundärziel neben dem Primat des Ordens.` };
  }
  return { domain: null, source: "none", reason: "Das Sekundärziel braucht eigene Blöcke oder stört das Ordensziel — kein zweiter Slot." };
}

export function slotsFor(state: AppState, b: PlanBlock): SlotsPlan {
  const f = blockFocus(b);
  const none = (reason: string): SlotPlan => ({ domain: null, source: "none", reason });
  if (!f) return { s1: none(""), s2: none(""), deferred: [] };
  if (!slotEligible(f)) return { s1: none(`${focusName(f.id)} hat keinen Schwerpunkt-Slot.`), s2: none(""), deferred: [] };
  const deferred: Deficit[] = [];
  const src = deficitsBefore(state, b.start);
  const list = src?.list ?? [];
  const own = new Set(GOAL_DOMAINS[f.goals.primary]);
  for (const d of list) if (!own.has(d.id) && (!SHARPEN[d.id] || interferes(f, d.id)) && !deferred.includes(d)) deferred.push(d);

  // --- Slot 1: Schwachstelle (auch für Spezialisten), manuell übersteuerbar, abschaltbar
  const s1: SlotPlan = (() => {
    if (b.sharpen === "off") return { domain: null, source: "off", reason: "Für diese Phase ausgeschaltet." };
    if (b.sharpen && SHARPEN[b.sharpen]) return { domain: b.sharpen as DomainId, source: "manual", reason: "Selbst gewählt." };
    if (!src) return none("Noch keine Testwoche vor dieser Phase.");
    if (!list.length) return none("Keine klaren Defizite in der letzten Testwoche.");
    const skipped: string[] = [];
    for (const d of list) {
      if (own.has(d.id)) { skipped.push(`${d.name} trainiert ${focusName(f.id)} selbst`); continue; }
      if (deferred.includes(d)) continue;
      const basis = d.kind === "norm" ? `${d.score} Punkte in der letzten Testwoche` : "schlechter als beim letzten Test";
      return { domain: d.id, source: "auto", reason: `${basis[0].toUpperCase()}${basis.slice(1)}.${skipped.length ? ` ${skipped.join(", ")}, deshalb der nächste Bereich.` : ""}` };
    }
    return none(skipped.length ? `${skipped.join(", ")}. Die übrigen Defizite passen nicht in einen Slot.` : "Die Defizite passen nicht in einen Slot, sie gehen in den Vorschlag für die Blockfolge.");
  })();

  // --- Slot 2: Vertiefung — beim Allrounder stattdessen das stärkste verbleibende Defizit
  let s2: SlotPlan;
  if (b.sharpen2 === "off") s2 = { domain: null, source: "off", reason: "Für diese Phase ausgeschaltet." };
  else if (b.sharpen2 && SHARPEN[b.sharpen2]) s2 = { domain: b.sharpen2 as DomainId, source: "manual", reason: "Selbst gewählt." };
  else if (state.user.focusMode !== "special") {
    const s1Axis = s1.domain ? DOMAIN_AXIS[s1.domain] : null;
    let cand: Deficit | undefined;
    for (const d of list) {
      if (d.id === s1.domain || own.has(d.id) || deferred.includes(d)) continue;
      if (s1Axis && DOMAIN_AXIS[d.id] === s1Axis) continue; // nie zwei Slots auf derselben Achse
      cand = d; break;
    }
    if (cand) s2 = { domain: cand.id, source: "auto", reason: `Zweites Defizit: ${cand.name} ${cand.kind === "norm" ? `(${cand.score} Punkte)` : "(Rückgang)"} aus der letzten Testwoche.` };
    else s2 = deepening(f, s1.domain);
  } else s2 = deepening(f, s1.domain);
  return { s1, s2, deferred };
}

/** Orden dieser Phase mit eingebauten Slots. Ändert nichts, wenn kein Slot aktiv ist.
    Slot 1 belegt seine Tage zuerst, Slot 2 füllt die übrigen (nie am selben Tag).
    Beide Slots zusammen dürfen SLOT_BUDGET der geschätzten Wochenzeit nicht übersteigen;
    sonst kürzt die Leiter erst die Tage von Slot 2, dann Slot 2 selbst, dann die Tage von Slot 1. */
export function applySlots(f: Focus, state: AppState, b: PlanBlock): Focus {
  const plan = slotsFor(state, b);
  if (!plan.s1.domain && !plan.s2.domain) return f;
  const roles = rolesFor(state, b, f);
  const p = state.equipment[0];
  const weekOf = (ff: Focus): number =>
    p ? roles.reduce((sum, rk) => sum + estimateRole(ff.roles[rk], p, state.user).total, 0) : 0;
  const w0 = weekOf(f);

  const build = (d1: "full" | 1 | 0, d2: "full" | 1 | 0): Focus => {
    const out = { ...f.roles };
    const place = (slot: SlotPlan, mode: "full" | 1 | 0): void => {
      if (!slot.domain || mode === 0) return;
      const mod = SHARPEN[slot.domain];
      const free = roles.filter((rk) => out[rk] && !out[rk].blocks.some((x) => x.type === "module" && x.module === "sharpen"));
      if (!free.length) return;
      let idx: number[];
      if (mode === "full" && mod.days === "all") idx = free.map((_, i) => i);
      else if (mode === "full" && mod.days === 2) idx = [...new Set([0, Math.floor(free.length / 2)])];
      else { // ein Tag: am kürzesten
        let best = 0;
        free.forEach((rk, i) => { if ((f.roles[rk]?.minutes ?? 99) < (f.roles[free[best]]?.minutes ?? 99)) best = i; });
        idx = [best];
      }
      for (const i of idx) {
        const rk = free[i];
        const r = out[rk];
        if (!r) continue;
        const blk: Block = { type: "module", module: "sharpen", variant: slot.domain };
        out[rk] = { ...r, blocks: mod.place === "start" ? [blk, ...r.blocks] : [...r.blocks, blk] };
      }
    };
    place(plan.s1, d1);
    place(plan.s2, d2);
    return { ...f, roles: out };
  };
  if (!p || w0 <= 0) return build("full", "full");
  const over = (ff: Focus): boolean => { const w1 = weekOf(ff); return w1 > 0 && (w1 - w0) / w1 > SLOT_BUDGET; };
  let out = build("full", "full");
  if (over(out)) out = build("full", 1);
  if (over(out)) out = build("full", 0);
  if (over(out)) out = build(1, 0);
  if (over(out)) out = build(0, 0);
  return out;
}

/** Defizite als Gewichte für die Blockfolge: schwächster Bereich zählt am meisten */
export function deficitWeights(list: Deficit[]): { axis: AxisId; w: number }[] {
  const ws = [1, 0.7, 0.5, 0.35];
  const out = new Map<AxisId, number>();
  list.slice(0, ws.length).forEach((d, i) => out.set(DOMAIN_AXIS[d.id], Math.max(out.get(DOMAIN_AXIS[d.id]) ?? 0, ws[i])));
  return [...out].map(([axis, w]) => ({ axis, w }));
}

export { domainName };

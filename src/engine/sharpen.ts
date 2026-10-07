/* Schwerpunkt-Slot: eine kleine Erhaltungsdosis für den Bereich, der nach der letzten Testwoche am meisten fehlt.
   Regeln:
   1. Klein: ein Bereich pro Phase, Dosis aus data/modules/sharpen.json (etwa 10–15 Min. pro Woche).
   2. Passend: Bereiche, die der Orden selbst trainiert, überspringt der Slot (dann Defizit 2).
      Bereiche, die das Ziel des Ordens stören (aerob/anaerob neben Kraft, Muskel, Schnellkraft) oder in einen Slot
      nicht passen (Maximalkraft, Skill), kommen in den Vorschlag für die Blockfolge statt in den Slot.
   3. Kein Nachlaufen: Defizit nur deutlich unter der Norm (≤ 40 Punkte bei mehreren Tests, ≤ 30 bei einem)
      oder, ohne Norm, wenn Tests jenseits des Messfehlers schlechter wurden und keiner besser.
   Spezialisten bekommen keinen Slot. Laufende Phasen bekommen nur einen, wenn vor ihrem Start getestet wurde. */
import { DOMAINS, SHARPEN } from "../data";
import type { AppState, Block, Focus, Goal, PlanBlock } from "../types";
import type { AxisId } from "./balance";
import { evaluateBlock } from "./norms";
import { blockFocus, focusName, rolesFor } from "./plan";

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

/** Orden mit Slot: mindestens 45 Min., keine wöchentlich wechselnden Orden, keine eigenen Schwerpunkt-Menüs (Soldier) */
export function slotEligible(f: Focus): boolean {
  if (f.session_min < 45 || f.medley?.length) return false;
  return !Object.values(f.roles).some((r) => r.blocks.some((b) => b.type === "menu"));
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
  /** Defizite, die nicht in den Slot passen: Kandidaten für die Blockfolge */
  deferred: Deficit[];
}

export function slotFor(state: AppState, b: PlanBlock): SlotPlan {
  const f = blockFocus(b);
  const none = (reason: string, deferred: Deficit[] = []): SlotPlan => ({ domain: null, source: "none", reason, deferred });
  if (!f) return none("");
  if (!slotEligible(f)) return none(`${focusName(f.id)} hat keinen Schwerpunkt-Slot.`);
  if (b.sharpen === "off") return { domain: null, source: "off", reason: "Für diese Phase ausgeschaltet.", deferred: [] };
  if (b.sharpen && SHARPEN[b.sharpen]) return { domain: b.sharpen as DomainId, source: "manual", reason: "Selbst gewählt.", deferred: [] };
  if (state.user.focusMode === "special") return none("Spezialist: kein Slot, der Orden bekommt die volle Zeit.");
  const src = deficitsBefore(state, b.start);
  if (!src) return none("Noch keine Testwoche vor dieser Phase.");
  if (!src.list.length) return none("Keine klaren Defizite in der letzten Testwoche.");
  const own = new Set(GOAL_DOMAINS[f.goals.primary]);
  // Nicht slotfähig oder störend: Kandidaten für die Blockfolge, unabhängig davon, was der Slot nimmt
  const deferred = src.list.filter((d) => !own.has(d.id) && (!SHARPEN[d.id] || interferes(f, d.id)));
  const skipped: string[] = [];
  for (const d of src.list) {
    if (own.has(d.id)) { skipped.push(`${d.name} trainiert ${focusName(f.id)} selbst`); continue; }
    if (deferred.includes(d)) continue;
    const basis = d.kind === "norm" ? `${d.score} Punkte in der letzten Testwoche` : "schlechter als beim letzten Test";
    return { domain: d.id, source: "auto", reason: `${basis[0].toUpperCase()}${basis.slice(1)}.${skipped.length ? ` ${skipped.join(", ")}, deshalb der nächste Bereich.` : ""}`, deferred };
  }
  return none(skipped.length ? `${skipped.join(", ")}. Die übrigen Defizite passen nicht in einen Slot.` : "Die Defizite passen nicht in einen Slot, sie gehen in den Vorschlag für die Blockfolge.", deferred);
}

/** Welche Tage (Index in der Rollenfolge) den Slot bekommen */
export function slotDays(f: Focus, roles: string[], days: "all" | 1 | 2): number[] {
  const n = roles.length;
  if (!n) return [];
  if (days === "all") return roles.map((_, i) => i);
  if (days === 2) return [...new Set([0, Math.floor(n / 2)])];
  // einmal pro Woche: am kürzesten Tag
  let best = 0;
  roles.forEach((rk, i) => { if ((f.roles[rk]?.minutes ?? 99) < (f.roles[roles[best]]?.minutes ?? 99)) best = i; });
  return [best];
}

/** Orden dieser Phase mit eingebautem Slot. Ändert nichts, wenn kein Slot aktiv ist. */
export function applySlot(f: Focus, state: AppState, b: PlanBlock): Focus {
  const plan = slotFor(state, b);
  if (!plan.domain) return f;
  const mod = SHARPEN[plan.domain];
  const roles = rolesFor(state, b, f);
  const idx = slotDays(f, roles, mod.days);
  const blk: Block = { type: "module", module: "sharpen", variant: plan.domain };
  const out = { ...f.roles };
  for (const i of idx) {
    const rk = roles[i];
    const r = out[rk];
    if (!r || r.blocks.some((x) => x.type === "module" && x.module === "sharpen")) continue;
    out[rk] = { ...r, blocks: mod.place === "start" ? [blk, ...r.blocks] : [...r.blocks, blk] };
  }
  return { ...f, roles: out };
}

/* ---------- Soldier: Schwerpunkt-Menüs nach den Defiziten vorbelegen ---------- */
const MENU_KEY: Partial<Record<DomainId, string>> = { speed: "Speed", power: "Power", strength: "Strength", ke: "Kraftausdauer", anaerob: "Anaerob", aerob: "Aerob", mobility: "Mobility" };
export function menuDefault(state: AppState, b: PlanBlock, menu: Extract<Block, { type: "menu" }>): string | null {
  const k = parseInt(menu.label.match(/Schwerpunkt (\d)/)?.[1] ?? "");
  if (!k) return null;
  const src = deficitsBefore(state, b.start);
  if (!src || state.user.focusMode === "special") return null;
  const keys = src.list.map((d) => MENU_KEY[d.id]).filter((x): x is string => !!x);
  const avail = keys.filter((x) => menu.options[x]);
  return avail[k - 1] ?? avail[0] ?? null;
}

/** Defizite als Gewichte für die Blockfolge: schwächster Bereich zählt am meisten */
export function deficitWeights(list: Deficit[]): { axis: AxisId; w: number }[] {
  const ws = [1, 0.7, 0.5, 0.35];
  const out = new Map<AxisId, number>();
  list.slice(0, ws.length).forEach((d, i) => out.set(DOMAIN_AXIS[d.id], Math.max(out.get(DOMAIN_AXIS[d.id]) ?? 0, ws[i])));
  return [...out].map(([axis, w]) => ({ axis, w }));
}

export { domainName };

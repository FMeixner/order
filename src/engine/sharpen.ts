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
import { addDays, blockFocus, daysBetween, focusName, isTestBlock, isoDate, rolesFor } from "./plan";
import { evaluateBlock } from "./norms";
import { CLOCKS, residualClocks, type ClockId } from "./residual";

export type DomainId = "speed" | "power" | "strength" | "ke" | "anaerob" | "aerob" | "skill" | "mobility";
export interface Deficit { id: DomainId; name: string; score: number | null; kind: "norm" | "trend" | "estimate" }

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
  const norm: Deficit[] = [], trend: Deficit[] = [], est: Deficit[] = [];
  for (const d of ev.domains) {
    const scored = d.tests.filter((t) => t.norm && !t.norm.noScore);
    if (d.score != null) {
      if ((scored.length >= 2 && d.score <= 40) || (scored.length === 1 && d.score <= 30)) norm.push({ id: d.id as DomainId, name: d.name, score: d.score, kind: "norm" });
      continue;
    }
    const ch = d.tests.map((t) => t.change);
    if (ch.includes("worse") && !ch.includes("better")) { trend.push({ id: d.id as DomainId, name: d.name, score: null, kind: "trend" }); continue; }
    // Schätzung zählt halb: nur wenn sie trotz Unsicherheit klar hinten liegt (≤ 25), und hinter echten Defiziten
    if (d.estimate && d.estimate.score <= 25) est.push({ id: d.id as DomainId, name: d.name, score: d.estimate.score, kind: "estimate" });
  }
  // Nicht doppelt zählen: Ist ein Quellbereich der Schätzung (Kraftausdauer, Sprungkraft) schon selbst ein Defizit,
  // trägt er die Schwäche bereits — die Schätzung fällt dann weg.
  const srcDomains = new Set(ev.domains.filter((d) => d.estimate).flatMap((d) => ev.domains.filter((x) => x.id !== d.id && x.tests.some((t) => d.estimate!.from.includes(t.test.name))).map((x) => x.id)));
  if (norm.some((n) => srcDomains.has(n.id))) est.length = 0;
  return [...norm.sort((a, b) => a.score! - b.score!), ...trend, ...est];
}

/** Letzte Testwoche vor einem Datum (Block der jüngsten Testergebnisse) */
export function latestTest(state: AppState, before: string): { blockId: string; date: string } | null {
  let best: { blockId: string; date: string } | null = null;
  for (const list of Object.values(state.tests ?? {})) for (const r of list) {
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
  /** Zweck aus dem Jahresplan (1.3) */
  purpose?: SlotPurpose;
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

/* ---------- Jahresplan der Schwerpunkte (1.3) ----------
   Jeder Orden hat einen Schwerpunkt-Slot. Befüllt wird er in der Jahresgesamtschau, Phase für Phase in Zeitfolge,
   mit genau einem von vier Zwecken — nicht jede Phase muss alles schaffen, das Jahr muss stimmen:
   - Testdefizit: Bereich deutlich unter der Norm (oder schlechter geworden) in der letzten Testwoche.
   - Erhalt: Bereich, den der Plan sonst verfallen ließe — die Hochrechnung der Uhren (letzter Reiz durch Orden,
     Bestien oder einen früheren Slot) liegt zur Phasenmitte über 70 % seines Haltefensters.
   - Double down: der Orden trainiert den Bereich selbst und hat ein Modul dafür — der Slot legt nach.
   - Sekundärziel: ein Nebenziel des Ordens mit Modul.
   Nie gegen den Orden: Bereiche, die das Ordensziel stören (Interferenz), bekommen keinen Slot. Derselbe Bereich
   zweimal in Folge kostet (außer bei einem Testdefizit). Eigene Wahl und „aus“ im Phasenblatt gehen immer vor. */
export type SlotPurpose = "defizit" | "erhalt" | "double" | "sekundaer";
export const PURPOSE_LABEL: Record<SlotPurpose, string> = { defizit: "Testdefizit", erhalt: "Erhalt", double: "Double down", sekundaer: "Sekundärziel" };
export interface YearSlot { domain: DomainId | null; purpose?: SlotPurpose; reason: string }

const clockOfDomain = (d: DomainId): ClockId | null => (d === "speed" || d === "power" ? "schnellkraft" : (["ke", "anaerob", "aerob", "mobility"] as string[]).includes(d) ? (d as ClockId) : null);
const budgetOf = (c: ClockId) => CLOCKS.find((x) => x.id === c)?.budget ?? 21;
/** Bereiche, die ein Orden ohne Slot reizt: Haupt- und Nebenziele, Bestien halten Kraftausdauer und Intervalle */
function orderTouches(f: Focus): Set<DomainId> {
  const out = new Set<DomainId>([...GOAL_DOMAINS[f.goals.primary], ...f.goals.secondary.flatMap((g) => GOAL_DOMAINS[g])]);
  if (Object.values(f.roles).some((r) => r.blocks.some((x) => x.type === "beast"))) { out.add("ke"); out.add("anaerob"); }
  return out;
}

const yearCache = new WeakMap<AppState, Map<string, YearSlot>>();
/** Schwerpunkte aller laufenden und künftigen Phasen, in der Jahresgesamtschau befüllt */
export function yearSlots(state: AppState, today: string = isoDate(new Date())): Map<string, YearSlot> {
  const hit = yearCache.get(state);
  if (hit) return hit;
  const out = new Map<string, YearSlot>();
  const blocks = [...state.plan].filter((b) => !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start));
  const first = blocks.find((b) => b.end >= today);
  // Hochrechnung startet mit den echten Uhren zum Beginn der laufenden Phase — so bleibt deren Slot stabil
  const last = new Map<ClockId, string | null>();
  if (first) for (const c of residualClocks(state, first.start)) last.set(c.id, c.last);
  const aim1 = state.yearAims?.find((a) => a.prio === 1)?.aim;
  let prev: DomainId | null = null;
  for (const b of blocks) {
    if (b.end < today) continue;
    const f = blockFocus(b);
    if (!f || !slotEligible(f)) { out.set(b.id, { domain: null, reason: f ? `${focusName(f.id)} hat keinen Schwerpunkt-Slot.` : "" }); continue; }
    const mid = addDays(b.start, Math.floor(daysBetween(b.start, b.end) / 2));
    const own = new Set(GOAL_DOMAINS[f.goals.primary]);
    const sec = new Set(f.goals.secondary.flatMap((g) => GOAL_DOMAINS[g]));
    const touches = orderTouches(f);
    const defs = deficitsBefore(state, b.start)?.list ?? [];
    let best: { d: DomainId; s: number; purpose: SlotPurpose; reason: string } | null = null;
    for (const d of Object.keys(SHARPEN) as DomainId[]) {
      if (interferes(f, d)) continue;
      let sc = 0, purpose: SlotPurpose = "sekundaer", reason = "";
      const def = defs.find((x) => x.id === d);
      const c = clockOfDomain(d);
      const ago = c ? (last.get(c) ? daysBetween(last.get(c)!, mid) : Infinity) : 0;
      if (def && !own.has(d)) { sc = def.kind === "norm" ? 5 : def.kind === "estimate" ? 3 : 4; purpose = "defizit"; reason = `Testdefizit: ${def.kind === "norm" ? `${def.score} Punkte` : def.kind === "estimate" ? `geschätzt ${def.score} Punkte` : "schlechter als beim letzten Test"}.`; }
      // Erhalt: länger vernachlässigt zählt mehr — absolut, sonst gewinnt das kürzeste Haltefenster immer
      else if (c && !touches.has(d) && ago >= 0.7 * budgetOf(c)) { sc = 3 + Math.min(0.5, Math.max(0, ago - budgetOf(c)) / 60); purpose = "erhalt";  reason = `Erhalt: ohne Slot läge der letzte Reiz zur Phasenmitte ${ago === Infinity ? "nie" : `${ago} Tage`} zurück (hält etwa ${budgetOf(c)}).`; }
      // Hauptziel des Jahres (oder Spezialist): Double down vor Erhalt
      if (own.has(d)) { const x = (aim1 && DOMAIN_AXIS[d] === aim1) || state.user.focusMode === "special" ? 3.6 : 2.2; if (x > sc) { sc = x; purpose = "double"; reason = `Double down: ${focusName(f.id)} trainiert ${domainName(d)} selbst, der Slot legt nach.`; } }
      // Hirsch: Der Slot hält dein wichtigstes Jahresziel warm, damit die Atempause nichts kostet
      if (b.klammer === "regeneration" && aim1 && DOMAIN_AXIS[d] === aim1 && !own.has(d) && 4.5 > sc) { sc = 4.5; purpose = "erhalt"; reason = `Erhalt im Hirsch: ${domainName(d)} ist dein wichtigstes Ziel und bleibt in der Atempause warm.`; }
      if (sec.has(d) && !own.has(d) && 1.8 > sc) { sc = 1.8; purpose = "sekundaer"; reason = `Sekundärziel: ${domainName(d)} vertieft das Nebenziel von ${focusName(f.id)}.`; }
      if (sc > 0 && prev === d && purpose !== "defizit") sc -= 0.8;
      if (sc > 0 && (!best || sc > best.s)) best = { d, s: sc, purpose, reason };
    }
    let chosen: DomainId | null = best?.d ?? null;
    if (b.sharpen === "off") { chosen = null; out.set(b.id, { domain: null, reason: "Für diese Phase ausgeschaltet." }); }
    else if (b.sharpen && SHARPEN[b.sharpen]) { chosen = b.sharpen as DomainId; out.set(b.id, { domain: chosen, reason: "Selbst gewählt." }); }
    else out.set(b.id, best ? { domain: best.d, purpose: best.purpose, reason: best.reason } : { domain: null, reason: "Kein Bereich braucht hier einen Slot." });
    // Hochrechnung fortschreiben: Was Orden und Slot in dieser Phase reizen, ist zum Phasenende frisch
    for (const d of [...touches, ...(chosen ? [chosen] : [])]) { const c = clockOfDomain(d); if (c) last.set(c, b.end); }
    prev = chosen;
  }
  yearCache.set(state, out);
  return out;
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
      const basis = d.kind === "norm" ? `${d.score} Punkte in der letzten Testwoche` : d.kind === "estimate" ? `geschätzt ${d.score} Punkte in der letzten Testwoche` : "schlechter als beim letzten Test";
      return { domain: d.id, source: "auto", reason: `${basis[0].toUpperCase()}${basis.slice(1)}.${skipped.length ? ` ${skipped.join(", ")}, deshalb der nächste Bereich.` : ""}` };
    }
    return none(skipped.length ? `${skipped.join(", ")}. Die übrigen Defizite passen nicht in einen Slot.` : "Die Defizite passen nicht in einen Slot, sie gehen in den Vorschlag für die Blockfolge.");
  })();

  // --- Seit 1.3 ein Schwerpunkt je Orden: Laufende und künftige Phasen befüllt der Jahresplan (yearSlots),
  //     vergangene behalten die alte Regel (Schwachstelle aus der Testwoche). Slot 2 gibt es nicht mehr.
  const ys = yearSlots(state).get(b.id);
  // Eigene Wahl und „aus“ der übergebenen Phase gehen vor (auch wenn sie noch nicht im Plan gespeichert ist)
  const s1y: SlotPlan = b.sharpen === "off" || (b.sharpen && SHARPEN[b.sharpen]) ? s1
    : ys ? { domain: ys.domain, source: ys.domain ? "auto" : "none", reason: ys.reason, purpose: ys.purpose } : s1;
  const s2: SlotPlan = { domain: null, source: "none", reason: "Ein Schwerpunkt je Orden." };
  return { s1: s1y, s2, deferred };

}

/** Orden dieser Phase mit eingebauten Slots. Ändert nichts, wenn kein Slot aktiv ist.
    Slot 1 belegt seine Tage zuerst, Slot 2 füllt die übrigen (nie am selben Tag).
    Beide Slots zusammen dürfen SLOT_BUDGET der geschätzten Wochenzeit nicht übersteigen;
    sonst kürzt die Leiter erst die Tage von Slot 2, dann Slot 2 selbst, dann die Tage von Slot 1. */
export function applySlots(f: Focus, state: AppState, b: PlanBlock): Focus {
  const plan = slotsFor(state, b);
  // Kein Schwerpunkt, obwohl automatisch: an einem Tag „Mehr vom Ordensziel“ (Inhalt und Junk-Grenze in ui/session/fill.ts)
  if (!plan.s1.domain && !plan.s2.domain) return plan.s1.source === "none" && slotEligible(blockFocus(b) ?? f) && !b.sharpen ? withFill(f, state, b) : f;
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

/** Einmalig (1.35): Phasen, deren Schwerpunkt fest auf genau dem steht, was „Automatisch“ ohnehin wählen würde (früher
    per „Übernehmen“ in der Auswertung festgeschrieben), wieder auf „Automatisch“ – die Vorgabe ist immer automatisch. */
export function unpinAutoSlots(state: AppState): AppState {
  const today = isoDate(new Date());
  const plan = state.plan.map((b) => {
    if (!b.sharpen || b.sharpen === "off" || b.end < today) return b;
    const auto = slotsFor(state, { ...b, sharpen: undefined }).s1.domain;
    return auto === b.sharpen ? { ...b, sharpen: undefined } : b;
  });
  return { ...state, plan, autoSlots: true };
}

/** Platzhalter „Mehr vom Ordensziel“ am kürzesten Trainingstag; bei Schnellkraft und Schnelligkeit frisch am Anfang */
function withFill(f: Focus, state: AppState, b: PlanBlock): Focus {
  const roles = rolesFor(state, b, f).filter((rk) => f.roles[rk]);
  if (!roles.length) return f;
  const rk = roles.reduce((best, x) => ((f.roles[x].minutes ?? 99) < (f.roles[best].minutes ?? 99) ? x : best), roles[0]);
  const blk: Block = { type: "module", module: "sharpen", variant: "ordensziel" };
  const start = f.goals.primary === "power" || f.goals.primary === "speed";
  const r = f.roles[rk];
  return { ...f, roles: { ...f.roles, [rk]: { ...r, blocks: start ? [blk, ...r.blocks] : [...r.blocks, blk] } } };
}

/** Defizite als Gewichte für die Blockfolge: schwächster Bereich zählt am meisten */
export function deficitWeights(list: Deficit[]): { axis: AxisId; w: number }[] {
  const ws = [1, 0.7, 0.5, 0.35];
  const out = new Map<AxisId, number>();
  // Schätzungen zählen halb
  list.slice(0, ws.length).forEach((d, i) => out.set(DOMAIN_AXIS[d.id], Math.max(out.get(DOMAIN_AXIS[d.id]) ?? 0, ws[i] * (d.kind === "estimate" ? 0.5 : 1))));
  return [...out].map(([axis, w]) => ({ axis, w }));
}

export { domainName };

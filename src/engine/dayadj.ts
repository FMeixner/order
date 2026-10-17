/* Tagesanpassung: Kurz · Leicht · Intensiv · Leise · Kein Platz.
   - Kurz, Leicht, Leise und Kein Platz lassen sich kombinieren; Intensiv steht allein (mehr Zeit und Last widerspricht Kurz und Leicht).
   - Kurz, Leise und Kein Platz lassen sich je Wochentag merken (gilt in allen Phasen). Ein gemerkter Kurztag gleicht über die ganze
     Woche aus; ein spontaner nur in den Tagen danach. Ist danach nichts mehr, entfällt der Ausgleich.
   - Leicht: −1 Satz je Übung, Bestien nur Plagen. Gilt nur für diesen Tag.
   - Leise: leise Bestien, laute Übungen ersetzt (Sprünge, Langhantel vom Boden, Würfe), kein Laufen, keine Intervalle, kurzes Warm-up.
   - Kein Platz: Bestien und Übungen ohne Strecke (kein Lunge Walk, Crawl, Carry, Broad Jump, Sprint).
   Je Einheit überschreibt eine Wahl (true/false) das Gemerkte; ohne Wahl gilt das Gemerkte. */
import type { AppState, EquipmentProfile, PlanBlock, Weekday } from "../types";

export type DayKey = "short" | "light" | "quiet" | "tight";
export type FixKey = "short" | "quiet" | "tight";
export interface DayMods { short: boolean; light: boolean; quiet: boolean; tight: boolean; intense: boolean }

const sid = (b: PlanBlock, week: number, role: string) => `${b.id}:${week}:${role}`;

/** Gemerkt für diesen Wochentag. Der alte Kurztag der Phase (shortRole) wirkt nicht mehr: jeder Tag ist normal lang, gekürzt wird über Anpassen. */
export function remembered(state: AppState, _b: PlanBlock, _role: string, day: Weekday | undefined): Record<FixKey, boolean> {
  const f = day ? state.dayFlags?.[day] : undefined;
  return { short: !!f?.short, quiet: !!f?.quiet, tight: !!f?.tight };
}

/** Wirksame Anpassung einer Einheit. `day`: Wochentag der Einheit in dieser Woche. */
export function dayMods(state: AppState, b: PlanBlock, week: number, role: string, day: Weekday | undefined): DayMods {
  const id = sid(b, week, role);
  const own = state.dayAdj?.[id] ?? {};
  const mem = remembered(state, b, role, day);
  const intense = !!state.energy?.[id];
  if (intense) return { short: false, light: false, quiet: false, tight: false, intense };
  return {
    short: own.short ?? mem.short,
    light: own.light ?? !!state.reduced[`${b.id}:${week}`],
    quiet: own.quiet ?? mem.quiet,
    tight: own.tight ?? mem.tight,
    intense,
  };
}

/** Profil, wie es an diesem Tag gilt (Leise und Kein Platz als Eigenschaft des Tages, nicht des Orts) */
export const withDay = (p: EquipmentProfile, m: { quiet: boolean; tight: boolean }): EquipmentProfile =>
  m.quiet === !!p.quiet && m.tight === !!p.tight ? p : { ...p, quiet: m.quiet || undefined, tight: m.tight || undefined };

/** Schalter umlegen. Intensiv löst die anderen, die anderen lösen Intensiv. */
export function toggleMod(state: AppState, b: PlanBlock, week: number, role: string, day: Weekday | undefined, key: DayKey | "intense"): AppState {
  const id = sid(b, week, role);
  const cur = dayMods(state, b, week, role, day);
  const adj = { ...(state.dayAdj ?? {}) };
  const energy = { ...(state.energy ?? {}) };
  const reduced = { ...state.reduced };
  if (key === "intense") {
    if (cur.intense) delete energy[id];
    else {
      energy[id] = true;
      // Gemerktes für heute ausschalten, eigene Wahl verwerfen
      const mem = remembered(state, b, role, day);
      adj[id] = { ...(mem.short ? { short: false } : {}), ...(mem.quiet ? { quiet: false } : {}), ...(mem.tight ? { tight: false } : {}) };
      if (!Object.keys(adj[id]).length) delete adj[id];
    }
    return { ...state, dayAdj: adj, energy };
  }
  delete energy[id];
  const on = !cur[key];
  const mem = remembered(state, b, role, day);
  const next = { ...(adj[id] ?? {}) };
  const fallback = key === "light" ? false : mem[key];
  if (on === fallback) delete next[key]; else next[key] = on;
  // Leicht aus: auch das alte „Diese Woche −1 Satz“ dieser Woche
  if (key === "light" && !on) delete reduced[`${b.id}:${week}`];
  if (Object.keys(next).length) adj[id] = next; else delete adj[id];
  return { ...state, dayAdj: adj, energy, reduced };
}

/** Kurz, Leise oder Kein Platz für diesen Wochentag merken (oder vergessen). Kurz lässt sich nur für einen Wochentag merken. */
export function rememberMod(state: AppState, b: PlanBlock, week: number, role: string, day: Weekday, key: FixKey, on: boolean): AppState {
  const flags = { ...(state.dayFlags ?? {}) };
  if (key === "short" && on) for (const d of Object.keys(flags) as Weekday[]) if (flags[d]?.short) flags[d] = { ...flags[d], short: undefined };
  flags[day] = { ...(flags[day] ?? {}), [key]: on || undefined };
  for (const d of Object.keys(flags) as Weekday[]) if (!flags[d]?.short && !flags[d]?.quiet && !flags[d]?.tight) delete flags[d];
  // Alter Kurztag der Phasen: wird durch den Wochentag ersetzt
  const plan = key === "short" ? state.plan.map((p) => (p.shortRole ? { ...p, shortRole: undefined } : p)) : state.plan;
  // Die eigene Wahl für heute fällt weg, das Gemerkte gilt
  const id = sid(b, week, role);
  const adj = { ...(state.dayAdj ?? {}) };
  if (adj[id]) { const n = { ...adj[id] }; delete n[key]; if (Object.keys(n).length) adj[id] = n; else delete adj[id]; }
  const base = { ...state, dayFlags: flags, plan, dayAdj: adj };
  // Gemerkt heißt: heute an
  return on && !dayMods(base, b, week, role, day)[key] ? toggleMod(base, b, week, role, day, key) : base;
}

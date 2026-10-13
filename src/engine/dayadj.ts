/* Tagesanpassung: Kurz · Leicht · Intensiv · Leise.
   - Kurz, Leicht und Leise lassen sich kombinieren; Intensiv steht allein (mehr Zeit und Last widerspricht Kurz und Leicht).
   - Kurz und Leise lassen sich je Wochentag merken (gilt in allen Phasen). Ein gemerkter Kurztag gleicht über die ganze
     Woche aus; ein spontaner nur in den Tagen danach. Ist danach nichts mehr, entfällt der Ausgleich.
   - Leicht: −1 Satz je Übung, Bestien nur Plagen. Gilt nur für diesen Tag.
   - Leise: keine Bestien, kein Laufen, keine Intervalle, kurzes Warm-up (früher „Schweißfrei“ am Ort).
   Je Einheit überschreibt eine Wahl (true/false) das Gemerkte; ohne Wahl gilt das Gemerkte. */
import type { AppState, EquipmentProfile, PlanBlock, Weekday } from "../types";

export type DayKey = "short" | "light" | "quiet";
export interface DayMods { short: boolean; light: boolean; quiet: boolean; intense: boolean }

const sid = (b: PlanBlock, week: number, role: string) => `${b.id}:${week}:${role}`;

/** Gemerkt für diesen Wochentag (Kurz zusätzlich: alter Kurztag der Phase, solange kein Wochentag gemerkt ist) */
export function remembered(state: AppState, b: PlanBlock, role: string, day: Weekday | undefined): { short: boolean; quiet: boolean } {
  const f = day ? state.dayFlags?.[day] : undefined;
  const anyShort = Object.values(state.dayFlags ?? {}).some((x) => x?.short);
  return { short: !!f?.short || (!anyShort && b.shortRole === role), quiet: !!f?.quiet };
}

/** Wirksame Anpassung einer Einheit. `day`: Wochentag der Einheit in dieser Woche. */
export function dayMods(state: AppState, b: PlanBlock, week: number, role: string, day: Weekday | undefined): DayMods {
  const id = sid(b, week, role);
  const own = state.dayAdj?.[id] ?? {};
  const mem = remembered(state, b, role, day);
  const intense = !!state.energy?.[id];
  if (intense) return { short: false, light: false, quiet: false, intense };
  return {
    short: own.short ?? mem.short,
    light: own.light ?? !!state.reduced[`${b.id}:${week}`],
    quiet: own.quiet ?? mem.quiet,
    intense,
  };
}

/** Profil, wie es an diesem Tag gilt (Leise als Eigenschaft des Tages, nicht des Orts) */
export const withQuiet = (p: EquipmentProfile, quiet: boolean): EquipmentProfile => (quiet === !!p.quiet ? p : { ...p, quiet });

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
      adj[id] = { ...(mem.short ? { short: false } : {}), ...(mem.quiet ? { quiet: false } : {}) };
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

/** Kurz oder Leise für diesen Wochentag merken (oder vergessen). Kurz lässt sich nur für einen Wochentag merken. */
export function rememberMod(state: AppState, b: PlanBlock, week: number, role: string, day: Weekday, key: "short" | "quiet", on: boolean): AppState {
  const flags = { ...(state.dayFlags ?? {}) };
  if (key === "short" && on) for (const d of Object.keys(flags) as Weekday[]) if (flags[d]?.short) flags[d] = { ...flags[d], short: undefined };
  flags[day] = { ...(flags[day] ?? {}), [key]: on || undefined };
  for (const d of Object.keys(flags) as Weekday[]) if (!flags[d]?.short && !flags[d]?.quiet) delete flags[d];
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

type DayFlags = NonNullable<AppState["dayFlags"]>;
/** Gemerktes Kurz (höchstens ein Tag) oder Leise für einen Wochentag umschalten */
export function flipFlag(flags: DayFlags, d: Weekday, k: "short" | "quiet"): DayFlags {
  const out: DayFlags = { ...flags };
  const on = !out[d]?.[k];
  if (k === "short" && on) for (const x of Object.keys(out) as Weekday[]) if (out[x]?.short) out[x] = { ...out[x], short: undefined };
  out[d] = { ...(out[d] ?? {}), [k]: on || undefined };
  for (const x of Object.keys(out) as Weekday[]) if (!out[x]?.short && !out[x]?.quiet) delete out[x];
  return out;
}

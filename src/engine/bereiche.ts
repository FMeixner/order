/* Bereiche (1.3): Uhren, Domänen-Bilanz und Jahresbalance in einer Sicht. Drei Instrumente mit drei
   Einteilungen (7 Uhren, 8 Testdomänen, 8 Achsen) waren schwer zu lesen; hier steht je Bereich genau
   zweierlei:
   - Frische (Rückblick, aus dem Log): Wie lange ist der letzte wirksame Reiz her, gemessen am
     Residualfenster der Uhr? frisch → bald fällig (ab 70 % des Fensters) → fällig (darüber) → noch nie.
   - Im Plan (Vorschau, aus dem Plan): effektive Wochen in den nächsten 26 Wochen (Hauptziel voll,
     Nebenziel halb). Pflichtbereiche brauchen HALF_MIN Wochen; darunter „knapp“, ohne Woche „fehlt“.
   Die Regeln dahinter bleiben, wo sie waren (residual.ts, bilanz.ts); hier wird nur zusammengeführt. */
import type { AppState, PlanBlock } from "../types";
import { blockWeights, HALF_MIN } from "./bilanz";
import { addDays, isTestBlock, parseIso } from "./plan";
import { residualClocks, type ClockId, type ResidualClock } from "./residual";
import { yearSlots } from "./sharpen";

export type Fresh = "fresh" | "soon" | "due" | "never" | "none";
export type Cover = "ok" | "thin" | "missing" | "free";

export interface BereichDef { id: string; name: string; hint: string; clock?: ClockId; domains: string[]; required: boolean }

/** Die Bereiche in Alltagssprache. Kraft und Masse teilen eine Uhr; Skill hat keine Uhr; Sehnen und Masse ohne Pflicht. */
export const BEREICHE: BereichDef[] = [
  { id: "kraft", name: "Kraft", hint: "Maximalkraft", clock: "kraft", domains: ["strength"], required: true },
  { id: "masse", name: "Muskel", hint: "Masse, läuft mit der Kraft", domains: ["masse"], required: false },
  { id: "schnellkraft", name: "Spritzigkeit", hint: "Sprungkraft und Tempo", clock: "schnellkraft", domains: ["speed", "power"], required: true },
  { id: "ke", name: "Kraftausdauer", hint: "viele Wiederholungen", clock: "ke", domains: ["ke"], required: true },
  { id: "anaerob", name: "Intervalle", hint: "kurz und hart (anaerob)", clock: "anaerob", domains: ["anaerob"], required: true },
  { id: "aerob", name: "Grundausdauer", hint: "lang und locker (aerob)", clock: "aerob", domains: ["aerob"], required: true },
  { id: "mobility", name: "Beweglichkeit", hint: "Reichweite und Kontrolle", clock: "mobility", domains: ["mobility"], required: true },
  { id: "sehnen", name: "Sehnen", hint: "Halten und Bindegewebe", clock: "sehnen", domains: ["sehnen"], required: false },
  { id: "skill", name: "Skill", hint: "Bewegungskönnen", domains: ["skill"], required: true },
];

/** Im Blick (1.3.2): ein Zustand aus Frische und Plan — gut, bald, fehlt */
export type Watch = "gut" | "bald" | "fehlt";

export interface BereichRow {
  def: BereichDef;
  /** Zusammengefasst: fehlt (Pflichtbereich ohne Woche im Plan), bald (fällig, noch nie, knapp im Plan oder bald fällig), sonst gut */
  watch: Watch;
  /** Kurzer Grund für bald und fehlt */
  why: string;
  fresh: Fresh;
  /** Tage seit dem letzten Reiz; null = noch nie oder ohne Uhr */
  days: number | null;
  budget: number | null;
  /** Effektive Wochen im Plan in den nächsten 26 Wochen */
  weeks: number;
  cover: Cover;
}

const WINDOW = 26 * 7;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Effektive Wochen je Domäne im Fenster [from, from + 26 Wochen) — Testwochen zählen nicht */
/** Ein Schwerpunkt-Slot zählt als halbe Woche für seinen Bereich (Erhaltungsdosis, kein eigener Block) */
export const SLOT_WEIGHT = 0.5;

export function planCoverage(plan: PlanBlock[], from: string, slots?: Map<string, { domain: string | null }>): Record<string, number> {
  const to = addDays(from, WINDOW - 1);
  const out: Record<string, number> = {};
  for (const b of plan) {
    if (isTestBlock(b) || b.end < from || b.start > to) continue;
    const s = b.start < from ? from : b.start, e = b.end > to ? to : b.end;
    const weeks = ((parseIso(e).getTime() - parseIso(s).getTime()) / 864e5 + 1) / 7;
    for (const [d, w] of blockWeights(b)) out[d] = (out[d] ?? 0) + w * weeks;
    const sd = slots?.get(b.id)?.domain;
    if (sd) out[sd] = (out[sd] ?? 0) + SLOT_WEIGHT * weeks;
  }
  for (const k of Object.keys(out)) out[k] = round1(out[k]);
  return out;
}

export function freshOf(c: ResidualClock | undefined, anyData: boolean): Fresh {
  if (!c) return "none";
  if (c.days === null) return anyData ? "never" : "none";
  if (c.over) return "due";
  return c.days >= c.budget * 0.7 ? "soon" : "fresh";
}

export function bereiche(state: AppState, today: string, plan: PlanBlock[] = state.plan, clocks: ResidualClock[] = residualClocks(state, today)): BereichRow[] {
  const anyData = clocks.some((c) => c.days !== null);
  const cov = planCoverage(plan, today, yearSlots({ ...state, plan }, today));
  return BEREICHE.map((def) => {
    const c = def.clock ? clocks.find((x) => x.id === def.clock) : undefined;
    const weeks = round1(def.domains.reduce((s, d) => s + (cov[d] ?? 0), 0));
    const cover: Cover = !def.required ? "free" : weeks >= HALF_MIN ? "ok" : weeks > 0 ? "thin" : "missing";
    const fresh = freshOf(c, anyData);
    const { watch, why } = watchOf(fresh, cover);
    return { def, watch, why, fresh, days: c?.days ?? null, budget: c?.budget ?? null, weeks, cover };
  });
}

/** Ein Zustand aus zwei: Plan-Lücke wiegt am schwersten, dann alles, was bald nachlässt */
export function watchOf(fresh: Fresh, cover: Cover): { watch: Watch; why: string } {
  if (cover === "missing") return { watch: "fehlt", why: "fehlt im Plan" };
  if (fresh === "due" || fresh === "never") return { watch: "bald", why: fresh === "never" ? "noch nie trainiert" : "fällig" };
  if (cover === "thin") return { watch: "bald", why: "knapp im Plan" };
  if (fresh === "soon") return { watch: "bald", why: "bald fällig" };
  return { watch: "gut", why: "" };
}

/** Kurzbilanz für das Status-Symbol im Plan: fällige Bereiche und Lücken im Plan */
export function bereicheSummary(rows: BereichRow[]): { due: BereichRow[]; gaps: BereichRow[] } {
  return { due: rows.filter((r) => r.watch === "bald"), gaps: rows.filter((r) => r.watch === "fehlt") };
}


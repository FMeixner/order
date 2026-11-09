/* Ansage-Drill (Modul "call", data/modules/calls.json): Die App ruft zufällige Richtungen, Hiebe oder Schläge,
   per Sprache und in großer Schrift; du entscheidest im Moment. Aus einer geschlossenen Aufgabe wird eine offene.
   - Stufen nach Woche im Orden (weeks) oder, bei Waffen, nach deinem Lernweg (path): Der Pool wächst, jede erreichte
     Stufe kommt dazu, die neueste Stufe wird öfter gerufen.
   - Waffe ohne Schwert oder Stock am Ort: die Ersatz-Variante (fallback), meist Richtungen.
   - Kurztag: halb so viele Runden (mindestens zwei). Entlastungswoche: eine Runde weniger.
   - Der Abstand der Ansagen ist zufällig (gap, Sekunden), damit nichts vorhersehbar wird.
   Grundlage: Tomporowski & Pesce (2019), Ludyga et al. (2020). Dass gerade dieses Format mehr bringt als
   normales Training, ist nicht direkt belegt: Die App nennt es „Entscheiden unter Zeitdruck“. */
import { CALLS } from "../data";
import type { Block, CallVariant, EquipmentProfile, UserProfile } from "../types";
import { pathLevel } from "./plan";

export interface CallView {
  variant: string;
  def: CallVariant;
  rounds: number;
  /** erreichte Stufe (0 = erste) und ihr Name */
  level: number;
  levelName: string;
  /** Ansagen mit Gewicht: neueste Stufe doppelt */
  pool: string[];
  /** ersetzt, weil am Ort kein Schwert oder Stock */
  replaced?: string;
}

export const CALL_SETUP = 30;

export function callLevel(def: CallVariant, user: UserProfile, week: number): number {
  if (def.path) return Math.min(def.levels.length - 1, pathLevel(def.path, user.skills));
  let i = 0;
  def.levels.forEach((l, j) => { if ((l.weeks ?? 1) <= week) i = j; });
  return i;
}

export function callView(b: Extract<Block, { type: "module" }>, user: UserProfile, week: number, profile?: EquipmentProfile, opts: { short?: boolean; deload?: boolean } = {}): CallView | null {
  let variant = b.variant;
  let def = CALLS[variant];
  if (!def) return null;
  let replaced: string | undefined;
  if (def.tool === "sword" && profile && !profile.has.sword) {
    if (!def.fallback || !CALLS[def.fallback]) return null;
    replaced = def.name;
    variant = def.fallback;
    def = CALLS[variant];
  }
  const level = callLevel(def, user, week);
  const pool = def.levels.slice(0, level + 1).flatMap((l, j) => (j === level && level > 0 ? [...l.cues, ...l.cues] : l.cues));
  let rounds = def.rounds;
  if (opts.short || b.short) rounds = Math.max(2, Math.ceil(rounds / 2));
  if (opts.deload) rounds = Math.max(2, rounds - 1);
  return { variant, def, rounds, level, levelName: def.levels[level].name, pool, replaced };
}

/** Sekunden des Blocks: Runden mit Pausen dazwischen, plus Einrichten */
export function callSeconds(b: Extract<Block, { type: "module" }>, p?: EquipmentProfile): number {
  let d = CALLS[b.variant];
  if (!d) return 0;
  if (d.tool === "sword" && p && !p.has.sword) { d = d.fallback ? CALLS[d.fallback] : undefined as unknown as CallVariant; if (!d) return 0; }
  const n = b.short ? Math.max(2, Math.ceil(d.rounds / 2)) : d.rounds;
  return n * d.work + (n - 1) * d.rest + CALL_SETUP;
}

/** Nächste Ansage: zufällig, nie zweimal dieselbe hintereinander */
export function nextCue(pool: string[], prev: string | null, rnd: () => number = Math.random): string {
  const opts = pool.filter((c) => c !== prev);
  const list = opts.length ? opts : pool;
  return list[Math.floor(rnd() * list.length)];
}

/** Abstand bis zur nächsten Ansage in Millisekunden */
export const nextGap = (def: CallVariant, rnd: () => number = Math.random) => Math.round((def.gap[0] + rnd() * (def.gap[1] - def.gap[0])) * 1000);

/* Erzähler: Der Aschekurier, ein Flugblatt. Macht aus dem Log eine Geschichte, einen Orden lang.
   Alles wird aus den Trainingsdaten berechnet, auch die Würfel (fester Startwert je Woche).
   Ein- und Ausschalten verliert also nichts, und die Geschichte ändert sich nicht beim Neuladen.
   Texte und Welt stehen in data/narrative/generic.json. Eigene Welten ersetzen Teile davon. */
import { allRuns, runGroups } from "./runs";
import genericJson from "../../data/narrative/generic.json";
import { FOCUS_BY_ID, TESTWEEK } from "../data";
import type { AppState, PlanBlock, Session } from "../types";
import { evaluateBlock } from "./norms";
import { beastById, blockWeeks, dayRoleMap, isDeloadWeek, isTestBlock, weekInBlock } from "./plan";
import { focusFor } from "./weekplan";

/* ---------- Welt-Paket ---------- */
export type Weak = "bestie" | "stahl" | "treue";
export interface Foe { nom: string; dat: string; akk: string; gen?: string; pro: "er" | "sie"; weak: Weak; desc: string }
export interface Scene { name: string; ort: string; setting: string[]; foes: Foe[]; schar: string[]; epithets: string[] }
/** Wer erzählt, und wie die Rubriken heißen */
export interface Narrator {
  name: string; archive: string; issue: string; first: string; special: string; finale: string;
  aside: string; tournament: string; acts: string[]; parts: string[];
}
export interface WorldPack {
  id: string;
  name: string;
  desc?: string;
  narrator: Narrator;
  weak: Record<Weak, string>;
  default: string;
  orders: Record<string, string>;
  scenes: Record<string, Scene>;
  tables: Record<string, string[]>;
}
export const GENERIC_PACK = genericJson as unknown as WorldPack;

/** Eigene Welt über die generische legen: Was fehlt, kommt aus der generischen. */
export function mergePack(custom: Partial<WorldPack> | null | undefined): WorldPack {
  const g = GENERIC_PACK;
  if (!custom) return g;
  return {
    ...g, ...custom,
    weak: { ...g.weak, ...(custom.weak ?? {}) },
    narrator: { ...g.narrator, ...(custom.narrator ?? {}) },
    orders: { ...g.orders, ...(custom.orders ?? {}) },
    scenes: { ...g.scenes, ...(custom.scenes ?? {}) },
    tables: { ...g.tables, ...(custom.tables ?? {}) },
  };
}

export function narratorOf(state: AppState): Narrator {
  return mergePack(state.narrative?.pack as Partial<WorldPack> | null).narrator;
}

/** Prüft eine hochgeladene Welt. Gibt Fehlermeldungen zurück, leer heißt: passt. */
export function checkPack(raw: unknown): string[] {
  const errs: string[] = [];
  if (!raw || typeof raw !== "object") return ["Keine JSON-Datei mit einem Objekt."];
  const p = raw as Partial<WorldPack>;
  if (!p.name) errs.push("Feld „name“ fehlt.");
  const merged = mergePack(p);
  for (const [order, scene] of Object.entries(merged.orders)) if (!merged.scenes[scene]) errs.push(`Orden ${order} verweist auf die unbekannte Szene „${scene}“.`);
  if (!merged.scenes[merged.default]) errs.push(`Standard-Szene „${merged.default}“ fehlt.`);
  for (const [id, s] of Object.entries(merged.scenes)) {
    if (!s.ort || !s.setting?.length || !s.foes?.length || !s.schar?.length || !s.epithets?.length) errs.push(`Szene ${id}: ort, setting, foes, schar und epithets brauchen Inhalt.`);
    for (const f of s.foes ?? []) if (!f.nom || !f.dat || !f.akk || !["er", "sie"].includes(f.pro) || !["bestie", "stahl", "treue"].includes(f.weak)) errs.push(`Szene ${id}: Widersacher „${f.nom ?? "?"}“ braucht nom, dat, akk, pro (er/sie) und weak (bestie/stahl/treue).`);
  }
  for (const [k, v] of Object.entries(merged.tables)) if (!Array.isArray(v) || !v.length) errs.push(`Tabelle ${k} ist leer.`);
  return errs;
}

/* ---------- Zufall mit festem Startwert ---------- */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Karte i aus einem gemischten Stapel: Wiederholt sich erst, wenn der Stapel durch ist. */
export function deck<T>(arr: T[], seed: string, i: number): T {
  const r = rng(hash(seed));
  const idx = arr.map((_, k) => k);
  for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
  return arr[idx[((i % arr.length) + arr.length) % arr.length]];
}
export function d20(seed: string): number {
  return 1 + Math.floor(rng(hash(seed))() * 20);
}

/* ---------- Platzhalter ---------- */
export type Vars = Record<string, string | number | undefined>;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export interface Hero { name: string; pro: "sie" | "er" }
export function heroOf(state: AppState): Hero {
  const n = state.narrative;
  return { name: (n?.hero ?? state.user.name ?? "").trim(), pro: n?.pronoun ?? (state.user.sex === "m" ? "er" : "sie") };
}
function heroVars(h: Hero): Vars {
  const f = h.pro === "sie";
  const held = h.name || (f ? "die Heldin" : "der Held");
  return {
    held, sie: f ? "sie" : "er", ihn: f ? "sie" : "ihn", ihm: f ? "ihr" : "ihm", ihr: f ? "ihr" : "sein",
    die: f ? "die" : "der", in: f ? "in" : "",
  };
}

export function fill(tpl: string, v: Vars): string {
  // {held} klein, {Held} am Satzanfang groß
  return tpl.replace(/\{([A-Za-z_]+)\}/g, (m, key: string) => {
    const lower = key[0].toLowerCase() + key.slice(1);
    const val = v[key] ?? v[lower];
    if (val == null) return m;
    return key !== lower ? cap(String(val)) : String(val);
  });
}

/* ---------- Kapitel eines Ordens ---------- */
export type LineKind = "head" | "text" | "roll" | "hp" | "aside" | "stat";
export interface Line { kind: LineKind; text: string; value?: number; max?: number }
export interface WeekRecap { week: number; done: number; planned: number; roll: number | null; dmg: number; dealt: number; lines: Line[]; complete: boolean }
export type Outcome = "triumph" | "win" | "close";
export interface Chapter {
  block: PlanBlock;
  sceneId: string;
  scene: Scene;
  foe: Foe;
  hp: number;
  /** Lebenspunkte jetzt, nach jeder erledigten Einheit (Start: hp) */
  liveHp: number;
  dealt: number;
  weeks: WeekRecap[];
  prologue: Line[];
  /** Orden vorbei (letzte Woche abgeschlossen oder Block zu Ende) */
  ended: boolean;
  outcome: Outcome | null;
  epithet: string;
  saga: Line[];
  stats: { done: number; planned: number; prs: number; steel: number; crits: number; fumbles: number; beasts: number };
  vars: Vars;
}

const DMG = { session: 10, fullWeek: 5, pr: 5, steel: 2, crit: 10, high: 3 };

function sessionsOfWeek(state: AppState, b: PlanBlock, week: number): Session[] {
  return state.sessions.filter((s) => s.done && s.blockId === b.id && s.week === week);
}
function plannedOf(state: AppState, b: PlanBlock, week: number): number {
  const f = focusFor(state, b, week) ?? FOCUS_BY_ID[b.focusId];
  return f ? dayRoleMap(state, b, f).length : 0;
}
/** Bestzeiten dieser Einheiten: nur echte Verbesserungen gegen frühere Zeiten derselben Bestie */
function prsOf(state: AppState, list: Session[]): string[] {
  const out: string[] = [];
  for (const s of list) {
    const runs = allRuns(s).filter((x) => !!x.seconds && !x.easy);
    for (const r of runs) {
      const before = (state.beastTimes[r.id] ?? []).filter((t) => t.date < s.date).map((t) => t.seconds);
      if (before.length && r.seconds! < Math.min(...before)) out.push(beastById(r.id)?.name ?? r.id);
    }
  }
  return out;
}
/** Übungen, bei denen das Gewicht gegenüber der letzten Einheit mit dieser Übung gestiegen ist */
function steelOf(state: AppState, list: Session[]): number {
  let n = 0;
  for (const s of list) {
    for (const e of Object.values(s.entries)) {
      const ws = e.sets.filter((x) => x.done && x.weight != null).map((x) => x.weight as number);
      if (!ws.length) continue;
      const prev = state.sessions
        .filter((o) => o.done && o.date < s.date && o.entries[e.key])
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const pw = prev?.entries[e.key].sets.filter((x) => x.done && x.weight != null).map((x) => x.weight as number) ?? [];
      if (pw.length && Math.max(...ws) > Math.max(...pw)) n++;
    }
  }
  return n;
}

function sceneFor(pack: WorldPack, focusId: string): [string, Scene] {
  const id = pack.orders[focusId] ?? pack.default;
  return [id, pack.scenes[id] ?? pack.scenes[pack.default]];
}

/** Letzter Orden vor diesem Block (ohne Testwochen), für Rückbezüge */
export function previousOrderBlock(state: AppState, b: PlanBlock): PlanBlock | null {
  return [...state.plan]
    .filter((x) => !isTestBlock(x) && x.start < b.start && FOCUS_BY_ID[x.focusId])
    .sort((a, c) => c.start.localeCompare(a.start))[0] ?? null;
}

export function chapterOf(state: AppState, b: PlanBlock, today: string, depth = 0): Chapter {
  const pack = mergePack(state.narrative?.pack as Partial<WorldPack> | null);
  const hero = heroOf(state);
  const [sceneId, scene] = sceneFor(pack, b.focusId);
  const seed = `${b.id}`;
  const foe = deck(scene.foes, `${seed}:foe`, 0);
  const total = blockWeeks(b);
  const curWeek = today > b.end ? total + 1 : weekInBlock(b, today);
  const epithet = deck(scene.epithets, `${seed}:epi`, 0);
  const vars: Vars = {
    ...heroVars(hero), feind: foe.nom, feind_dat: foe.dat, feind_akk: foe.akk, feind_gen: foe.gen ?? `von ${foe.dat}`, fp: foe.pro, ort: scene.ort,
    beiname: fill(epithet, heroVars(hero)),
  };
  const T = (name: string, i: number, extra: Vars = {}) => fill(deck(pack.tables[name] ?? [""], `${seed}:${name}`, i), { ...vars, ...extra });

  // Lebenspunkte: 90 % der geplanten Einheiten reichen für den Sieg
  let plannedTotal = 0;
  for (let w = 1; w <= total; w++) plannedTotal += plannedOf(state, b, w);
  const hp = Math.max(10, Math.round(plannedTotal * DMG.session * 0.9));

  // Prolog, mit Rückbezug auf den Orden davor
  const prologue: Line[] = [{ kind: "head", text: scene.name }];
  const prevB = depth === 0 ? previousOrderBlock(state, b) : null;
  const prev = prevB ? chapterOf(state, prevB, today, depth + 1) : null;
  if (prev && prev.stats.done > 0) {
    prologue.push({ kind: "text", text: T("prolog_next", 0, prevVars(prev)) });
  } else prologue.push({ kind: "text", text: T("prolog", 0) });
  prologue.push({ kind: "text", text: deck(scene.setting, `${seed}:set`, 0) });
  prologue.push({ kind: "text", text: T("foe_intro", 0, { desc: foe.desc }) });
  prologue.push({ kind: "stat", text: T("weak_intro", 0, { weak: pack.weak[foe.weak] }) });

  const weeks: WeekRecap[] = [];
  let dealt = 0;
  const stats = { done: 0, planned: plannedTotal, prs: 0, steel: 0, crits: 0, fumbles: 0, beasts: 0 };
  let asideI = 0;
  for (let w = 1; w <= Math.min(total, curWeek); w++) {
    const list = sessionsOfWeek(state, b, w);
    const done = new Set(list.map((s) => s.role)).size;
    const planned = plannedOf(state, b, w);
    const complete = w < curWeek || (planned > 0 && done >= planned);
    if (!complete) break;
    const lines: Line[] = [];
    const act = (x: number) => (x <= Math.ceil(total / 3) ? 1 : x <= Math.ceil((2 * total) / 3) ? 2 : 3);
    if (w > 1 && act(w) !== act(w - 1)) {
      lines.push({ kind: "head", text: pack.narrator.acts[act(w) - 1] || (act(w) === 2 ? "Zweiter Akt" : "Dritter Akt") });
      lines.push({ kind: "text", text: T(act(w) === 2 ? "act2" : "act3", 0).replace(/^(Zweiter|Dritter) Akt\.\s*/, "") });
    }
    const f = FOCUS_BY_ID[b.focusId];
    const reduced = !!state.reduced[`${b.id}:${w}`] || (f ? isDeloadWeek(f, w) : false);
    const schar = deck(scene.schar, `${seed}:schar`, w);
    const ratio = planned ? done / planned : 0;
    lines.push({ kind: "text", text: T(done === 0 ? "week_rest" : ratio >= 1 ? "week_full" : ratio >= 0.5 ? "week_good" : "week_some", w, { n: done, von: planned, schar }) });
    let dmg = done * DMG.session;
    let roll: number | null = null;
    let weakHit = false;
    if (done > 0) {
      if (ratio >= 1) { dmg += DMG.fullWeek; if (foe.weak === "treue") { dmg += DMG.fullWeek * 2; weakHit = true; } }
      roll = d20(`${seed}:w${w}`);
      if (roll === 20) { dmg += DMG.crit; stats.crits++; lines.push({ kind: "roll", value: 20, text: T("crit", stats.crits - 1) }); }
      else if (roll === 1) { stats.fumbles++; lines.push({ kind: "roll", value: 1, text: T("fumble", stats.fumbles - 1) }); }
      else if (roll >= 15) { dmg += DMG.high; lines.push({ kind: "roll", value: roll, text: T("high", w) }); }
      else lines.push({ kind: "roll", value: roll, text: "" });
      // Besiegte Bestien der Woche: entfesselt oder mutiert, Serien als Doppelschlag
      const runs = list.flatMap((x) => runGroups(x).map((g) => ({ parts: g.parts?.length ? g.parts.map((p) => p.id) : g.beast ? [g.beast.id] : [] }))).filter((r) => r.parts.length);
      const nameOf = (id: string) => beastById(id.split("~")[0].replace(/×\d+$/, ""))?.name ?? id;
      runs.slice(0, 2).forEach((r, i) => {
        if (r.parts.length > 1) lines.push({ kind: "text", text: T("bestie_serie", stats.beasts + i, { bestie: nameOf(r.parts[0]), bestie_zwei: nameOf(r.parts[1]) }) });
        else lines.push({ kind: "text", text: T(r.parts[0].includes("~hex") ? "bestie_mutiert" : "bestie_entfesselt", stats.beasts + i, { bestie: nameOf(r.parts[0]) }) });
      });
      stats.beasts += runs.length;
      const prs = prsOf(state, list);
      prs.slice(0, 2).forEach((name, i) => lines.push({ kind: "text", text: T("pr", stats.prs + i, { bestie: name }) }));
      stats.prs += prs.length;
      dmg += prs.length * (foe.weak === "bestie" ? DMG.pr * 3 : DMG.pr);
      if (prs.length && foe.weak === "bestie") weakHit = true;
      const steel = steelOf(state, list);
      if (steel) lines.push({ kind: "text", text: T("steel", w, { n: steel, schar, stellen: steel === 1 ? "einer Stelle" : `${steel} Stellen`, mal: steel === 1 ? "einmal" : `${steel}-mal` }) });
      stats.steel += steel;
      dmg += Math.min(steel, 5) * (foe.weak === "stahl" ? DMG.steel * 2.5 : DMG.steel);
      if (steel && foe.weak === "stahl") weakHit = true;
      if (weakHit) lines.push({ kind: "text", text: T("weak", w) });
    }
    if (reduced) lines.push({ kind: "text", text: T("reduced", w) });
    if (done > 0) lines.push({ kind: "text", text: T("lage", w, { schar }) });
    stats.done += done;
    dealt += Math.round(dmg);
    const last = w === total;
    if (!last && dealt >= hp) lines.push({ kind: "text", text: T("stand", w) });
    const shown = last ? Math.min(dealt, hp) : Math.min(dealt, hp - 1);
    lines.push({ kind: "hp", text: cap(foe.nom), value: hp - shown, max: hp });
    if (!last) lines.push({ kind: "aside", text: T("aside", asideI++) });
    weeks.push({ week: w, done, planned, roll, dmg: Math.round(dmg), dealt, lines, complete });
  }

  const ended = weeks.length === total;
  // Laufende Woche: jede erledigte Einheit trifft sofort, Wochenboni kommen am Wochenende dazu. Start bei 100 %.
  let live = dealt;
  if (!ended) {
    const w = weeks.length + 1;
    if (w <= total) live += new Set(sessionsOfWeek(state, b, w).map((x) => x.role)).size * DMG.session;
  }
  const liveHp = ended ? hp - Math.min(dealt, hp) : hp - Math.min(live, hp - 1);
  const outcome: Outcome | null = ended ? (dealt >= hp * 1.2 ? "triumph" : dealt >= hp ? "win" : "close") : null;
  const saga: Line[] = [];
  if (ended && outcome) {
    const finale = { kind: "text" as const, text: T(`finale_${outcome}`, 0) };
    weeks[weeks.length - 1].lines.splice(-1, 0, { kind: "head", text: pack.narrator.finale }, finale);
    saga.push({ kind: "head", text: `${pack.narrator.special}: ${scene.name}` });
    saga.push({ kind: "text", text: T("saga_open", 0) });
    for (const l of prologue.slice(1, 3)) saga.push(l);
    const acts = [1, 2, 3].map((a) => weeks.filter((x) => (x.week <= Math.ceil(total / 3) ? 1 : x.week <= Math.ceil((2 * total) / 3) ? 2 : 3) === a));
    const actName = pack.narrator.parts;
    acts.forEach((ws, i) => {
      if (!ws.length) return;
      const d = ws.reduce((s, x) => s + x.done, 0), p = ws.reduce((s, x) => s + x.planned, 0);
      saga.push({ kind: "stat", text: `${actName[i]}: ${d} von ${p} Streifzügen` });
    });
    saga.push(finale);
    saga.push({ kind: "text", text: T("epithet", 0) });
    const parts = [`${stats.done} von ${stats.planned} Einheiten`];
    if (stats.prs) parts.push(`${stats.prs} ${stats.prs === 1 ? "Bestzeit" : "Bestzeiten"}`);
    if (stats.steel) parts.push(`${stats.steel}× Gewicht nachgelegt`);
    if (stats.crits) parts.push(`${stats.crits} ${stats.crits === 1 ? "kritischer Treffer" : "kritische Treffer"}`);
    if (stats.fumbles) parts.push(`${stats.fumbles} ${stats.fumbles === 1 ? "Patzer" : "Patzer"}`);
    saga.push({ kind: "stat", text: parts.join(" · ") });
  }
  return { block: b, sceneId, scene, foe, hp, dealt, liveHp, weeks, prologue, ended, outcome, epithet: String(vars.beiname), saga, stats, vars };
}

function prevVars(prev: Chapter): Vars {
  return {
    vorsieg: prev.outcome === "close" || !prev.ended ? "der Jagd auf" : "dem Sieg über",
    vorfeind_akk: prev.foe.akk, vorfeind_dat: prev.foe.dat, beiname: prev.epithet,
  };
}

/* ---------- Turnier (Testwoche) ---------- */
export interface CupLine { cupId: string; cup: string; focus: string; text: string | null; result: "first" | "better" | "same" | "worse" | null }
export function tournamentOf(state: AppState, b: PlanBlock, today: string): { intro: string; cups: CupLine[] } {
  const pack = mergePack(state.narrative?.pack as Partial<WorldPack> | null);
  const hero = heroOf(state);
  const hv = heroVars(hero);
  const seed = `${b.id}:cup`;
  // Rückbezug: bei einer eigenen Testwoche der Orden davor, bei einer Testwoche im Orden dieser Orden
  const refBlock = isTestBlock(b) ? previousOrderBlock(state, b) : b;
  const prev = refBlock ? chapterOf(state, refBlock, today, 1) : null;
  const pv = prev && prev.stats.done > 0 ? prevVars(prev) : null;
  const intro = pv
    ? fill(deck(pack.tables.cup_intro, seed, 0), { ...hv, ...pv })
    : fill(deck(pack.tables.cup_intro_first, seed, 0), hv);
  const ev = evaluateBlock(state, b.id);
  const byTest = Object.fromEntries(ev.domains.flatMap((d) => d.tests).map((t) => [t.test.id, t]));
  const cups: CupLine[] = TESTWEEK.cups.map((c, i) => {
    const res = c.tests.map((t) => byTest[t.id]).filter(Boolean);
    const klinge = c.name.replace(/-Cup$/, "");
    if (!res.length) return { cupId: c.id, cup: c.name, focus: c.focus, text: null, result: null };
    const ch = res.map((r) => r.change);
    const result = ch.every((x) => x == null) ? "first" : ch.includes("better") ? "better" : ch.includes("same") || ch.includes(null) ? "same" : "worse";
    return { cupId: c.id, cup: c.name, focus: c.focus, result, text: fill(deck(pack.tables[`cup_${result}`], `${seed}:${result}`, i), { ...hv, klinge }) };
  });
  return { intro, cups };
}

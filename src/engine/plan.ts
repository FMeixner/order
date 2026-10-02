/* Jahresplan, Blockwochen, Rollen auf Trainingstage, Orden-Vorschläge, Bestien-Auswahl, Warm-up-Dosis. */
import { BANDS, BEAST_LOADS, BEASTS, BEAST_BY_ID, DM_VARIANTS, DRILL_LISTS, FLOWS, FOCUS_BY_ID , SHARPEN } from "../data";
import type { AppState, Beast, BeastClass, Block, Drill, EquipmentProfile, Focus, Load, PlanBlock, UserProfile, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { beastOk, hexFor, hexWith } from "./skills";

/* ---------- Datum ---------- */
export function isoDate(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function mondayOf(s: string): string {
  const d = parseIso(s);
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return isoDate(d);
}
export function weekdayOf(s: string): Weekday {
  return WEEKDAYS[(parseIso(s).getDay() + 6) % 7];
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}
export function fmtDate(s: string): string {
  const d = parseIso(s);
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
}

/* ---------- Blöcke ---------- */
/** Anzahl Blockwochen (Wochen beginnen montags; ein Rest von bis zu 3 Tagen zählt nicht als eigene Woche) */
export function blockWeeks(b: PlanBlock): number {
  return Math.max(1, Math.round((daysBetween(mondayOf(b.start), b.end) + 1) / 7));
}
/* ---------- Testwoche als eigener Block ---------- */
export const TEST_BLOCK = "test";
export const isTestBlock = (b: PlanBlock | null | undefined) => b?.focusId === TEST_BLOCK;
export const focusName = (id: string) => (id === TEST_BLOCK ? "Testwoche" : FOCUS_BY_ID[id]?.name ?? "Orden fehlt");
/** Folgt direkt eine eigene Testwoche? Dann entfällt die Testwoche im Orden, die letzte Woche läuft mit −1 Satz. */
export function followedByTest(plan: PlanBlock[], b: PlanBlock): boolean {
  return plan.some((x) => isTestBlock(x) && x.start === addDays(b.end, 1));
}
/** Nach einer Phase eine Testwoche einschieben; alle späteren Phasen rücken eine Woche nach hinten. */
export function insertTestWeek(plan: PlanBlock[], afterId: string, id: string): PlanBlock[] {
  const after = plan.find((b) => b.id === afterId);
  if (!after) return plan;
  const start = addDays(after.end, 1);
  const shifted = plan.map((b) => (b.start >= start ? { ...b, start: addDays(b.start, 7), end: addDays(b.end, 7) } : b));
  return [...shifted, { id, focusId: TEST_BLOCK, label: "Testwoche", start, end: addDays(start, 6), load: after.load, travel: false }];
}

/** Die letzte Woche einer Phase als eigene Testwoche abtrennen; nichts verschiebt sich. */
export function splitTestWeek(plan: PlanBlock[], id: string, newId: string): PlanBlock[] {
  const b = plan.find((x) => x.id === id);
  if (!b || blockWeeks(b) < 3) return plan;
  const start = addDays(b.end, -6);
  return [...plan.map((x) => (x.id === id ? { ...x, end: addDays(start, -1) } : x)), { id: newId, focusId: TEST_BLOCK, label: "Testwoche", start, end: b.end, load: b.load, travel: false }];
}

export function blockAt(plan: PlanBlock[], date: string): PlanBlock | null {
  return plan.find((b) => b.start <= date && date <= b.end) ?? null;
}
export function nextBlock(plan: PlanBlock[], date: string): PlanBlock | null {
  return [...plan].filter((b) => b.start > date).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}
export function weekInBlock(b: PlanBlock, date: string): number {
  return Math.floor(daysBetween(mondayOf(b.start), mondayOf(date)) / 7) + 1;
}
export function isAWeek(week: number): boolean {
  return week % 2 === 1;
}
export function isTestWeek(f: Focus, b: PlanBlock, week: number): boolean {
  if (f.test_weeks?.includes(week)) return true;
  return !!f.test_week && week === blockWeeks(b) && blockWeeks(b) >= 4;
}
export function isDeloadWeek(f: Focus, week: number): boolean {
  return !!f.deload_weeks?.includes(week);
}

/* ---------- Rollen auf Tage ---------- */
export function scheduleFor(state: AppState, b: PlanBlock | null): Partial<Record<Weekday, string | null>> {
  return b?.schedule && Object.values(b.schedule).some(Boolean) ? b.schedule : state.schedule;
}
export function trainingDays(state: AppState, b: PlanBlock | null = null): Weekday[] {
  const sch = scheduleFor(state, b);
  return WEEKDAYS.filter((d) => !!sch[d]);
}

/** Rollen in der Reihenfolge der Trainingstage */
export function defaultRoles(f: Focus, nDays: number): string[] {
  if (nDays <= 3) return f.week_3.slice(0, Math.max(1, nDays));
  const base = [...f.week_4];
  const extras = Object.keys(f.roles).filter((r) => !base.includes(r));
  // Ab fünf Tagen: Zusatztage zwischen die schweren Tage, damit nicht vier harte Tage am Stück kommen
  const out = [...base];
  extras.slice(0, Math.max(0, nDays - 4)).forEach((x, i) => out.splice(Math.min(out.length, 2 + i * 3), 0, x));
  return out.slice(0, nDays);
}

export function rolesFor(state: AppState, b: PlanBlock, focus?: Focus): string[] {
  const f = focus ?? FOCUS_BY_ID[b.focusId];
  if (!f) return [];
  const n = trainingDays(state, b).length;
  const custom = state.roleOrder[b.id];
  if (custom && custom.length === n && custom.every((r) => f.roles[r])) return custom;
  return defaultRoles(f, n);
}

export function dayRoleMap(state: AppState, b: PlanBlock, focus?: Focus): { day: Weekday; role: string; profileId: string }[] {
  const days = trainingDays(state, b);
  const sch = scheduleFor(state, b);
  const roles = rolesFor(state, b, focus);
  return days.map((day, i) => ({ day, role: roles[i], profileId: sch[day] as string })).filter((x) => !!x.role);
}

/* ---------- Orden-Vorschlag für einen Block ---------- */
const LOAD_RANK: Record<Load, number> = { low: 0, medium: 1, high: 2 };
export function fitScore(f: Focus, load: Load, travel: boolean): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (LOAD_RANK[f.load_fit] >= LOAD_RANK[load]) { score += 2; reasons.push("passt zur Alltagslast"); }
  else { score -= 3; reasons.push("braucht mehr Kapazität, als die Phase hergibt"); }
  if (travel) {
    if (f.travel) { score += 1; reasons.push("hat eine Reisevariante"); }
    else { score -= 5; reasons.push("keine Reisevariante"); }
  }
  return { score, reasons };
}

/* ---------- Bestien ---------- */
export const CLASS_ORDER: BeastClass[] = ["plage", "bestie", "ungeheuer", "uralte", "verfluchte"];
export const CLASS_LABEL: Record<BeastClass, string> = { plage: "Plage", bestie: "Bestie", ungeheuer: "Ungeheuer", uralte: "Uralte", verfluchte: "Verfluchte" };

export function beastMinutes(b: Beast, times: { seconds: number }[] | undefined): { min: number; measured: boolean } {
  const t = (times ?? []).slice(-5).map((x) => x.seconds).sort((a, c) => a - c);
  if (!t.length) return { min: b.minutes, measured: false };
  const mid = Math.floor(t.length / 2);
  const med = t.length % 2 ? t[mid] : (t[mid - 1] + t[mid]) / 2;
  return { min: med / 60, measured: true };
}
export function beastClass(min: number): BeastClass {
  if (min <= 10.5) return "plage";
  if (min <= 17.5) return "bestie";
  if (min <= 25.5) return "ungeheuer";
  if (min <= 40) return "uralte";
  return "verfluchte";
}
/* ---------- Was eine Bestie wirklich braucht ----------
   Die Tags in beasts.json sind grob (bar_or_rings). Zusätzlich liest die App die Übungen aus dem Text:
   Ring Push-ups brauchen Ringe, Face Pulls ein Band oder Kabel, Kreuzheben eine Langhantel, „21c Row“ ein Rudergerät. */
export type BeastNeed = "rings" | "bar" | "band" | "band_or_cable" | "barbell" | "kb_db" | "rower" | "bike";
const NEED_RULES: [RegExp, BeastNeed | null][] = [
  [/^plank/i, null],
  [/ring push|rto ring|ring dip|ring row/i, "rings"],
  [/muscle-?up|pull-?up|chin-?up|c2b|toes-to-bar|\bttb\b|knees-to-elbow|hanging|passive hang|commando|archer row|incline row/i, "bar"],
  [/face pull|ext(ernal)? rotation/i, "band_or_cable"],
  [/^band /i, "band"],
  [/bench press|deadlift|squats \(50%\)|good morning/i, "barbell"],
  [/\bkb\b|kettlebell|swing|db snatch|goblet|halo|biceps curl|bar curl|triceps ext|shrug|thruster|chest fl|reverse fl|plate lunge/i, "kb_db"],
  [/\bbike\b/i, "bike"],
];
/** Zahlen am Anfang einer Teilaufgabe weg: „21/15/9c Row“ → „Row“, „Buy-in: 100 Box Back Extension“ → „Box Back Extension“ */
export function beastPartName(part: string): string {
  const toks = part.trim().replace(/^(buy-(in|out):\s*)/i, "").replace(/^amrap[^:]*:\s*/i, "").split(/\s+/);
  while (toks.length && /^([\d/x×.,\-–]*\d[\d/x×.,\-–]*(\/?max)?[a-z]{0,3}|max|in)$/i.test(toks[0])) toks.shift();
  return toks.join(" ");
}
const needCache = new Map<string, Set<BeastNeed>>();
export function beastNeeds(b: Beast): Set<BeastNeed> {
  const key = `${b.id}|${b.work}`;
  const hit = needCache.get(key);
  if (hit) return hit;
  const out = new Set<BeastNeed>();
  for (const part of b.work.split(" · ")) {
    const name = beastPartName(part);
    if (/^row$/i.test(name) || /\d\s*c\s+row/i.test(part)) out.add("rower");
    const rule = NEED_RULES.find(([rx]) => rx.test(name));
    if (rule?.[1]) out.add(rule[1]);
  }
  needCache.set(key, out);
  return out;
}

/** Welches Band für eine Bestien-Übung: Stufe aus bands.json, hexed eine leichter, auf die Bänder im Profil gelegt.
    Am Kabel (ohne Bänder) gibt es keinen Hinweis. */
export function bandFor(part: string, p: EquipmentProfile, hexed = false): string | null {
  const lvl = BANDS.exercises[beastPartName(part)];
  if (!lvl || !p.bands.length) return null;
  const L = BANDS.levels;
  const i = Math.max(0, L.indexOf(lvl) - (hexed ? 1 : 0));
  const exact = p.bands.find((x) => x.toLowerCase() === L[i]);
  if (exact) return exact;
  // Eigene Namen: das leichteste Band gilt als „leicht“, dann aufsteigend; fehlt die Stufe, das stärkste vorhandene
  return p.bands[Math.min(p.bands.length - 1, i)];
}

/** Gewicht für eine Bestien-Übung am Ort: Vorgabe aus dem Text („(2x5kg)“) oder aus beast_loads.json,
    gelegt auf die nächstliegende Hantel bis 10 % daneben. null = keine Gewichtsübung, "missing" = am Ort nicht machbar. */
export function beastLoad(part: string, p: EquipmentProfile): { n: number; kg: number; want: number } | null | "missing" {
  const explicit = part.match(/\((?:(\d)\s*x\s*)?([\d.,]+)\s*kg\)/i);
  const name = beastPartName(part).replace(/\s*\(.*\)\s*$/, "").replace(/\s+\d+%$/, "");
  const def = BEAST_LOADS.exercises[name];
  if (!explicit && !def) return null;
  // Langhantel-Prozente (Bankdrücken 75 %) gehören zur Langhantel, nicht zu den Kurzhanteln
  if (/bench press|deadlift|squats/i.test(name)) return null;
  // „(17.5 kg)“ bei einer Zweihand-Übung ist die Gesamtlast (Langhantel), also je Hand die Hälfte
  const total = explicit ? parseFloat(explicit[2].replace(",", ".")) : def.kg;
  const n = explicit ? (explicit[1] ? parseInt(explicit[1]) : def?.n ?? 1) : def.n;
  const want = explicit && !explicit[1] && n > 1 ? total / n : total;
  const pool = [...p.dumbbells, ...(n === 1 ? p.kettlebells : [])];
  if (!pool.length) return "missing";
  const best = pool.reduce((a, c) => (Math.abs(c - want) < Math.abs(a - want) ? c : a), pool[0]);
  return Math.abs(best - want) <= want * BEAST_LOADS.tolerance + 1e-9 ? { n, kg: best, want } : "missing";
}

/** Bestien-Familien: Morgenland (intern "sued") = Bewegung gegen externen Widerstand (Hanteln, Kettlebell, Langhantel, Band),
    Namen aus Mesopotamien, Persien, Arabien. Nord = nur Körpergewicht (Stange, Ringe, Rudergerät sind Ausrüstung,
    aber keine Last), Namen aus nordeuropäischen Volkssagen. Keine griechischen oder römischen Namen. */
export type BeastRegion = "nord" | "sued";
export function beastRegion(b: Beast): BeastRegion {
  const n = beastNeeds(b);
  const loaded = n.has("kb_db") || n.has("barbell") || n.has("band") || n.has("band_or_cable")
    || b.work.split(" · ").some((part) => /\([\d.,x\s]+kg\)/i.test(part) || !!BEAST_LOADS.exercises[beastPartName(part).replace(/\s*\(.*\)\s*$/, "")]);
  return loaded ? "sued" : "nord";
}
export const REGION_LABEL: Record<BeastRegion, string> = { nord: "Nordbestie", sued: "Morgenlandbestie" };

export function beastFits(b: Beast, p: EquipmentProfile): boolean {
  const tagsOk = b.equipment.every((t) => {
    switch (t) {
      case "bodyweight_only": case "wall_or_open": return true;
      case "bar_or_rings": return p.has.bar || p.has.rings;
      case "band": return p.bands.length > 0;
      case "kb_db": return p.dumbbells.length > 0 || p.kettlebells.length > 0;
      case "rower": return p.has.rower;
      case "bike": return p.has.bike;
      case "box": return p.has.box || true; // eine Bank oder Stufe tut es
      case "sandbag": return p.has.sandbag;
      default: return true;
    }
  });
  if (!tagsOk) return false;
  if (b.work.split(" · ").some((part) => beastLoad(part, p) === "missing")) return false;
  for (const n of beastNeeds(b)) {
    const ok = n === "rings" ? p.has.rings
      : n === "bar" ? p.has.bar || p.has.rings
      : n === "band" ? p.bands.length > 0
      : n === "band_or_cable" ? p.bands.length > 0 || p.has.cable
      : n === "barbell" ? !!p.barbell
      : n === "kb_db" ? p.dumbbells.length > 0 || p.kettlebells.length > 0
      : n === "rower" ? p.has.rower
      : n === "bike" ? p.has.bike : true;
    if (!ok) return false;
  }
  return true;
}

/* ---------- Zusammengesetzte Serien ---------- */
/** Minuten-Spanne je Klasse (wie beastClass) */
const CLASS_RANGE: Record<BeastClass, [number, number]> = { plage: [0, 10.5], bestie: [10.5, 17.5], ungeheuer: [17.5, 25.5], uralte: [25.5, 40], verfluchte: [40, 60] };
export const COMBO_REST = 120;

/** Doppel oder Triple: k-mal am Stück, ohne Pause. Eigene Id "a×k", eigene Bestzeit. */
export function repeatBeast(b: Beast, k: number): Beast {
  if (k <= 1) return b;
  return { ...b, id: `${b.id}×${k}`, name: `${b.name} ×${k}`, rounds: b.rounds * k, minutes: b.minutes * k, repeat: k };
}

/** Serie aus Teilen bauen: [[Bestie, Anzahl], …]. Ein Teil mit Anzahl > 1 ist ein Doppel/Triple. Id "a+b". */
export function composeBeast(parts: [Beast, number][]): Beast {
  const units = parts.map(([b, k]) => repeatBeast(b, k));
  if (units.length === 1) return units[0];
  return {
    id: units.map((b) => b.id).join("+"), name: units.map((b) => b.name).join(" + "), orig: units.map((b) => b.orig).join(" + "),
    rounds: units.reduce((n, b) => n + b.rounds, 0),
    minutes: units.reduce((m, b) => m + b.minutes, 0) + ((units.length - 1) * COMBO_REST) / 60,
    equipment: [...new Set(units.flatMap((b) => b.equipment))],
    work: units.map((b) => b.work).join(" · "),
    parts: units.map((b) => ({ id: b.id, name: b.name, rounds: b.rounds, work: b.work, times: b.repeat ?? 1 })),
  };
}

/** Bestie oder Serie nach Id, auch "a×2" und "a+b" */
export function beastById(id: string): Beast | null {
  if (BEAST_BY_ID[id]) return BEAST_BY_ID[id];
  const unit = (u: string): Beast | undefined => {
    const [base, hex] = u.split("~hex:");
    const b = BEAST_BY_ID[base];
    return b && hex ? hexWith(b, hex.split(",")) ?? undefined : b;
  };
  const parts = id.split("+").map((p) => { const m = p.match(/^(.*)×(\d)$/); return m ? [unit(m[1]), parseInt(m[2])] : [unit(p), 1]; }) as [Beast | undefined, number][];
  if (!parts.length || parts.some(([b]) => !b)) return null;
  return composeBeast(parts as [Beast, number][]);
}

/** Wenn keine Bestie in die Klassen passt: kurze Bestien doppelt oder dreifach, oder zwei hintereinander. */
function comboFor(classes: BeastClass[], pool: Beast[], seed: string, week: number): Beast | null {
  if (!classes.length || !pool.length) return null;
  const lo = Math.min(...classes.map((c) => CLASS_RANGE[c][0])), hi = Math.max(...classes.map((c) => CLASS_RANGE[c][1]));
  const fits = (m: number) => m > lo && m <= hi;
  const cands: Beast[] = [];
  const sorted = [...pool].sort((a, c) => hash(seed + a.id) - hash(seed + c.id)).slice(0, 24);
  for (const b of sorted) for (const k of [2, 3]) { const x = composeBeast([[b, k]]); if (fits(x.minutes)) { cands.push(x); break; } }
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const x = composeBeast([[sorted[i], 1], [sorted[j], 1]]);
    if (fits(x.minutes)) cands.push(x);
  }
  if (!cands.length) return null;
  // Doppel/Triple und Paare im Wechsel, damit beide Formen vorkommen
  const reps = cands.filter((x) => x.repeat), pairs = cands.filter((x) => x.parts);
  const kind = reps.length && pairs.length ? (hash(`${seed}:${week}:form`) % 2 ? reps : pairs) : reps.length ? reps : pairs;
  const order = kind.sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  const pick = order[Math.floor((week - 1) / 2) % order.length];
  // Bei Paaren wechselt die Reihenfolge, damit jede Bestie auch mal frisch als erste kommt
  if (pick.parts?.length === 2 && hash(`${seed}:${week}`) % 2 === 1) return composeBeast([...pick.parts].reverse().map((pt) => [beastById(pt.id)!, 1] as [Beast, number]));
  return pick;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

type BeastOpts = { blockId: string; week: number; profile: EquipmentProfile; state: AppState; reduced: boolean; downgrade: boolean };

/** Grund-Bestien einer Id: "a~hex:x" → a, "a×2+b" → a, b */
export const beastFamily = (id: string): string[] => id.split("+").map((u) => u.replace(/×\d+$/, "").split("~")[0]);

/** Bestien der Vorwoche: was dort geloggt wurde (nach Datum, auch aus der vorigen Phase) und was dieser Block dort geplant hatte */
function lastWeekBeasts(block: Extract<Block, { type: "beast" }>, opts: BeastOpts): Set<string> {
  const out = new Set<string>();
  const add = (id: string) => beastFamily(id).forEach((x) => out.add(x));
  const pb = opts.state.plan.find((p) => p.id === opts.blockId);
  if (pb) {
    const ws = addDays(mondayOf(pb.start), (opts.week - 1) * 7), prev = addDays(ws, -7);
    for (const s of opts.state.sessions) {
      const inPrev = (s.date >= prev && s.date < ws) || (s.blockId === opts.blockId && s.week === opts.week - 1);
      if (!inPrev) continue;
      if (s.beast) add(s.beast.id);
      s.beastParts?.forEach((pt) => add(pt.id));
    }
  }
  if (opts.week > 1) {
    // Geplante Bestien der Vorwoche an allen Trainingstagen, normal oder entlastet, solange nichts geloggt ist
    const targets = pb ? weekBeastBlocks(opts.state, pb, opts.week - 1) : [];
    if (!targets.some(([b]) => b.id === block.id)) targets.push([block, opts.profile]);
    for (const [b, prof] of targets) for (const reduced of [false, true]) {
      const p = pickBeast(b, { ...opts, week: opts.week - 1, profile: prof, reduced });
      if (p) add(p.id);
    }
  }
  return out;
}

/** Orden einer Woche (Harlequin, Drei-Tage-Form, Slot). weekplan.ts trägt focusFor ein; so entsteht kein Import-Kreis. */
let weekFocus: (state: AppState, b: PlanBlock, week: number) => Focus | null = (_s, b) => FOCUS_BY_ID[b.focusId] ?? null;
export const setWeekFocus = (fn: typeof weekFocus) => { weekFocus = fn; };

export type BeastTarget = [Extract<Block, { type: "beast" }>, EquipmentProfile];
/** Alle Bestien-Blöcke einer Woche mit dem Ort ihres Tages. Die Einheiten-Ansicht trägt die volle Fassung ein (mit „kein Laufen“). */
let weekBeastBlocks: (state: AppState, pb: PlanBlock, week: number) => BeastTarget[] = (state, pb, week) => {
  const f = weekFocus(state, pb, week);
  if (!f) return [];
  return dayRoleMap(state, pb, f).flatMap((d) => {
    const pid = state.profileFor?.[`${pb.id}:${week}:${d.role}`] ?? d.profileId;
    const prof = state.equipment.find((e) => e.id === pid);
    return prof ? (f.roles[d.role]?.blocks ?? []).filter((b): b is Extract<Block, { type: "beast" }> => b.type === "beast").map((b) => [b, prof] as BeastTarget) : [];
  });
};
export const setWeekBeastBlocks = (fn: typeof weekBeastBlocks) => { weekBeastBlocks = fn; };

const beastMemo = new WeakMap<AppState, Map<string, Beast | null>>();

/** Bestie für einen Block. Nie dieselbe Bestie (auch nicht verhext oder als Teil einer Serie) in zwei aufeinanderfolgenden Wochen. */
export function pickBeast(block: Extract<Block, { type: "beast" }>, opts: BeastOpts): Beast | null {
  let m = beastMemo.get(opts.state);
  if (!m) beastMemo.set(opts.state, (m = new Map()));
  const key = JSON.stringify([opts.blockId, block, opts.week, opts.profile, opts.reduced, opts.downgrade]);
  if (m.has(key)) return m.get(key)!;
  const r = pickWith(block, opts, lastWeekBeasts(block, opts));
  m.set(key, r);
  return r;
}

/** Mix: ungerade Wochen eine Bestie aus dem Pool (in den Klassen des Blocks), gerade Wochen zwei oder drei kurze hintereinander. */
function mixPick(block: Extract<Block, { type: "beast" }>, opts: BeastOpts, ok: (b: Beast) => boolean, classOf: (b: Beast) => BeastClass, fresh: (b: Beast) => boolean): Beast | null {
  const seed = `${opts.blockId}:${block.id}`;
  const max = block.mix!.maxMin;
  const min = (b: Beast) => beastMinutes(b, opts.state.beastTimes[b.id]).min;
  const pool = block.pool!.map((id) => BEAST_BY_ID[id]).filter((b): b is Beast => !!b && ok(b)).sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  const singles = pool.filter((b) => !block.classes?.length || block.classes.includes(classOf(b)));
  const total = (xs: Beast[]) => xs.reduce((t, b) => t + min(b), 0) + ((xs.length - 1) * COMBO_REST) / 60;
  const combos: Beast[] = [];
  // Doppel und Triple: dieselbe Bestie am Stück
  for (const b of pool) for (const k of [2, 3]) if (min(b) * k <= max) combos.push(composeBeast([[b, k]]));
  // Paare und Dreier aus verschiedenen Bestien
  const shortest = Math.min(...pool.map(min));
  const short = pool.filter((b) => min(b) + shortest + COMBO_REST / 60 <= max);
  for (let i = 0; i < short.length; i++) for (let j = i + 1; j < short.length; j++) {
    if (total([short[i], short[j]]) <= max) combos.push(composeBeast([[short[i], 1], [short[j], 1]]));
    for (let k = j + 1; k < short.length; k++) if (total([short[i], short[j], short[k]]) <= max) combos.push(composeBeast([[short[i], 1], [short[j], 1], [short[k], 1]]));
  }
  combos.sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  // Schon in diesem Orden dran (geplant oder geloggt): erst wieder, wenn der Pool durch ist
  const used = new Set<string>();
  for (let k = 1; k < opts.week; k++) {
    const x = pickBeast(block, { ...opts, week: k, reduced: false });
    if (x) beastFamily(x.id).forEach((f) => used.add(f));
  }
  for (const se of opts.state.sessions) if (se.blockId === opts.blockId && se.week < opts.week) {
    if (se.beast) beastFamily(se.beast.id).forEach((f) => used.add(f));
    se.beastParts?.forEach((pt) => beastFamily(pt.id).forEach((f) => used.add(f)));
  }
  const unused = (b: Beast) => !beastFamily(b.id).some((f) => used.has(f));
  const from = (list: Beast[], t: number, test: (b: Beast) => boolean) => {
    for (let k = 0; k < list.length; k++) { const b = list[(t + k) % list.length]; if (fresh(b) && test(b)) return b; }
    return null;
  };
  const t = Math.floor((opts.week - 1) / 2);
  const [a, b] = opts.week % 2 === 0 ? [combos, singles] : [singles, combos];
  return from(a, t, unused) ?? from(b, t, unused) ?? from(a, t, () => true) ?? from(b, t, () => true);
}

function pickWith(block: Extract<Block, { type: "beast" }>, opts: BeastOpts, avoid: Set<string>): Beast | null {
  const { profile, state } = opts;
  const fresh = (b: Beast) => !beastFamily(b.id).some((x) => avoid.has(x));
  let classes = block.classes ?? [];
  if (opts.downgrade && classes.length) classes = classes.map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]);
  if (opts.reduced) classes = ["plage"];
  const classOf = (b: Beast) => beastClass(beastMinutes(b, state.beastTimes[b.id]).min);
  let cands: Beast[];
  if (block.pool && !opts.reduced) cands = block.pool.map((id) => BEAST_BY_ID[id]).filter(Boolean);
  else cands = BEASTS.filter((b) => classes.includes(classOf(b)));
  const skills = state.user.skills ? new Set(state.user.skills) : null;
  const ok = (b: Beast) => beastFits(b, profile) && beastOk(b, skills);
  let turn = opts.week - 1;
  // Feste Start-Bestie in Woche 1, notfalls hexed
  if (block.first && opts.week === 1 && !opts.reduced) {
    const b0 = BEAST_BY_ID[block.first];
    if (b0 && beastFits(b0, profile) && fresh(b0)) {
      if (beastOk(b0, skills)) return b0;
      const hx = hexFor(b0, skills);
      if (hx) return hx;
    }
  }
  // Wechsel aus Einzelbestie und Serie kurzer Bestien aus dem Pool
  if (block.mix && block.pool && !opts.reduced) {
    const m = mixPick(block, opts, ok, classOf, fresh);
    if (m) return m;
  }
  // Skills legen nur die Auswahl fest: Bestien mit fehlendem Skill kommen nicht dran
  let fit = cands.filter(ok);
  if (!fit.length) fit = BEASTS.filter((b) => ok(b) && (!classes.length || classes.includes(classOf(b))));
  if (!fit.length) {
    // Keine passende Bestie: aus kürzeren eine Serie bauen
    const target = classes.length ? classes : [...new Set(cands.map(classOf))];
    const pool = BEASTS.filter(ok);
    let first: Beast | null = null;
    for (let k = 0; k < 6; k++) {
      const combo = comboFor(target, pool, `${opts.blockId}:${block.id}`, opts.week + k * 2);
      first ??= combo;
      if (combo && fresh(combo)) return combo;
    }
    if (first) return first;
  }
  if (!fit.length) fit = BEASTS.filter((b) => b.equipment.every((t) => t === "bodyweight_only") && beastOk(b, skills));
  if (!fit.length) return null;
  const seed = `${opts.blockId}:${block.id}`;
  const order = [...fit].sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  // Start-Bestie steht in der Rotation vorn, kommt also erst nach einem vollen Durchlauf wieder
  const isFirst = (b: Beast) => !!block.first && (b.id === block.first || b.id.startsWith(`${block.first}~`));
  if (block.first) {
    const i = order.findIndex(isFirst);
    if (i > 0) order.unshift(order.splice(i, 1)[0]);
    else if (i < 0 && order.length > 1) turn += 1; // Woche 1 kam außerhalb der Rotation: dort weiterzählen
  }
  if (block.benchmark_every && opts.week > 1 && (opts.week - 1) % block.benchmark_every === 0) return order[0];
  // Woche vor dem Zwischenwert: dessen Bestie hier nicht nehmen
  if (block.benchmark_every && opts.week % block.benchmark_every === 0 && order.length > 1) beastFamily(order[0].id).forEach((x) => avoid.add(x));
  if (block.draw === "random") {
    const recent = state.sessions.filter((s) => s.beast).slice(-3).map((s) => s.beast!.id);
    const pool = order.filter((b) => !recent.includes(b.id) && fresh(b));
    const list = pool.length ? pool : order.filter(fresh).length ? order.filter(fresh) : order;
    return list[hash(`${seed}:${opts.week}`) % list.length];
  }
  // Rotation, aber nie eine Bestie der Vorwoche: dann die nächste in der Reihe
  for (let k = 0; k < order.length; k++) {
    const pick = order[(turn + k) % order.length];
    if (fresh(pick) && !(opts.week === 2 && isFirst(pick) && order.length > 1)) return pick;
  }
  // Nur Bestien der Vorwoche passen: erst eine andere Bestie derselben Länge, dann eine Serie aus kürzeren,
  // erst ganz zuletzt dieselbe Bestie noch einmal
  const target = classes.length ? classes : [...new Set(fit.map(classOf))];
  const alt = BEASTS.filter((b) => ok(b) && fresh(b) && target.includes(classOf(b))).sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  if (alt.length) return alt[turn % alt.length];
  const pool = BEASTS.filter(ok);
  for (let k = 0; k < 6; k++) {
    const combo = comboFor(target, pool.filter(fresh), `${opts.blockId}:${block.id}`, opts.week + k * 2);
    if (combo && fresh(combo)) return combo;
  }
  return order[turn % order.length];
}

/* ---------- Warm-up, Cool-down, Module ---------- */
export interface DrillView extends Drill {
  groups: { label: string; value: number; sets: number }[];
}

export function expandDrills(listNames: string[] | undefined, _user: UserProfile, week: number): DrillView[] {
  const seen = new Set<string>();
  const out: DrillView[] = [];
  for (const ln of listNames ?? []) {
    for (const d of DRILL_LISTS[ln] ?? []) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(drillView(d, week));
    }
  }
  return out;
}

export function moduleDrills(variant: string, _user: UserProfile, week: number, module: "sword" | "flow" | "sharpen" = "sword"): DrillView[] {
  const list = module === "flow" ? FLOWS[variant]?.drills ?? [] : module === "sharpen" ? SHARPEN[variant]?.drills ?? [] : DM_VARIANTS[variant] ?? [];
  return list.filter((d) => !d.rotation || d.rotation === (isAWeek(week) ? "A" : "B")).map((d) => drillView(d, week));
}

function drillView(d: Drill, week: number): DrillView {
  let value = d.value;
  if (d.weekly_step) value = Math.min(d.max ?? 9999, value + d.weekly_step * (week - 1));
  const sets = d.sets ?? 1;
  if (d.sides === true) return { ...d, value, groups: [{ label: "Links", value, sets }, { label: "Rechts", value, sets }] };
  if (Array.isArray(d.sides)) return { ...d, value, groups: d.sides.map((label) => ({ label, value, sets })) };
  return { ...d, value, groups: [{ label: "", value, sets }] };
}

/* ---------- Affektregel (King) ---------- */
export function affectDowngrade(state: AppState): boolean {
  const last = state.feeling.slice(-2);
  return last.length === 2 && last.every((x) => x.value <= -1);
}

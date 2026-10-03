/* Jahresplan, Blockwochen, Rollen auf Trainingstage, Orden-Vorschläge, Bestien-Auswahl, Warm-up-Dosis. */
import { BANDS, BEAST_LOADS, BEASTS, BEAST_BY_ID, DM_VARIANTS, DRILL_LISTS, FLOWS, FOCUS_BY_ID , SHARPEN } from "../data";
import type { AppState, Beast, BeastClass, Block, Drill, EquipmentProfile, Focus, Goal, Load, PlanBlock, UserProfile, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { beastOk, beastSkills, hexFor, hexWith } from "./skills";

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
/** Morgenland-Bestien (mit Last) sind vorerst ausgeblendet: sie brauchen eine eigene Logik für die Last. */
export const HIDDEN_REGIONS: BeastRegion[] = ["sued"];
const activeMemo = new Map<string, boolean>();
export const beastActive = (b: Beast): boolean => {
  if (!activeMemo.has(b.id)) activeMemo.set(b.id, !HIDDEN_REGIONS.includes(beastRegion(b)));
  return activeMemo.get(b.id)!;
};
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
  const unit = (u0: string): Beast | undefined => {
    // Kurzform „…~r3“: weniger Runden
    const rm = u0.match(/^(.*)~r(\d+)$/);
    const u = rm ? rm[1] : u0;
    const [base, hex] = u.split("~hex");
    const b = BEAST_BY_ID[base];
    // „a~hex“ (alle fehlenden Skills getauscht) oder alt „a~hex:skill,skill“
    const full = b && hex !== undefined ? hexWith(b, hex.startsWith(":") ? hex.slice(1).split(",") : beastSkills(b)) ?? undefined : b;
    return full && rm ? shortBeast(full, parseInt(rm[2])) ?? undefined : full;
  };
  const parts = id.split("+").map((p) => { const m = p.match(/^(.*)×(\d)$/); return m ? [unit(m[1]), parseInt(m[2])] : [unit(p), 1]; }) as [Beast | undefined, number][];
  if (!parts.length || parts.some(([b]) => !b)) return null;
  return composeBeast(parts as [Beast, number][]);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

type BeastOpts = { blockId: string; week: number; profile: EquipmentProfile; state: AppState; reduced: boolean; downgrade: boolean };

/** Kurzform: gleiche Bestie mit weniger Runden. Nur bei gleichen Runden (keine Leitern wie 21/15/9, kein AMRAP, kein Buy-in). */
export function canShorten(b: Beast): boolean {
  return b.rounds >= 3 && !b.parts && !b.repeat && !/\d\/\d|amrap|buy-(in|out)/i.test(b.work);
}
export function shortBeast(b: Beast, k: number): Beast | null {
  if (!canShorten(b) || k < 2 || k >= b.rounds) return null;
  return { ...b, id: `${b.id}~r${k}`, name: `${b.name} (${k} Runden)`, rounds: k, minutes: (b.minutes * k) / b.rounds };
}

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


/* ---------- Bestienwahl: ein Pool für alle Orden ----------
   Kandidaten: jede Bestie einzeln, jede als Doppel (×2), jedes Paar als Serie (2 Min Pause dazwischen).
   Alle Formen sind gleichrangig. Passen muss die Dauer zum Zeitfenster des Blocks (Klassen).
   Vorrang hat Varianz im Orden: Was in dieser Phase schon dran war, kommt erst wieder, wenn alles andere durch ist.
   Innerhalb davon gewichtet das Ziel des Ordens (Kraft, Kondition, Ausdauer, Beweglichkeit). */
type BeastKind = "single" | "double" | "pair";
const CARDIO_RX = /^(row|run|bike|sprints?|single unders|jumping jacks|mountain climbers|burpee|speed skaters|froggers|sprawls|tuck jumps|high jumps|jumps|lateral jumps|broad jumps|bear crawl|lizard crawl|lunge walk|obstacle run|box jumps|squat jumps|standup jumps)/i;
const CORE_RX = /sit-?ups|crunch|v-ups|tuck-ups|leg raises|toes-to-bar|knees-to-elbow|plank|hollow|l-sit|dragon|wipers|supermen|hang|leg lever/i;
const mixMemo = new Map<string, ReturnType<typeof beastMix>>();
const mixOf = (b: Beast) => { if (!mixMemo.has(b.id)) mixMemo.set(b.id, beastMix(b)); return mixMemo.get(b.id)!; };
/** Anteile Kondition / Rumpf / Kraft einer Bestie aus ihren Übungen */
function beastMix(b: Beast): { cardio: number; core: number; strength: number } {
  const parts = b.work.split(" · ").map(beastPartName).filter((p) => p && !/^rest\b/i.test(p));
  const n = parts.length || 1;
  const cardio = parts.filter((p) => CARDIO_RX.test(p)).length / n;
  const core = parts.filter((p) => !CARDIO_RX.test(p) && CORE_RX.test(p)).length / n;
  return { cardio, core, strength: Math.max(0, 1 - cardio - core) };
}
const GOAL_W: Partial<Record<Goal, { cardio: number; core: number; strength: number }>> = {
  strength: { strength: 1, core: 0.6, cardio: 0.3 }, hypertrophy: { strength: 1, core: 0.6, cardio: 0.3 },
  power: { strength: 0.9, core: 0.5, cardio: 0.5 }, speed: { strength: 0.6, core: 0.5, cardio: 0.9 },
  conditioning: { cardio: 1, strength: 0.7, core: 0.5 }, fatloss: { cardio: 1, strength: 0.7, core: 0.5 },
  endurance: { cardio: 1, strength: 0.3, core: 0.4 },
  mobility: { core: 0.9, strength: 0.6, cardio: 0.5 }, wellbeing: { core: 0.8, strength: 0.6, cardio: 0.7 }, skill: { core: 0.9, strength: 0.7, cardio: 0.5 },
};

function pickWith(block: Extract<Block, { type: "beast" }>, opts: BeastOpts, avoid: Set<string>): Beast | null {
  const { profile, state } = opts;
  const pb = state.plan.find((p) => p.id === opts.blockId);
  const seed = `${opts.blockId}:${block.id}`;
  const fresh = (b: Beast) => !beastFamily(b.id).some((x) => avoid.has(x));
  let classes = block.classes?.length ? block.classes : (["bestie", "ungeheuer"] as BeastClass[]);
  if (opts.downgrade) classes = classes.map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]);
  if (opts.reduced) classes = ["plage"];
  const lo = Math.min(...classes.map((c) => CLASS_RANGE[c][0])), hi = Math.max(...classes.map((c) => CLASS_RANGE[c][1]));
  const inSlot = (m: number) => m > lo && m <= hi;
  const skills = state.user.skills ? new Set(state.user.skills) : null;
  // Fehlt ein Skill, kommt die Bestie verhext: die betroffenen Übungen durch ihren Ersatz getauscht
  const serve = (b: Beast): Beast | null => (beastOk(b, skills) ? b : hexFor(b, skills));
  const ok = (b: Beast) => beastActive(b) && beastFits(b, profile) && serve(b) != null;
  const min = (b: Beast) => beastMinutes(b, state.beastTimes[b.id]).min;

  // Feste Start-Bestie in Woche 1, notfalls verhext
  if (block.first && opts.week === 1 && !opts.reduced) {
    const b0 = BEAST_BY_ID[block.first];
    if (b0 && ok(b0) && fresh(b0)) return serve(b0);
  }
  // Zwischenwert (Conqueror): dieselbe Bestie wie in Woche 1
  if (block.benchmark_every && opts.week > 1 && (opts.week - 1) % block.benchmark_every === 0 && !opts.reduced) {
    const w1 = pickBeast(block, { ...opts, week: 1, reduced: false });
    if (w1) return w1;
  }

  // Woche vor dem Zwischenwert: dessen Bestie hier nicht nehmen
  if (block.benchmark_every && opts.week % block.benchmark_every === 0 && opts.week > 1) {
    const w1 = pickBeast(block, { ...opts, week: 1, reduced: false });
    if (w1) beastFamily(w1.id).forEach((x) => avoid.add(x));
  }
  // Kandidaten (Serien erst zusammensetzen, wenn sie gewählt sind)
  type Cand = { kind: BeastKind; units: Beast[]; fam: string[] };
  const singles = BEASTS.filter(ok).map((b) => serve(b)!);
  const mins = new Map(singles.map((b) => [b.id, min(b)]));
  const fam1 = new Map(singles.map((b) => [b.id, beastFamily(b.id)[0]]));
  const cands: Cand[] = [];
  for (const b of singles) {
    const m = mins.get(b.id)!, f = [fam1.get(b.id)!];
    if (inSlot(m)) cands.push({ kind: "single", units: [b], fam: f });
    if (inSlot(m * 2)) cands.push({ kind: "double", units: [b], fam: f });
    // Zu lang fürs Fenster: Kurzform mit so vielen Runden, wie hineinpassen (zählt als Einzelbestie)
    if (m > hi && canShorten(b)) {
      const per = m / b.rounds;
      const k = Math.min(b.rounds - 1, Math.floor(hi / per));
      const sb = shortBeast(b, k);
      if (sb && inSlot(per * k)) { mins.set(sb.id, per * k); cands.push({ kind: "single", units: [sb], fam: f }); }
    }
  }
  const shortest = Math.min(...mins.values());
  const short = singles.filter((b) => mins.get(b.id)! + shortest + COMBO_REST / 60 <= hi);
  for (let i = 0; i < short.length; i++) for (let j = i + 1; j < short.length; j++) {
    if (!inSlot(mins.get(short[i].id)! + mins.get(short[j].id)! + COMBO_REST / 60)) continue;
    // Reihenfolge fest per Hash, damit jede Bestie mal zuerst kommt
    const pair = hash(seed + short[i].id + short[j].id) % 2 ? [short[i], short[j]] : [short[j], short[i]];
    cands.push({ kind: "pair", units: pair, fam: pair.map((x) => fam1.get(x.id)!) });
  }
  const build = (c: Cand): Beast => (c.kind === "single" ? c.units[0] : c.kind === "double" ? composeBeast([[c.units[0], 2]]) : composeBeast(c.units.map((x) => [x, 1] as [Beast, number])));
  const freshC = (c: Cand) => !c.fam.some((x) => avoid.has(x));
  if (!cands.length) {
    // Nichts passt ins Fenster: die Einzelbestie mit der nächstliegenden Dauer
    const mid = (lo + Math.min(hi, 60)) / 2;
    return singles.filter(fresh).sort((a, c) => Math.abs(min(a) - mid) - Math.abs(min(c) - mid))[0] ?? singles[0] ?? null;
  }

  // Varianz im Orden: wann war welche Bestie zuletzt dran (alle Tage dieser Phase, geplant und geloggt)
  const lastUsed = new Map<string, number>();
  const mark = (id: string, w: number) => beastFamily(id).forEach((f) => lastUsed.set(f, Math.max(lastUsed.get(f) ?? 0, w)));
  if (pb) {
    for (let k = 1; k <= opts.week; k++) {
      const targets = weekBeastBlocks(state, pb, k);
      const upto = k < opts.week ? targets.length : targets.findIndex(([b]) => b.id === block.id);
      for (let i = 0; i < Math.max(0, upto); i++) {
        const [b, prof] = targets[i];
        const x = pickBeast(b, { ...opts, week: k, profile: prof, reduced: false });
        if (x) mark(x.id, k);
      }
    }
    for (const se of state.sessions) if (se.blockId === opts.blockId && se.week <= opts.week) {
      if (se.beast) mark(se.beast.id, se.week);
      se.beastParts?.forEach((pt) => mark(pt.id, se.week));
    }
  }
  const age = (c: Cand) => Math.max(0, ...c.fam.map((f) => lastUsed.get(f) ?? 0)); // 0 = noch nie
  let pool = cands.filter(freshC);
  if (!pool.length) pool = cands;
  const oldest = Math.min(...pool.map(age));
  pool = pool.filter((c) => age(c) === oldest);

  // Form gleichrangig: erst Einzel, Doppel oder Serie (je gleich wahrscheinlich), dann die Bestie nach Ziel gewichtet
  const r = (salt: string) => hash(`${seed}:${opts.week}:${salt}`) / 4294967296;
  const kinds = [...new Set(pool.map((c) => c.kind))].sort();
  const kind = kinds[Math.floor(r("kind") * kinds.length)];
  const key = (c: Cand) => c.units.map((x) => x.id).join("+");
  const list = pool.filter((c) => c.kind === kind).sort((a, c) => hash(seed + key(a)) - hash(seed + key(c)));
  const goal = pb ? weekFocus(state, pb, opts.week)?.goals.primary : undefined;
  const gw = (goal && GOAL_W[goal]) || { cardio: 0.7, core: 0.7, strength: 0.7 };
  const weight = (c: Cand) => c.units.reduce((sum, u) => { const m = mixOf(u); return sum + 0.2 + m.cardio * gw.cardio + m.core * gw.core + m.strength * gw.strength; }, 0) / c.units.length;
  const ws = list.map((c) => weight(c) ** 2);
  let u = r("pick") * ws.reduce((x, y) => x + y, 0);
  for (let i = 0; i < list.length; i++) { u -= ws[i]; if (u <= 0) return build(list[i]); }
  return build(list[list.length - 1]);
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

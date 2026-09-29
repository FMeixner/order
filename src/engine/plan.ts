/* Jahresplan, Blockwochen, Rollen auf Trainingstage, Orden-Vorschläge, Bestien-Auswahl, Warm-up-Dosis. */
import { BEASTS, BEAST_BY_ID, DM_VARIANTS, DRILL_LISTS, FOCUS_BY_ID } from "../data";
import type { AppState, Beast, BeastClass, Block, Drill, EquipmentProfile, Focus, Load, PlanBlock, UserProfile, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { beastOk } from "./skills";

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
  return [...base, ...extras].slice(0, nDays);
}

export function rolesFor(state: AppState, b: PlanBlock): string[] {
  const f = FOCUS_BY_ID[b.focusId];
  if (!f) return [];
  const n = trainingDays(state, b).length;
  const custom = state.roleOrder[b.id];
  if (custom && custom.length === n && custom.every((r) => f.roles[r])) return custom;
  return defaultRoles(f, n);
}

export function dayRoleMap(state: AppState, b: PlanBlock): { day: Weekday; role: string; profileId: string }[] {
  const days = trainingDays(state, b);
  const sch = scheduleFor(state, b);
  const roles = rolesFor(state, b);
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
export function beastFits(b: Beast, p: EquipmentProfile): boolean {
  return b.equipment.every((t) => {
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
}

/* ---------- Zusammengesetzte Serien ---------- */
/** Minuten-Spanne je Klasse (wie beastClass) */
const CLASS_RANGE: Record<BeastClass, [number, number]> = { plage: [0, 10.5], bestie: [10.5, 17.5], ungeheuer: [17.5, 25.5], uralte: [25.5, 40], verfluchte: [40, 60] };
export const COMBO_REST = 120;

/** Serie aus Teilen bauen: [[Bestie, Anzahl], …]. Id: "a×2" oder "a+b". */
export function composeBeast(parts: [Beast, number][]): Beast {
  if (parts.length === 1 && parts[0][1] === 1) return parts[0][0];
  const id = parts.map(([b, k]) => (k > 1 ? `${b.id}×${k}` : b.id)).join("+");
  const name = parts.map(([b, k]) => (k > 1 ? `${b.name} ×${k}` : b.name)).join(" + ");
  const minutes = parts.reduce((m, [b, k]) => m + b.minutes * k, 0) + ((parts.reduce((n, [, k]) => n + k, 0) - 1) * COMBO_REST) / 60;
  return {
    id, name, orig: parts.map(([b]) => b.orig).join(" + "), rounds: parts.reduce((n, [b, k]) => n + b.rounds * k, 0), minutes,
    equipment: [...new Set(parts.flatMap(([b]) => b.equipment))],
    work: parts.map(([b]) => b.work).join(" · "),
    parts: parts.map(([b, k]) => ({ id: b.id, name: b.name, rounds: b.rounds, work: b.work, times: k })),
  };
}

/** Bestie oder Serie nach Id, auch "a×2" und "a+b" */
export function beastById(id: string): Beast | null {
  if (BEAST_BY_ID[id]) return BEAST_BY_ID[id];
  const parts = id.split("+").map((p) => { const m = p.match(/^(.*)×(\d)$/); return m ? [BEAST_BY_ID[m[1]], parseInt(m[2])] : [BEAST_BY_ID[p], 1]; }) as [Beast | undefined, number][];
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
  const order = cands.sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  return order[(week - 1) % order.length];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function pickBeast(
  block: Extract<Block, { type: "beast" }>,
  opts: { blockId: string; week: number; profile: EquipmentProfile; state: AppState; reduced: boolean; downgrade: boolean },
): Beast | null {
  const { profile, state } = opts;
  let classes = block.classes ?? [];
  if (opts.downgrade && classes.length) classes = classes.map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]);
  if (opts.reduced) classes = ["plage"];
  const classOf = (b: Beast) => beastClass(beastMinutes(b, state.beastTimes[b.id]).min);
  let cands: Beast[];
  if (block.pool && !opts.reduced) cands = block.pool.map((id) => BEAST_BY_ID[id]).filter(Boolean);
  else cands = BEASTS.filter((b) => classes.includes(classOf(b)));
  const skills = state.user.skills ? new Set(state.user.skills) : null;
  const ok = (b: Beast) => beastFits(b, profile) && beastOk(b, skills);
  let fit = cands.filter(ok);
  if (!fit.length) fit = BEASTS.filter((b) => ok(b) && (!classes.length || classes.includes(classOf(b))));
  if (!fit.length) {
    // Keine passende Bestie: aus kürzeren eine Serie bauen
    const target = classes.length ? classes : [...new Set(cands.map(classOf))];
    const combo = comboFor(target, BEASTS.filter(ok), `${opts.blockId}:${block.id}`, opts.week);
    if (combo) return combo;
  }
  if (!fit.length) fit = BEASTS.filter((b) => b.equipment.every((t) => t === "bodyweight_only") && beastOk(b, skills));
  if (!fit.length) return null;
  const seed = `${opts.blockId}:${block.id}`;
  const order = [...fit].sort((a, c) => hash(seed + a.id) - hash(seed + c.id));
  if (block.benchmark_every && opts.week > 1 && (opts.week - 1) % block.benchmark_every === 0) return order[0];
  if (block.draw === "random") {
    const recent = state.sessions.filter((s) => s.beast).slice(-3).map((s) => s.beast!.id);
    const pool = order.filter((b) => !recent.includes(b.id));
    const list = pool.length ? pool : order;
    return list[hash(`${seed}:${opts.week}`) % list.length];
  }
  return order[(opts.week - 1) % order.length];
}

/* ---------- Warm-up, Cool-down, Module ---------- */
export interface DrillView extends Drill {
  groups: { label: string; value: number; sets: number }[];
}

export function expandDrills(listNames: string[] | undefined, user: UserProfile, week: number): DrillView[] {
  const seen = new Set<string>();
  const out: DrillView[] = [];
  for (const ln of listNames ?? []) {
    for (const d of DRILL_LISTS[ln] ?? []) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(drillView(d, user, week));
    }
  }
  return out;
}

export function moduleDrills(variant: string, user: UserProfile, week: number): DrillView[] {
  return (DM_VARIANTS[variant] ?? []).filter((d) => !d.rotation || d.rotation === (isAWeek(week) ? "A" : "B")).map((d) => drillView(d, user, week));
}

function drillView(d: Drill, user: UserProfile, week: number): DrillView {
  let value = d.value;
  if (d.weekly_step) value = Math.min(d.max ?? 9999, value + d.weekly_step * (week - 1));
  const sets = d.sets ?? 1;
  const r5 = (v: number) => (d.mode === "reps" ? Math.round(v) : Math.round(v / 5) * 5);
  if (d.sides === true) {
    const weak = d.asym ? user.asym[d.asym] : null;
    const L = weak === "L" ? r5(value * 1.6) : value;
    const R = weak === "R" ? r5(value * 1.6) : value;
    const setsL = d.mode === "reps" && weak === "L" && d.asym?.startsWith("shoulder") ? sets + 1 : sets;
    const setsR = d.mode === "reps" && weak === "R" && d.asym?.startsWith("shoulder") ? sets + 1 : sets;
    const extra = d.mode === "reps" && d.asym?.startsWith("shoulder");
    return { ...d, value, groups: [
      { label: "Links", value: extra ? value : L, sets: setsL },
      { label: "Rechts", value: extra ? value : R, sets: setsR },
    ] };
  }
  if (Array.isArray(d.sides)) return { ...d, value, groups: d.sides.map((label) => ({ label, value, sets })) };
  return { ...d, value, groups: [{ label: "", value, sets }] };
}

/* ---------- Affektregel (King) ---------- */
export function affectDowngrade(state: AppState): boolean {
  const last = state.feeling.slice(-2);
  return last.length === 2 && last.every((x) => x.value <= -1);
}

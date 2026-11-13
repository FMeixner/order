/* Laufender Fitnessstand (1.47): Was das Training selbst misst, liest die App nach jeder Einheit aus dem Log, statt es
   zweimal im Jahr zu testen.
   - Kraft: geschätztes Maximum je Übung mit Gewicht (Epley, Sätze bis 12 Wiederholungen plus Reserve), jede Übung
     gegen sich selbst — der Wechsel Maschine ↔ frei verfälscht nichts. Ohne Norm: Anteil vom eigenen Bestwert, Trend.
   - Kraftausdauer: geschätzte Maximalwiederholungen in Liegestütz- bzw. Klimmzug-Äquivalenten. Leiterstufen und
     Körpergewichtsanteile (transfer.json) und die Weste rechnen über Epley um; daran laufen die Sportabzeichen-Normen
     weiter. 60 % davon ist die Päckchengröße der Bestien (dose.ts).
   Reserve aus deiner Bewertung je Übung: zu schwer 0, schwer 1, ok 2, leicht 4, sehr leicht 6 Wiederholungen. Diese
   Einschätzung ist ungenau, besonders weit weg vom Versagen (Halperin et al., 2022) — der Stand ist eine Schätzung.
   Checkpoints (speed, power): ein Versuch frisch in der Schwerpunkt-Karte, frühestens alle vier Wochen. */
import packetsJson from "../../data/modules/packets.json";
import { TESTWEEK, TRANSFER } from "../data";
import type { AppState, Feedback, TestResult } from "../types";
import { ageAt, findNorm, normScore, type NormResult } from "./normcore";

const PACKETS = packetsJson as unknown as { families: Record<string, { test: string; rx: string }> };
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** Körpergewicht: eigener Eintrag, sonst der letzte Testwert (wie bodyweightOf in progression.ts, ohne Zirkelimport) */
const bodyweightOf = (state: Pick<AppState, "user" | "tests">): number | null => state.user.bodyweight || (state.tests["t-bodyweight"] ?? []).slice(-1)[0]?.value || null;

export const RESERVE: Record<Feedback, number> = { zuschwer: 0, schwer: 1, ok: 2, leicht: 4, sehrleicht: 6 };
/** Fenster für den aktuellen Stand und den Vergleich davor */
export const WINDOW = 42;
const epley = (kg: number, reps: number) => kg * (1 + reps / 30);
type Change = "better" | "same" | "worse" | null;

const FAM_RX: Record<"pushup" | "pullup", RegExp> = Object.fromEntries(
  Object.entries(PACKETS.families).map(([k, f]) => [k, new RegExp(f.rx, "i")]),
) as Record<"pushup" | "pullup", RegExp>;
const LADDERS: Record<string, number> = TRANSFER.ladders ?? {};
const BW: Record<string, number> = TRANSFER.bodyweight ?? {};
const REF = { pushup: { share: BW["Push-Up"] ?? 0.65, test: "t-pushups", swc: 2, name: "Liegestütz" }, pullup: { share: BW["Pull-Up"] ?? 0.95, test: "t-pullups", swc: 1, name: "Klimmzug" } } as const;
export type RepFamily = keyof typeof REF;

/** Welche Familie (und mit welchem Körpergewichtsanteil) eine Übung für die Kraftausdauer zählt */
function famOf(name: string): { fam: RepFamily; share: number } | null {
  if (LADDERS[name] != null) return { fam: "pullup", share: LADDERS[name] };
  for (const fam of ["pushup", "pullup"] as RepFamily[]) if (FAM_RX[fam]?.test(name)) return { fam, share: BW[name] ?? REF[fam].share };
  return null;
}
/** Körpergewichtsübung (zählt nicht als Kraft-Übung mit Gewicht: Weste ist dort Zusatz) */
const isBodyweight = (name: string) => !!famOf(name) || BW[name] != null;

interface Point { date: string; v: number }
function points(state: AppState, f: (name: string, set: { reps?: number; weight?: number | null }, reserve: number) => number | null): Map<string, Point[]> {
  const out = new Map<string, Point[]>();
  const add = (name: string, date: string, v: number | null) => {
    if (v == null || !(v > 0)) return;
    const arr = out.get(name) ?? [];
    const same = arr.find((p) => p.date === date);
    if (same) same.v = Math.max(same.v, v); else arr.push({ date, v });
    out.set(name, arr);
  };
  for (const s of state.sessions) {
    if (!s.done) continue;
    for (const e of Object.values(s.entries)) {
      const r = RESERVE[e.feedback ?? "ok"];
      for (const set of e.sets) if (set.done) add(e.name, s.date, f(e.name, set, r));
    }
  }
  for (const pts of out.values()) pts.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

const maxIn = (pts: Point[], from: string, to: string): Point | null =>
  pts.filter((p) => p.date >= from && p.date <= to).reduce<Point | null>((a, p) => (!a || p.v > a.v ? p : a), null);
const change = (now: number, prev: number | null, swc: number): Change => (prev == null ? null : now - prev > swc ? "better" : prev - now > swc ? "worse" : "same");

/* ---------- Kraft ---------- */
export interface LiftStand { name: string; now: number; best: number; prev: number | null; date: string; change: Change; sessions: number }

/** Übungen mit Gewicht, die du in den letzten 6 Wochen gemacht hast: Maximum jetzt, Bestwert, Vergleich 6 Wochen davor */
export function liftStand(state: AppState, today: string, limit = 5): LiftStand[] {
  const pts = points(state, (name, set, r) => (!isBodyweight(name) && set.weight && set.weight > 0 && set.reps && set.reps <= 12 ? epley(set.weight, set.reps + r) : null));
  const from = addDays(today, -WINDOW), pFrom = addDays(today, -2 * WINDOW), pTo = addDays(today, -WINDOW - 1);
  const out: LiftStand[] = [];
  for (const [name, p] of pts) {
    const now = maxIn(p, from, today);
    if (!now) continue;
    const prev = maxIn(p, pFrom, pTo);
    const best = Math.max(...p.map((x) => x.v));
    out.push({ name, now: Math.round(now.v), best: Math.round(best), prev: prev ? Math.round(prev.v) : null, date: now.date, change: change(now.v, prev?.v ?? null, now.v * 0.025), sessions: p.filter((x) => x.date >= from).length });
  }
  return out.sort((a, b) => b.sessions - a.sessions || b.now - a.now).slice(0, limit);
}

/* ---------- Kraftausdauer ---------- */
export interface RepStand { fam: RepFamily; name: string; reps: number; date: string; from: string; prev: number | null; change: Change; norm: NormResult | null }

/** Maximalwiederholungen in Äquivalenten der Referenzübung, aus einem Satz: (Last × (1 + max/30)) / Referenzlast − 1, × 30 */
export function repEquivalent(name: string, reps: number, reserve: number, vestKg: number, bodyweight: number | null): { fam: RepFamily; reps: number } | null {
  const f = famOf(name);
  if (!f) return null;
  const bw = bodyweight ?? 80;
  const load = f.share * bw + (bodyweight ? vestKg : 0);
  const ref = REF[f.fam].share * bw;
  return { fam: f.fam, reps: Math.max(0, Math.round((load * (1 + (reps + reserve) / 30) / ref - 1) * 30)) };
}

export function repStand(state: AppState, today: string): RepStand[] {
  const bw = bodyweightOf(state);
  const byFam: Record<RepFamily, { pts: Point[]; src: Map<string, string> }> = { pushup: { pts: [], src: new Map() }, pullup: { pts: [], src: new Map() } };
  points(state, (name, set, r) => {
    if (!set.reps) return null;
    const x = repEquivalent(name, set.reps, r, set.weight ?? 0, bw);
    return x ? x.reps : null;
  }).forEach((p, name) => {
    const fam = famOf(name)!.fam;
    for (const x of p) { byFam[fam].pts.push(x); const k = `${x.date}|${x.v}`; if (!byFam[fam].src.has(k)) byFam[fam].src.set(k, name); }
  });
  // Ältere Testwerte (bis 1.46) zählen als Messpunkt mit
  for (const fam of ["pushup", "pullup"] as RepFamily[]) for (const t of state.tests[REF[fam].test] ?? []) { byFam[fam].pts.push({ date: t.date, v: t.value }); byFam[fam].src.set(`${t.date}|${t.value}`, "Test"); }
  const from = addDays(today, -WINDOW), pFrom = addDays(today, -2 * WINDOW), pTo = addDays(today, -WINDOW - 1);
  const { sex, birthYear } = state.user;
  const out: RepStand[] = [];
  for (const fam of ["pushup", "pullup"] as RepFamily[]) {
    const now = maxIn(byFam[fam].pts, from, today);
    if (!now) continue;
    const prev = maxIn(byFam[fam].pts, pFrom, pTo);
    const n = state.user.level === "einsteiger" ? null : findNorm(REF[fam].test, undefined, sex, ageAt(birthYear, today));
    out.push({ fam, name: REF[fam].name, reps: now.v, date: now.date, from: byFam[fam].src.get(`${now.date}|${now.v}`) ?? "", prev: prev?.v ?? null, change: change(now.v, prev?.v ?? null, REF[fam].swc), norm: n ? normScore(n, now.v, bw) : null });
  }
  return out;
}

const repMemo = new WeakMap<object, Map<string, RepStand[]>>();
/** Päckchen aus dem Log (1.47): 60 % der geschätzten Maximalwiederholungen der Familie, null ohne Daten */
export function loggedPacket(state: Pick<AppState, "sessions"> & Partial<AppState>, testId: string, today: string): number | null {
  if (!state.sessions || !state.user || !state.tests) return null;
  let m = repMemo.get(state.sessions);
  if (!m) repMemo.set(state.sessions, (m = new Map()));
  const key = `${today}|${state.user.bodyweight ?? ""}`;
  let rs = m.get(key);
  if (!rs) { rs = repStand(state as AppState, today); m.set(key, rs); }
  const r = rs.find((x) => REF[x.fam].test === testId);
  return r && r.reps > 0 ? Math.max(1, Math.round(r.reps * 0.6)) : null;
}

/* ---------- Checkpoints ---------- */
/** Checkpoint-Test je Schwerpunkt: ein Versuch frisch zu Beginn der Schwerpunkt-Karte */
export const CHECKPOINT: Partial<Record<string, string>> = { power: "t-broad", speed: "t-sprint30" };
export const CHECKPOINT_EVERY = 28;
const TEST = Object.fromEntries(TESTWEEK.cups.flatMap((c) => c.tests).map((t) => [t.id, t]));
export const checkpointTest = (domain: string) => (CHECKPOINT[domain] ? TEST[CHECKPOINT[domain]!] : undefined);

/** Ist heute ein Checkpoint fällig? Ab vier Wochen in der Phase, dann alle vier Wochen (Testwoche zählt als letzter Wert). */
export function checkpointDue(state: AppState, blockStart: string, domain: string, today: string): boolean {
  const id = CHECKPOINT[domain];
  if (!id) return false;
  const last = [...(state.checkpoints?.[id] ?? []), ...(state.tests[id] ?? [])].map((r) => r.date).filter((d) => d <= today).sort().pop();
  const ref = last && last > blockStart ? last : blockStart;
  return addDays(ref, CHECKPOINT_EVERY) <= today && !(state.checkpoints?.[id] ?? []).some((r) => r.date === today);
}

export function saveCheckpoint(st: AppState, testId: string, blockId: string, value: number, raw: string, date: string): AppState {
  const keep = (st.checkpoints?.[testId] ?? []).filter((r) => r.date !== date);
  const entry: TestResult = { date, blockId, value, raw };
  return { ...st, checkpoints: { ...(st.checkpoints ?? {}), [testId]: [...keep, entry].sort((a, b) => a.date.localeCompare(b.date)) } };
}

/** Wird der Schwerpunkt frei? Zwei Checkpoints der Phase in Folge besser als der Wert davor (Testwoche oder erster
    Checkpoint), jeweils jenseits des Messfehlers. Dann hat der Bereich genug bekommen und der nächste rückt nach. */
export function checkpointRelease(state: AppState, blockId: string, blockStart: string, domain: string): string | null {
  const id = CHECKPOINT[domain];
  const t = id ? TEST[id] : undefined;
  if (!id || !t) return null;
  const cps = (state.checkpoints?.[id] ?? []).filter((r) => r.blockId === blockId);
  if (cps.length < 2) return null;
  const before = (state.tests[id] ?? []).filter((r) => r.date <= blockStart).sort((a, b) => a.date.localeCompare(b.date)).pop();
  const ref = before ?? cps[0];
  const rest = before ? cps : cps.slice(1);
  if (rest.length < 2) return null;
  const better = (r: TestResult) => (t.better === "higher" ? r.value - ref.value : ref.value - r.value) > (t.swc ?? 0);
  const [a, b] = rest.slice(-2);
  return better(a) && better(b) ? `${t.name}: zweimal in Folge besser als ${String(ref.value).replace(".", ",")} – der Bereich hat genug bekommen.` : null;
}

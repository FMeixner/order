/* Dosis (1.22): Bestien und Sätze in einer Währung.
   - Zählung: Eine Bestie zählt, wie man sie tatsächlich bricht. Päckchen je Runde und Übung = ⌈Wiederholungen /
     Päckchengröße⌉, ein Päckchen = ein halber Satz (Bestienrunden enden oft weit vor 1–3 Wiederholungen in Reserve).
     Verteilt über die Muskelanteile wie jede klassische Übung. Halten, Strecken, Zeiten: ein Päckchen je Runde.
     Laufen, Rudern, Rad, Seil, Pausen zählen nicht als Sätze, sondern als Konditionsminuten.
   - Päckchengröße: data/modules/packets.json je Niveau; Push-up- und Klimmzug-Familie aus dem letzten Testwert
     (60 % des Maximums, ändert sich also nur nach Testwochen); eigene Werte (state.packets) schlagen alles.
   - Zwei Achsen je Orden: Muskel (harte Sätze je Muskel und Woche) und Kondition (Minuten). Modus je Achse:
     progress (Welle vom unteren zum oberen Richtwert), soft (von Erhalt bis zum unteren Richtwert), maintain.
   - Welle: zwischen zwei geplanten Entlastungen (Rhythmus des Zeichens) steigt das Ziel Woche für Woche; danach
     Schwierigkeitsstufe + 1 und zurück auf den Start. Die Welle wendet auch, wenn die Entlastung ausfällt.
   - Trajektorie zu Beginn des Ordens: alle Wochen auf einmal. Nicht erreichbare Ziele senken die ganze Welle des
     Muskels gleichmäßig ab. Ziel nie unter dem, was die festen Übungen ohnehin bringen; Obergrenze = Ziel + 15 %.
   Die Bestienwahl (plan.ts) füllt auf, was die festen Übungen nicht abdecken, und schiebt keinen Muskel über die
   Obergrenze, solange eine andere Bestie ins Zeitfenster passt. */
import packetsJson from "../../data/modules/packets.json";
import { BEASTS } from "../data";
import type { AppState, Beast, Focus, PlanBlock, UserProfile } from "../types";
import { klammerWeek, rhythmWeeks } from "./deload";
import { beastPartName, blockFocus, blockWeeks, isDeloadWeek, isTestBlock } from "./plan";
import { maintenanceVolume, musclesOf, volumeRange } from "./volume";

type Share = Record<string, number>;
const P = packetsJson as unknown as {
  rules: [string, [number, number, number]][];
  default: [number, number, number];
  families: Record<string, { test: string; rx: string }>;
  advanced: string[];
};
const RULES = P.rules.map(([rx, v]) => ({ rx: new RegExp(rx, "i"), v }));
const FAMS = Object.values(P.families).map((f) => ({ test: f.test, rx: new RegExp(f.rx, "i") }));
const ADVANCED = new RegExp(P.advanced.join("|"), "i");
export const BEAST_FACTOR = 0.5;
/** Kein Satz: Laufen, Rudern, Rad, Seil, Pausen und Ähnliches (zählt als Kondition) */
export const CARDIO = /^(row|run|sprints?|bike|rest\b|obstacle run|jumping jacks|single unders|double unders|seilsprung|seilspringen|handstand practice)/i;
/** Muskeln, für die die Dosis ein Ziel setzt (Waden, Unterarme, Nacken laufen ohne Ziel mit) */
export const DOSE_MUSCLES = ["Brust", "Rücken", "Schultern", "Bizeps", "Trizeps", "Quadrizeps", "Beinbeuger", "Gesäß", "Rumpf"];
/** Bestien füllen auf Gruppenebene auf: Klimmzüge in der Bestie füllen Rücken oder Bizeps, Squats Quadrizeps oder
    Gesäß. Die Ziele bleiben je Muskel (feste Sätze fein), nur Wahl und Obergrenze der Bestien rechnen in Gruppen. */
export const DOSE_GROUPS: Record<string, string[]> = {
  Push: ["Brust", "Schultern", "Trizeps"],
  Pull: ["Rücken", "Bizeps"],
  Beine: ["Quadrizeps", "Beinbeuger", "Gesäß"],
  Rumpf: ["Rumpf"],
};
/** Summe je Gruppe */
export function groupShare(s: Share): Share {
  const o: Share = {};
  for (const [g, ms] of Object.entries(DOSE_GROUPS)) o[g] = ms.reduce((a, m) => a + (s[m] ?? 0), 0);
  return o;
}
/** Rumpfziel: fest in jedem Orden und jeder Woche (unterer Richtwert des Niveaus), unabhängig von Modus und Welle;
    Entlastung halbiert. Rumpf ermüdet wenig und lässt sich gut im Superset unterbringen. */
export const coreTarget = (u: UserProfile) => volumeRange(u)[0];

const levelIx = (u: UserProfile) => (u.level === "einsteiger" ? 0 : u.level === "erfahren" ? 2 : 1);

/** Wiederholungen am Stück, die ein Päckchen ergeben */
export function packetSize(name: string, user: UserProfile, state?: Pick<AppState, "packets" | "tests">): number {
  const own = state?.packets?.[name];
  if (own && own > 0) return own;
  for (const f of FAMS) {
    if (!f.rx.test(name)) continue;
    const res = state?.tests?.[f.test];
    const last = res?.length ? [...res].sort((a, b) => a.date.localeCompare(b.date))[res.length - 1] : undefined;
    if (last && last.value > 0) return Math.max(1, Math.round(last.value * 0.6));
  }
  const rule = RULES.find((r) => r.rx.test(name));
  return (rule?.v ?? P.default)[levelIx(user)];
}

/** Wiederholungen je Runde aus „50 Pushups“ oder „40/30/20/10 Pistol Squats“; null bei Zeit, Strecke oder „max“ */
export function repsPerRound(part: string, rounds: number): number[] | null {
  const t = part.trim().replace(/^buy-(in|out):\s*/i, "");
  const m = t.match(/^(\d+(?:\/\d+)*)(\S*)\s/);
  if (!m || m[2]) return null;
  const nums = m[1].split("/").map(Number);
  return Array.from({ length: rounds }, (_, i) => nums[i % nums.length]);
}

const doseMemo = new WeakMap<object, Map<string, Share>>();
/** Harte Sätze je Muskel einer Bestie (auch Kurzform, Doppel, Serie) */
export function beastDose(b: Beast, user: UserProfile, state?: Pick<AppState, "packets" | "tests">): Share {
  const owner: object = state ?? user;
  let m = doseMemo.get(owner);
  if (!m) doseMemo.set(owner, (m = new Map()));
  const key = `${b.id}|${b.rounds}|${b.work}|${user.level}`;
  const hit = m.get(key);
  if (hit) return hit;
  const out: Share = {};
  const units = b.parts ?? [{ rounds: b.rounds, work: b.work }];
  for (const u of units) {
    for (const part of u.work.split(" · ")) {
      const name = beastPartName(part);
      if (!name || CARDIO.test(name)) continue;
      const once = /^buy-(in|out)/i.test(part.trim());
      const rounds = once ? 1 : u.rounds;
      const reps = repsPerRound(part, rounds);
      const size = packetSize(name, user, state);
      const packets = reps ? reps.reduce((s, r) => s + Math.ceil(r / size), 0) : rounds;
      for (const [mu, f] of Object.entries(musclesOf(name))) out[mu] = (out[mu] ?? 0) + packets * BEAST_FACTOR * f;
    }
  }
  m.set(key, out);
  return out;
}

/** Bestie mit fortgeschrittenen Übungen (Archer, Clapping, Muscle-Up …): Bonus ab Stufe 2 */
export const isAdvancedBeast = (b: Beast) => [b.work, ...(b.parts?.map((p) => p.work) ?? [])].some((w) => ADVANCED.test(w));

export type DoseMode = "progress" | "soft" | "maintain";
export interface DoseModes { muscle: DoseMode; cardio: DoseMode }
/** Modus je Achse: aus den Zielen, überschreibbar im Orden (dose). Hirsch-Phasen standardmäßig maintain. */
export function doseMode(f: Focus, b?: PlanBlock): DoseModes {
  const goals = [f.goals.primary, ...(f.goals.secondary ?? [])];
  const base: DoseModes = b?.klammer === "regeneration" && !f.dose
    ? { muscle: "maintain", cardio: "maintain" }
    : {
      muscle: goals.some((g) => g === "hypertrophy" || g === "strength") ? "progress" : "maintain",
      cardio: goals.some((g) => g === "conditioning" || g === "endurance") ? "progress" : "maintain",
    };
  return { ...base, ...(f.dose ?? {}) };
}

/** Konditionsminuten je Woche: Spanne je Niveau, Erhalt */
export function cardioRange(u: UserProfile): [number, number] {
  if (u.cardioRange) return u.cardioRange;
  return u.level === "einsteiger" ? [30, 60] : u.level === "erfahren" ? [60, 120] : [45, 90];
}
export const CARDIO_KEEP = 20;

export interface DoseWeek {
  week: number;
  /** Stufe der Welle (1–3): 2 bevorzugt fortgeschrittene Bestien, 3 zusätzlich Lastbestien */
  stage: number;
  /** Stelle in der Welle: pos von len (0 = Start); deload: geplante Entlastung */
  pos: number;
  len: number;
  deload: boolean;
  /** Ziel und Obergrenze je Hauptmuskel (harte Sätze) */
  muscle: Share;
  cap: Share;
  /** Feste Übungen dieser Woche je Muskel */
  fixed: Share;
  cardio: number;
  fixedCardio: number;
  modes: DoseModes;
  /** Muskeln, deren Welle abgesenkt wurde, weil die Bestienplätze sie nicht erreichen */
  lowered: string[];
}

/** Aus plan.ts: feste Sätze, feste Konditionsminuten und Zahl der Bestienplätze einer Woche (als Parameter, kein Import-Kreis) */
export interface DoseHooks {
  fixedSets: (state: AppState, pb: PlanBlock, week: number) => Share;
  fixedCardio: (state: AppState, pb: PlanBlock, week: number) => number;
  beastSlots: (state: AppState, pb: PlanBlock, week: number) => number;
}

const r05 = (x: number) => Math.round(x * 2) / 2;
const capMemo = new Map<string, Share>();
/** Was ein Bestienplatz je Gruppe realistisch beiträgt (oberes Viertel des Bestands, nicht das Maximum) */
function slotCapacity(user: UserProfile): Share {
  const k = user.level ?? "fortgeschritten";
  const hit = capMemo.get(k);
  if (hit) return hit;
  const out: Share = {};
  for (const g of Object.keys(DOSE_GROUPS)) {
    const vs = BEASTS.map((b) => groupShare(beastDose(b, user))[g] ?? 0).sort((a, c) => a - c);
    out[g] = vs[Math.floor(vs.length * 0.75)] ?? 0;
  }
  capMemo.set(k, out);
  return out;
}

/** Stelle einer Ordenswoche in der Welle: Segmente zwischen geplanten Entlastungen (Rhythmus des Zeichens, in
    Klammerwochen), Stufe = Nummer des Segments (höchstens 3). Rein aus dem Plan, ohne Bestien. */
export function wavePos(plan: PlanBlock[], pb: PlanBlock, week: number): { stage: number; pos: number; len: number; deload: boolean } {
  const f = blockFocus(pb);
  const total = blockWeeks(pb);
  const k1 = klammerWeek(plan, pb, 1);
  const kTotal = k1?.total ?? total;
  const kOff = (k1?.week ?? 1) - 1;
  const deloads = new Set<number>(kTotal >= 8 ? rhythmWeeks(plan, pb, kTotal) : []);
  if (f) for (let w = 1; w <= total; w++) if (isDeloadWeek(f, w)) deloads.add(w + kOff);
  const kw = week + kOff;
  const ds = [...deloads].sort((a, c) => a - c);
  let start = 1, idx = 0;
  for (const d of ds) if (kw > d) { start = d + 1; idx++; }
  const next = ds.find((d) => d >= kw);
  const end = next != null ? (next === kw ? kw : next - 1) : kTotal;
  return { stage: Math.min(3, idx + 1), pos: kw - start, len: Math.max(1, end - start + 1), deload: deloads.has(kw) };
}

const trajMemo = new WeakMap<AppState, Map<string, DoseWeek[] | null>>();
/** Trajektorie des Ordens: alle Wochen, geplant zu Beginn. null ohne Orden und für Testwochen. */
export function doseTrajectory(state: AppState, pb: PlanBlock, hooks: DoseHooks): DoseWeek[] | null {
  if (isTestBlock(pb)) return null;
  const f = blockFocus(pb);
  if (!f) return null;
  let m = trajMemo.get(state);
  if (!m) trajMemo.set(state, (m = new Map()));
  const key = `${pb.id}|${pb.start}|${pb.end}|${pb.focusId}`;
  if (m.has(key)) return m.get(key)!;
  m.set(key, null); // Schutz vor Rekursion
  const user = state.user;
  const modes = doseMode(f, pb);
  const total = blockWeeks(pb);
  const [lo, hi] = volumeRange(user);
  const keep = maintenanceVolume(user);
  const [clo, chi] = cardioRange(user);
  const band = (mode: DoseMode, a: number, b: number, k: number): [number, number] =>
    mode === "progress" ? [a, b] : mode === "soft" ? [k, a] : [k, k];
  const [mA, mB] = band(modes.muscle, lo, hi, keep);
  const [cA, cB] = band(modes.cardio, clo, chi, CARDIO_KEEP);
  const raw: DoseWeek[] = [];
  for (let w = 1; w <= total; w++) {
    const s = wavePos(state.plan, pb, w);
    const t = s.len > 1 ? s.pos / (s.len - 1) : 1;
    const deload = s.deload;
    const fac = deload ? 0.5 : 1;
    const fixed = hooks.fixedSets(state, pb, w);
    const fixedCardio = hooks.fixedCardio(state, pb, w);
    const muscle: Share = {};
    for (const mu of DOSE_MUSCLES) muscle[mu] = (mu === "Rumpf" ? coreTarget(user) : mA + (mB - mA) * t) * fac;
    raw.push({ week: w, stage: s.stage, pos: s.pos, len: s.len, deload, muscle, cap: {}, fixed, cardio: (cA + (cB - cA) * t) * fac, fixedCardio, modes, lowered: [] });
  }
  // Machbarkeit vor dem Start: Was die Bestienplätze einer Gruppe nicht erreichen, senkt die ganze Welle ihrer Muskeln
  // gleichmäßig. Je Muskel zählt, was die festen Sätze nicht schon decken; ein Überschuss bei einem Muskel füllt den
  // Nachbarn nicht.
  const capSlot = slotCapacity(user);
  const lowered: string[] = [];
  for (const [g, ms] of Object.entries(DOSE_GROUPS)) {
    let f0 = 1;
    for (const d of raw) {
      if (d.deload) continue;
      const need = ms.reduce((a, mu) => a + Math.max(0, d.muscle[mu] - (d.fixed[mu] ?? 0)), 0);
      if (need <= 0) continue;
      const slots = hooks.beastSlots(state, pb, d.week) * (capSlot[g] ?? 0);
      f0 = Math.min(f0, slots / need);
    }
    // f0 skaliert den Anteil über den festen Sätzen
    if (f0 < 0.999) lowered.push(...ms);
    for (const mu of ms) for (const d of raw) {
      const fx = d.fixed[mu] ?? 0;
      if (d.muscle[mu] > fx) d.muscle[mu] = fx + (d.muscle[mu] - fx) * f0;
    }
  }
  for (const mu of DOSE_MUSCLES) {
    for (const d of raw) {
      // Nie unter dem, was die festen Übungen ohnehin bringen
      d.muscle[mu] = r05(Math.max(d.muscle[mu], d.fixed[mu] ?? 0));
      d.cap[mu] = r05(d.muscle[mu] * 1.15);
    }
  }
  for (const d of raw) { d.lowered = lowered; d.cardio = Math.round(Math.max(d.cardio, d.fixedCardio)); }
  m.set(key, raw);
  return raw;
}

export const doseWeek = (state: AppState, pb: PlanBlock, week: number, hooks: DoseHooks): DoseWeek | null => doseTrajectory(state, pb, hooks)?.[week - 1] ?? null;

/** Kurzzeile für die Bestie: was sie zur Woche beiträgt */
export function doseLine(dw: DoseWeek, dose: Share, minutes: number): string {
  const top = Object.entries(groupShare(dose)).filter(([, v]) => v >= 0.5).sort((a, c) => c[1] - a[1]).slice(0, 3);
  const fmt = (v: number) => String(r05(v)).replace(".", ",");
  const parts = top.map(([mu, v]) => `${mu} +${fmt(v)}`);
  const head = dw.deload ? `Entlastung` : `Woche ${dw.pos + 1} der Welle · Stufe ${dw.stage}`;
  return `${head}: ${parts.length ? parts.join(", ") : "Kondition"} · ${Math.round(minutes)} Min`;
}

/** Bestienübungen nach Häufigkeit im Bestand (ohne Kondition), für die Päckchen-Tabelle in Setup */
let exMemo: { name: string; n: number }[] | null = null;
export function beastExercises(): { name: string; n: number }[] {
  if (exMemo) return exMemo;
  const c = new Map<string, number>();
  for (const b of BEASTS) for (const part of b.work.split(" · ")) {
    const name = beastPartName(part);
    if (!name || CARDIO.test(name) || !repsPerRound(part, 1)) continue;
    c.set(name, (c.get(name) ?? 0) + 1);
  }
  exMemo = [...c].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return exMemo;
}

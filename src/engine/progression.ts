/* Progression: Vorschlag für die nächste Einheit und Fortschreiben nach der Einheit.
   Regeln :
   - double: im Wiederholungsbereich hocharbeiten. Der schwächste Satz zählt: Er setzt das nächste Ziel (+1),
             und liegt er 2 oder mehr Wiederholungen unter dem unteren Ende, geht es eine Stufe runter. Alle Sätze am oberen Ende oder Feedback »leicht« → eine Laststufe hoch, Wiederholungen wieder unten.
             »sehr leicht« → zwei Stufen. Zweimal »schwer« hintereinander → −5 %.
   - weight: feste Wiederholungen. »OK« und »leicht« je eine Stufe hoch, »sehr leicht« zwei, »schwer« hält, zweimal »schwer« −5 %.
   - topset: Top-Satz wie weight, Back-off-Sätze mit −10 %.
   - reps:   alle Sätze geschafft und nicht »schwer« → +1 Wiederholung.
   - ladder: zweimal hintereinander alle Sätze am oberen Ende → nächste Stufe. Zweimal »schwer« → eine Stufe zurück.
   - hold / minutes: nicht »schwer« → +step bis max.
   »OK« heißt: letzte Runde mit einer Wiederholung Reserve geschafft — und steigert deshalb schon bis zur nächsten Einheit.
   Lückenregel (große Gewichtssprünge, z. B. 10 → 12 kg):
   - double: Ist die nächste vorhandene Last größer, als der Wiederholungsbereich abfängt, wird die Obergrenze angehoben
             (höchstens auf 20), bis man nach dem Sprung wieder etwa unten im Bereich landet. Nach dem Sprung schätzt die App
             die Zielwiederholungen aus der Leistung vorher (Epley), statt stur auf das untere Ende zu setzen.
   - weight/topset: Sprung über 7,5 % → erst +1 bis +2 Wiederholungen, dann die nächste Last.
   Anderes Profil (Studio → Zuhause): Gibt es das Gewicht dort nicht, rechnet die App über die Leistung (Epley)
   auf die Stufen des Profils um. Stand zuletzt »leicht« an, darf es dabei die nächsthöhere Stufe sein. */
import type { AppState, EquipmentProfile, Feedback, Focus, SessionEntry, SlotState } from "../types";
import { EXERCISES, TRANSFER } from "../data";
import { loadScale, snapDown, snapNearest, stepLoad } from "./loads";
import { musclesOf } from "./volume";
import { parseReps, type Resolved } from "./resolve";

export interface Suggestion {
  name: string; // Übung (bei Leitern: aktuelle Stufe)
  stage: number;
  weight: number | null;
  backoff: number | null;
  targetReps: number | null;
  repsLabel: string;
  seconds: number | null;
  minutes: number | null;
  hint: string;
  /** Hinweis der Lückenregel, z. B. „Nächste Hantel 12 kg ist +20 %. Erst 16 Wdh, dann 12 kg.“ */
  gap?: string;
}

/** Größte Zahl an Wiederholungen, auf die der Bereich bei großen Sprüngen angehoben wird */
export const GAP_CAP = 15;
/** Ortswechsel auf leichtere Last: höchstens so viele Wiederholungen — gilt, wo der Ort keine schwerere Stufe hat */
export const MOVE_CAP = 30;
/** Ab diesem Sprung gilt die Lückenregel bei festen Wiederholungen */
export const FIXED_GAP = 0.075;
const RIR: Record<Feedback, number> = { zuschwer: 0, schwer: 0, ok: 1, leicht: 3, sehrleicht: 4 };

/** Nächste Last und relativer Sprung dorthin */
export function nextLoad(p: EquipmentProfile, equip: Resolved["equip"], w: number): { next: number; jump: number } | null {
  const next = stepLoad(p, equip, w, 1);
  return next > w + 1e-9 && w > 0 ? { next, jump: next / w - 1 } : null;
}

/** Obergrenze der Wiederholungen bei Last w: so hoch, dass man nach dem Sprung bei lo landet (Epley), gedeckelt. */
export function gapCeiling(p: EquipmentProfile, equip: Resolved["equip"], w: number, lo: number, hi: number): number {
  const n = nextLoad(p, equip, w);
  if (!n) return hi;
  const need = Math.ceil(30 * ((n.next / w) * (1 + lo / 30)) - 30 - 1e-9);
  return Math.max(hi, Math.min(Math.max(hi, GAP_CAP), need));
}

/** Zielwiederholungen nach einem Sprung von w auf next, geschätzt aus der Leistung vorher (gleiche Reserve). */
export function landingReps(w: number, reps: number, fb: Feedback, next: number, lo: number): number {
  const eff = reps + RIR[fb];
  const r = Math.floor(30 * ((w / next) * (1 + eff / 30)) - 30 - RIR.ok + 1e-9);
  return Math.min(lo, Math.max(Math.max(1, lo - 3), r));
}

/** Obergrenze bei festen Wiederholungen (weight/topset): +1 bis +2, wenn der Sprung groß ist */
function fixedCeiling(p: EquipmentProfile, equip: Resolved["equip"], w: number, lo: number): number {
  const n = nextLoad(p, equip, w);
  if (!n || n.jump <= FIXED_GAP) return lo;
  const need = Math.ceil(30 * ((n.next / w) * (1 + lo / 30)) - 30 - 1e-9);
  return Math.min(lo + 2, Math.max(lo + 1, need));
}

const fmtKg = (n: number) => String(n).replace(".", ",");

/* ---------- Ohne Gewicht bis zur Grenze, dann Zusatzlast ----------
   Nacken, Schienbein, Waden bis 30 Wiederholungen, Rumpf und Beine bis 25, Oberkörper bis 20.
   Danach dieselbe Übung mit Weste oder Gürtel, unteres Ende eines neuen Bereichs, Steigerung wie bei Hanteln. */
export function repCap(name: string): number {
  const m = Object.entries(musclesOf(name)).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (m === "Nacken" || m === "Waden") return 30;
  if (m && ["Brust", "Rücken", "Schultern", "Bizeps", "Trizeps"].includes(m)) return 20;
  return 25;
}
export function loadedRange(name: string): string {
  const c = repCap(name);
  return c >= 30 ? "15-20" : c >= 25 ? "12-15" : "8-12";
}
/** Hat die Übung die Grenze erreicht (Zustand „loaded“), läuft sie mit Zusatzlast wie eine Hantelübung */
export function loadPhase(r: Resolved, st: SlotState | undefined, p: EquipmentProfile): Resolved {
  const name = r.prog === "ladder" && r.ladder ? r.ladder[r.ladder.length - 1] : r.name;
  if (!st?.loaded || r.loadable || !EXERCISES[name]?.weighted || !loadScale(p, "plate")) return r;
  const atTop = r.prog === "ladder" ? !!r.ladder && st.stage >= r.ladder.length - 1 : r.prog === "reps";
  if (!atTop) return r;
  return { ...r, name, equip: "plate", loadable: true, prog: "double", reps: r.prog === "ladder" ? r.reps : loadedRange(name), ladder: undefined };
}
const firstLoad = (p: EquipmentProfile) => stepLoad(p, "plate", 0, 1);

export const EMPTY_STATE: SlotState = { weight: null, target: null, stage: 0, fb: [], topHits: 0, updated: "" };

/** Gewichtsdaten einer Übung: gleiche Übung, gleiche Daten, egal ob regulär oder als Ersatz an anderer Stelle.
    Es zählt der jüngste Stand dieser Übung. Leitern und Übungen ohne Gewicht bleiben an ihrer Stelle. */
export function sharedState(slots: Record<string, SlotState>, r: Resolved, env: EstimateEnv = {}): SlotState | undefined {
  const own = slots[r.key];
  if (!r.loadable || r.ladder) return own;
  let best = own;
  for (const [k, st] of Object.entries(slots)) {
    if (k === r.key || k.slice(k.indexOf("|") + 1) !== r.name || st.weight == null) continue;
    if (!best || (st.updated ?? "") > (best.updated ?? "")) best = st;
  }
  if (!best || best.weight == null) return estimateFrom(slots, r, env) ?? best;
  if (best === own) return best;
  // Stufe (Leiter) gehört zur Stelle, Gewicht und Wiederholungsziel zur Übung
  const borrowed = { ...best, stage: own?.stage ?? 0 };
  // Übergabe zwischen Wiederholungsbereichen (1.18): Dieselbe Übung läuft woanders in einem anderen Bereich
  // (Bench Press 4 × 10 im Aufbau, dann 4 × 5 im Kraft-Orden). Dann zählt der eigene Stand dieser Stelle; gibt es
  // noch keinen, wird das Gewicht umgerechnet statt übernommen.
  const shifted = rangeShift(r, borrowed);
  if (shifted === borrowed) return borrowed;
  return own?.weight != null ? own : shifted;
}

/* ---------- Schätzwerte (1.19, lernend seit 1.33) ---------- */

/** Was die Schätzung braucht, aber nicht in den Slots steht: Körpergewicht (für Körpergewichtsübungen als Quelle) und heute */
export interface EstimateEnv { bodyweight?: number | null; today?: string }
/** Körpergewicht: eigener Eintrag, sonst der letzte Wert aus der Testwoche (Balmung-Cup) */
export function bodyweightOf(state: Pick<AppState, "user" | "tests">): number | null {
  const bw = state.user.bodyweight;
  if (bw) return bw;
  const t = state.tests["t-bodyweight"] ?? [];
  return t[t.length - 1]?.value ?? null;
}
export const estimateEnv = (state: Pick<AppState, "user" | "tests">, today?: string): EstimateEnv => ({ bodyweight: bodyweightOf(state), today });

/** Gemessen zählt, was in den letzten 12 Wochen aktualisiert wurde */
const RECENT_DAYS = 84;
const recent = (st: SlotState, today: string) => !!st.updated && st.updated >= addDaysIso(today, -RECENT_DAYS);
const addDaysIso = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Leistung eines Stands: Gewicht × (1 + Wdh/30); Körpergewichtsübungen mit Körpergewicht × Anteil plus Zusatzlast */
export function perfOf(name: string, st: SlotState, bw?: number | null): number | null {
  if (st.target == null) return null;
  const share = TRANSFER.bodyweight?.[name];
  if (share != null) return bw ? (bw * share + (st.weight ?? 0)) * (1 + st.target / 30) : null;
  return st.weight != null ? st.weight * (1 + st.target / 30) : null;
}

/** Jüngster eigener Stand je Übungsname (über alle Stellen) */
function latestByName(slots: Record<string, SlotState>): Map<string, SlotState> {
  const out = new Map<string, SlotState>();
  for (const [k, st] of Object.entries(slots)) {
    const name = k.slice(k.indexOf("|") + 1);
    const cur = out.get(name);
    if (st.target == null || (st.weight == null && TRANSFER.bodyweight?.[name] == null)) continue;
    if (!cur || (st.updated ?? "") > (cur.updated ?? "")) out.set(name, st);
  }
  return out;
}

export interface FamilyMeasure { family: string; ref: string; ratios: Record<string, { stored: number; measured: number }> }
/** Eigene Verhältnisse je Familie: Haben mindestens zwei Übungen einer Familie eigene Stände aus den letzten 12 Wochen,
    gilt dein Verhältnis statt des hinterlegten. Bezug ist der Anker der Familie, wenn gemessen, sonst die jüngste
    gemessene Übung (mit ihrem hinterlegten Wert). */
export function ownRatios(slots: Record<string, SlotState>, today = todayIso()): FamilyMeasure[] {
  const latest = latestByName(slots);
  const out: FamilyMeasure[] = [];
  for (const [family, fam] of Object.entries(TRANSFER.families)) {
    const m = Object.keys(fam).filter((n) => { const st = latest.get(n); return !!st && st.weight != null && recent(st, today); })
      .sort((a, b) => (latest.get(b)!.updated ?? "").localeCompare(latest.get(a)!.updated ?? ""));
    if (m.length < 2) continue;
    const anchor = Object.keys(fam).find((n) => fam[n] === 1);
    const ref = anchor && m.includes(anchor) ? anchor : m[0];
    const pRef = perfOf(ref, latest.get(ref)!)!;
    const ratios: FamilyMeasure["ratios"] = {};
    for (const n of m) ratios[n] = { stored: fam[n], measured: Math.round((fam[ref] * perfOf(n, latest.get(n)!)! / pRef) * 100) / 100 };
    out.push({ family, ref, ratios });
  }
  return out;
}

export interface BridgeMeasure { from: string; to: string; stored: number; measured: number }
/** Auch Brücken lernen: Hast du die Quelle und eine Übung der Zielfamilie selbst (12 Wochen), gilt dein Verhältnis.
    In der Schätzung greift die Brücke nur, wenn die Familie selbst nichts liefert. */
export function ownBridges(slots: Record<string, SlotState>, env: EstimateEnv = {}): BridgeMeasure[] {
  const today = env.today ?? todayIso();
  const latest = latestByName(slots);
  const out: BridgeMeasure[] = [];
  for (const b of TRANSFER.bridges ?? []) {
    const src = latest.get(b.from);
    const pSrc = src && recent(src, today) ? perfOf(b.from, src, env.bodyweight) : null;
    if (!pSrc) continue;
    const fam = TRANSFER.families[b.to] ?? {};
    const member = Object.keys(fam).map((n) => ({ n, st: latest.get(n) })).filter((x) => x.st && x.st.weight != null && recent(x.st, today))
      .sort((a, c) => (c.st!.updated ?? "").localeCompare(a.st!.updated ?? ""))[0];
    if (!member) continue;
    const anchorPerf = perfOf(member.n, member.st!)! / fam[member.n];
    out.push({ from: b.from, to: b.to, stored: b.ratio, measured: Math.round((anchorPerf / pSrc) * 100) / 100 });
  }
  return out;
}

/** Startgewicht aus einer verwandten Übung schätzen (1.19, lernend 1.33). Rangfolge: eigener Stand (gar keine Schätzung)
    > gemessenes Verhältnis in der Familie (10 % Abschlag) > hinterlegtes Verhältnis (15 %) > Brücke aus einer anderen
    Familie (25 %). Wiederholungen nach Epley umgerechnet. Der eigene Stand ersetzt die Schätzung nach der ersten Einheit. */
export function estimateFrom(slots: Record<string, SlotState>, r: Resolved, env: EstimateEnv = {}): SlotState | undefined {
  if (!r.loadable || r.ladder || (r.prog !== "double" && r.prog !== "weight" && r.prog !== "topset")) return undefined;
  const entry = Object.entries(TRANSFER.families).find(([, f]) => f[r.name] != null);
  const rp = parseReps(r.reps);
  if (!entry || rp.lo == null || rp.amrap) return undefined;
  const [family, fam] = entry;
  const today = env.today ?? todayIso();
  const hi = rp.hi ?? rp.lo;
  const D = TRANSFER.discounts ?? { measured: 0.9, family: TRANSFER.discount, bridge: 0.75 };
  const make = (cap: number, discount: number, from: string, st: SlotState, how: "measured" | "family" | "bridge"): SlotState => ({
    ...EMPTY_STATE, weight: Math.round((cap / (1 + hi / 30)) * discount * 100) / 100, target: rp.lo,
    estimated: { from, kg: st.weight ?? 0, reps: st.target!, how, ...(TRANSFER.bodyweight?.[from] != null ? { bw: true } : {}) },
  });
  const latest = latestByName(slots);
  latest.delete(r.name);
  // 1. gemessenes Verhältnis: über den gemessenen Bezug der Familie
  const meas = ownRatios(slots, today).find((x) => x.family === family && !x.ratios[r.name]);
  if (meas) {
    const st = latest.get(meas.ref)!;
    return make(perfOf(meas.ref, st)! * (fam[r.name] / fam[meas.ref]), D.measured, meas.ref, st, "measured");
  }
  // 2. hinterlegtes Verhältnis: jüngster Stand der Familie
  const src = Object.keys(fam).filter((n) => latest.get(n)?.weight != null).sort((a, b) => (latest.get(b)!.updated ?? "").localeCompare(latest.get(a)!.updated ?? ""))[0];
  if (src) {
    const st = latest.get(src)!;
    return make(perfOf(src, st)! * (fam[r.name] / fam[src]), D.family, src, st, "family");
  }
  // 3. Brücke aus einer anderen Familie (jüngste Quelle); gelernte Brücke vor hinterlegter
  const learned = new Map(ownBridges(slots, env).map((b) => [`${b.from}>${b.to}`, b.measured]));
  const cands = (TRANSFER.bridges ?? []).filter((b) => b.to === family).map((b) => ({ b, st: latest.get(b.from) }))
    .filter((x) => x.st && perfOf(x.b.from, x.st, env.bodyweight) != null)
    .sort((a, c) => (c.st!.updated ?? "").localeCompare(a.st!.updated ?? ""));
  const best = cands[0];
  if (!best) return undefined;
  const ratio = learned.get(`${best.b.from}>${best.b.to}`) ?? best.b.ratio;
  return make(perfOf(best.b.from, best.st!, env.bodyweight)! * ratio * fam[r.name], D.bridge, best.b.from, best.st!, "bridge");
}

/** Gewicht in einen anderen Wiederholungsbereich umrechnen. Leistung = Gewicht × (1 + Wdh/30) (Epley, 1985).
    Vorsichtig: Das neue Gewicht ist für das obere Ende des neuen Bereichs gerechnet, gestartet wird am unteren —
    die erste Einheit ist machbar, die Rückmeldung holt den Rest in ein, zwei Einheiten auf.
    Greift, wenn das alte Ziel außerhalb liegt (darüber oder mehr als 1 darunter): Ein geborrigtes Ziel über dem
    neuen Bereich stammt aus einem anderen Ordenskontext (etwa einer Lückenleiter) und wird umgerechnet,
    statt den neuen Bereich von oben her zu eröffnen (1.40). */
export function rangeShift(r: Resolved, st: SlotState): SlotState {
  if (st.weight == null || st.target == null || !r.loadable || (r.prog !== "double" && r.prog !== "weight" && r.prog !== "topset")) return st;
  const rp = parseReps(r.reps);
  if (rp.lo == null || rp.amrap) return st;
  const lo = rp.lo, hi = rp.hi ?? rp.lo;
  if (st.target <= hi && st.target >= lo - 1) return st;
  const cap = st.weight * (1 + st.target / 30);
  const weight = Math.round((cap / (1 + hi / 30)) * 100) / 100;
  return { ...st, weight, target: lo, fb: [], topHits: 0, shifted: { kg: st.weight, reps: st.target } };
}

/** Stand auf ein Profil übertragen, in dem es das gespeicherte Gewicht nicht gibt.
    Leistung = Gewicht × (1 + Wdh/30). Gewählt wird die schwerste Stufe, deren Wiederholungen im Bereich liegen —
    höchstens bis zur Lücken-Obergrenze (15/20); hat der Ort nichts Schwereres, darf die Zahl darüber liegen (1.41).
    Passt keine Stufe in den Bereich, kommt lieber die nächstschwerere Stufe mit Wiederholungen knapp unter dem
    Bereich, als leichteres Gewicht mit aufgeblähten Zahlen — dieselbe Leistung, höheres Gewicht. War die letzte
    Rückmeldung »leicht« oder das Ziel am oberen Ende, darf man wie bei einem normalen Sprung bis zu 3 Wiederholungen
    unter dem Bereich landen. */
export function transferState(r: Resolved, st: SlotState, p: EquipmentProfile): SlotState {
  const w = st.weight;
  if (w == null || !r.loadable || (r.prog !== "double" && r.prog !== "weight" && r.prog !== "topset")) return st;
  if (Math.abs(snapDown(p, r.equip, w) - w) < 1e-9) return st; // Gewicht gibt es hier
  const rp = parseReps(r.reps);
  if (rp.lo == null || rp.amrap) return { ...st, weight: snapDown(p, r.equip, w) };
  const lo = rp.lo, hi = rp.hi ?? lo;
  const t = st.target ?? lo;
  const perf = w * (1 + t / 30);
  // Obergrenze der Umrechnung: Bereichsoberende, großzügigst die Lücken-Obergrenze — nie aufgeblähte Zahlen (1.41)
  const repCap = Math.max(hi, GAP_CAP);
  const lastFb = st.fb[st.fb.length - 1];
  const ready = lastFb === "leicht" || lastFb === "sehrleicht" || t >= hi;
  const floor = r.prog === "double" && ready ? Math.max(1, lo - 3) : lo;
  const down = snapDown(p, r.equip, w);
  const cands = [stepLoad(p, r.equip, w, 2), stepLoad(p, r.equip, w, 1), down].filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => b - a);
  const need = (c: number) => Math.ceil(30 * (perf / c) - 30 - 1e-9);
  // Erst eine Stufe, deren Wiederholungen im Bereich (bis zur Obergrenze) liegen — schwerste zuerst.
  // Über der Obergrenze nur, wenn der Ort keine schwerere Stufe hat: Dann ist die höhere Zahl die einzige
  // Form desselben Reizes (etwa eine einzelne Kettlebell zuhause) und MOVE_CAP begrenzt sie (1.41).
  for (const c of cands) {
    if (c > w && !ready) continue;
    const n = need(c);
    if (n >= floor && (r.prog !== "double" || n <= repCap || nextLoad(p, r.equip, c) == null)) return { ...st, weight: c, target: r.prog === "double" ? n : lo };
  }
  // Dann lieber die nächstschwerere Stufe knapp unter dem Bereich als leichteres Gewicht mit mehr Wiederholungen
  // als der Obergrenze: dieselbe Leistung, höheres Gewicht. Mindestens das halbe untere Bereichsende, und nicht
  // nach einer harten Einheit (Friedrich, 1.41).
  if (r.prog === "double" && lastFb !== "schwer") {
    const under = cands.filter((c) => c > w).find((c) => { const n = need(c); return n >= Math.max(1, Math.round(lo / 2)) && n < floor; });
    if (under != null) return { ...st, weight: under, target: need(under) };
  }
  // Nichts passt: schwerste Stufe unterhalb, Ziel an der Obergrenze — vorsichtig, die Rückmeldung justiert
  return { ...st, weight: down, target: Math.min(t, repCap) };
}

export function suggest(r: Resolved, st0: SlotState | undefined, weekInBlock = 1, p?: EquipmentProfile): Suggestion {
  const s = st0 && p ? transferState(r, st0, p) : st0 ?? EMPTY_STATE;
  const rp = parseReps(r.reps);
  const stage = r.ladder ? Math.min(Math.max(s.stage, r.ladderStart ?? 0), r.ladder.length - 1) : 0;
  const name = r.ladder ? r.ladder[stage] : r.name;
  let targetReps: number | null = null;
  let repsLabel = r.reps;
  let hint = "";
  let gap: string | undefined;
  const w0 = r.loadable ? s.weight : null;

  if (r.prog === "double" || r.prog === "ladder") {
    if (rp.lo !== null) {
      const hi = rp.hi ?? rp.lo;
      // Anderer Ort mit leichterer Last (z. B. Studio 24 kg, zuhause nur 20 kg): mehr Wiederholungen statt gleicher Zahl.
      // Der Ort hat keine schwerere Stufe (sonst hätte die Umrechnung sie genommen), darum gilt hier MOVE_CAP.
      const moved = st0 && s !== st0 && st0.weight != null && w0 != null && w0 < st0.weight && (s.target ?? 0) > hi ? Math.min(s.target!, Math.max(hi, MOVE_CAP)) : 0;
      const ceil = Math.max(moved, p && w0 != null && r.prog === "double" ? gapCeiling(p, r.equip, w0, rp.lo, hi) : hi);
      targetReps = Math.min(ceil, Math.max(Math.max(1, rp.lo - 3), s.target ?? rp.lo));
      const from = Math.min(rp.lo, targetReps);
      repsLabel = `${from}${ceil > from ? `–${ceil}` : ""}${rp.suffix}`;
      const n = ceil > hi && p && w0 != null ? nextLoad(p, r.equip, w0) : null;
      if (n) gap = `→ bis ${r.sets} × ${ceil}, dann ${fmtKg(n.next)} kg`;
    }
  } else if ((r.prog === "weight" || r.prog === "topset") && rp.lo !== null && !rp.amrap) {
    const ceil = p && w0 != null ? fixedCeiling(p, r.equip, w0, rp.lo) : rp.lo;
    targetReps = Math.min(ceil, Math.max(rp.lo, s.target ?? rp.lo));
    repsLabel = `${rp.lo}${ceil > rp.lo ? `–${ceil}` : ""}${rp.suffix}`;
    const n = ceil > rp.lo && p && w0 != null ? nextLoad(p, r.equip, w0) : null;
    if (n) gap = `→ bei „OK“ +1 Wdh bis ${r.sets} × ${ceil}, dann ${fmtKg(n.next)} kg`;
  } else if (r.prog === "reps") {
    if (rp.amrap) {
      repsLabel = s.target ? `AMRAP (zuletzt ${s.target})` : rp.minus ? `AMRAP, ${rp.minus} in Reserve` : "AMRAP";
    } else if (rp.lo !== null) {
      targetReps = Math.max(rp.lo, s.target ?? rp.lo);
      repsLabel = `${targetReps}${rp.suffix}`;
    }
  }

  if (targetReps === null && rp.lo !== null && !rp.amrap) targetReps = rp.lo;
  const weight = r.loadable ? s.weight : null;
  const backoff: number | null = null; // Back-off-Last rechnet backoffLoad() mit dem Profil
  if (weight == null && r.loadable) hint = "Startgewicht wählen";
  if (s.estimated && weight != null) {
    const e = s.estimated;
    const src = e.bw ? `${e.from} mit Körpergewicht${e.kg ? ` + ${fmtKg(e.kg)} kg` : ""} × ${e.reps}` : `${e.from} (${fmtKg(e.kg)} kg × ${e.reps})`;
    hint = `Schätzung aus ${src}${e.how === "measured" ? ", nach deinem gemessenen Verhältnis" : e.how === "bridge" ? ", entfernt verwandt" : ""}, vorsichtig angesetzt. Passt es nicht, trag dein Gewicht ein.`;
  }
  if (s.shifted && weight != null) hint = `Neuer Bereich: umgerechnet aus ${fmtKg(s.shifted.kg)} kg × ${s.shifted.reps}. Vorsichtig angesetzt, die Rückmeldung justiert.`;

  let seconds: number | null = null;
  if (r.kind === "hold") seconds = r.prog === "hold" || r.prog === "ladder" ? Math.max(r.hold ?? 20, s.target ?? r.hold ?? 20) : r.hold ?? 20;
  let minutes: number | null = null;
  if (r.kind === "timer") minutes = r.prog === "minutes" ? Math.min(r.max ?? 999, Math.max(r.minutes ?? 10, s.target ?? r.minutes ?? 10)) : r.minutes ?? 10;
  void weekInBlock;
  return { name, stage, weight, backoff, targetReps, repsLabel, seconds, minutes, hint, gap };
}

export function backoffLoad(p: EquipmentProfile, r: Resolved, top: number): number {
  return snapDown(p, r.equip, top * 0.9);
}

/** Nach der Einheit: neuen Zustand berechnen */
export function advance(r: Resolved, st: SlotState | undefined, entry: SessionEntry, p: EquipmentProfile, today: string): SlotState {
  const s: SlotState = { ...(st ?? EMPTY_STATE), fb: [...(st?.fb ?? [])] };
  delete s.shifted;
  delete s.estimated;
  if (r.ladder && (r.ladderStart ?? 0) > s.stage) s.stage = r.ladderStart!; // Skillcheck: Leiter startet höher
  const fb0: Feedback = entry.feedback ?? "ok";
  // „Zu schwer“ wirkt wie „Schwer“; die verfehlte Zahl steckt in den Sätzen (letzter Satz nachgefragt)
  const fb: Feedback = fb0 === "zuschwer" ? "schwer" : fb0;
  const prevFb = s.fb[s.fb.length - 1] === "zuschwer" ? "schwer" : s.fb[s.fb.length - 1];
  s.fb = [...s.fb, fb0].slice(-5);
  s.updated = today;
  const done = entry.sets.filter((x) => x.done);
  if (!done.length) return s;
  const rp = parseReps(r.reps);
  const repsDone = done.map((x) => x.reps ?? 0);
  const minReps = Math.min(...repsDone);
  const twiceHard = fb === "schwer" && prevFb === "schwer";
  const usedW = [...done].reverse().find((x) => x.weight != null)?.weight ?? s.weight;
  const allDone = done.length >= entry.sets.length;

  switch (r.prog) {
    case "double": {
      if (r.loadable && usedW != null) {
        s.weight = usedW;
        const lo = rp.lo ?? 0;
        const hi = rp.hi ?? lo;
        const ceil = gapCeiling(p, r.equip, usedW, lo, hi);
        const extended = ceil > hi;
        const allTop = allDone && repsDone.every((x) => x >= ceil);
        const jump = (n: number) => {
          s.weight = stepLoad(p, r.equip, usedW, n);
          s.target = s.weight > usedW ? landingReps(usedW, minReps, fb, s.weight, lo) : lo;
        };
        // Satz deutlich verfehlt: 2 oder mehr Wiederholungen unter dem Ziel (bzw. dem unteren Ende) → eine Stufe runter
        const aim = Math.min(lo, st?.target ?? lo);
        const missed = rp.lo !== null && minReps <= aim - 2;
        if (twiceHard) { s.weight = snapDown(p, r.equip, usedW * 0.95); s.target = rp.lo; }
        else if (missed) { s.weight = stepLoad(p, r.equip, usedW, -1); s.target = lo; }
        else if (allTop && fb !== "schwer") jump(fb === "sehrleicht" && !extended ? 2 : 1);
        else if (!extended && fb === "sehrleicht") jump(2);
        else if (!extended && fb === "leicht") jump(1);
        // Wiederholungsphase: „OK“ und „Leicht“ +1, „Sehr leicht“ +2, „Schwer“ gleiches Ziel
        else if (extended && (fb === "leicht" || fb === "sehrleicht")) s.target = Math.min(ceil, Math.max(lo, minReps + (fb === "sehrleicht" ? 2 : 1)));
        else if (rp.lo !== null) s.target = Math.min(ceil, Math.max(Math.max(1, lo - 3), minReps + (fb === "schwer" ? 0 : 1)));
      }
      break;
    }
    case "weight":
    case "topset": {
      const w = r.prog === "topset" ? (done[0].weight ?? s.weight) : usedW;
      if (w == null) break;
      s.weight = w;
      const n = r.prog === "topset" ? Math.max(1, r.step) : 1;
      const lo = rp.lo;
      const fc = lo !== null && !rp.amrap ? fixedCeiling(p, r.equip, w, lo) : null;
      const cur = s.target ?? lo ?? 0;
      if (twiceHard) { s.weight = snapDown(p, r.equip, w * 0.95); s.target = lo; }
      else if (fc != null && lo != null && fc > lo && (fb === "ok" || fb === "leicht" || fb === "sehrleicht") && cur < fc) {
        s.weight = snapNearest(p, r.equip, w);
        s.target = Math.min(fc, cur + (fb === "sehrleicht" ? 2 : 1));
      }
      else if (fb === "sehrleicht") { s.weight = stepLoad(p, r.equip, w, fc != null && fc > (lo ?? 0) ? n : 2 * n); s.target = lo; }
      else if (fb === "ok" || fb === "leicht") { s.weight = stepLoad(p, r.equip, w, n); s.target = lo; }
      else s.weight = snapNearest(p, r.equip, w);
      break;
    }
    case "reps": {
      if (rp.amrap) { s.target = Math.max(...repsDone); break; }
      // Vom tatsächlich Geschafften aus: 2 × 20 bei Ziel 15 → nächstes Ziel 21, nicht 16. „Sehr leicht“ +2, „Schwer“ hält.
      const tgt = s.target ?? rp.lo ?? 0;
      if (allDone && minReps >= tgt) s.target = fb === "schwer" ? minReps : minReps + (r.step || 1) * (fb === "sehrleicht" ? 2 : 1);
      else s.target = tgt;
      // Grenze überschritten: weiter mit Zusatzlast, wenn die Übung das kann und der Ort Last hat
      if (EXERCISES[r.name]?.weighted && s.target > repCap(r.name) && loadScale(p, "plate")) {
        s.loaded = true;
        s.weight = firstLoad(p);
        s.target = parseReps(loadedRange(r.name)).lo;
      }
      break;
    }
    case "ladder": {
      if (!r.ladder) break;
      if (r.kind === "hold") {
        const cur = s.target ?? r.hold ?? 20;
        const cap = r.max ?? (r.hold ?? 20) * 2;
        if (twiceHard) { s.stage = Math.max(0, s.stage - 1); s.target = r.hold ?? 20; s.topHits = 0; }
        else if (allDone && fb !== "schwer") {
          if (cur >= cap && s.stage < r.ladder.length - 1) { s.stage += 1; s.target = r.hold ?? 20; }
          else s.target = Math.min(cap, cur + 5);
        }
        break;
      }
      const top = rp.hi ?? rp.lo ?? 0;
      const allTop = allDone && (r.kind === "timer" || repsDone.every((x) => x >= top));
      if (twiceHard) { s.stage = Math.max(0, s.stage - 1); s.topHits = 0; s.target = rp.lo; }
      else if (allTop && fb !== "schwer") {
        s.topHits += 1;
        if (s.topHits >= 2 && s.stage < r.ladder.length - 1) { s.stage += 1; s.topHits = 0; s.target = rp.lo; }
        else if (s.topHits >= 2 && EXERCISES[r.ladder[s.stage]]?.weighted && loadScale(p, "plate")) {
          // Letzte Stufe zweimal oben: dieselbe Übung mit Zusatzlast
          s.loaded = true; s.topHits = 0; s.weight = firstLoad(p); s.target = rp.lo;
        }
        else s.target = top;
      } else {
        s.topHits = 0;
        if (rp.lo !== null) s.target = Math.min(top, Math.max(rp.lo, minReps + 1));
      }
      break;
    }
    case "hold": {
      const cur = s.target ?? r.hold ?? 20;
      if (allDone && fb !== "schwer") s.target = Math.min(r.max ?? 999, cur + (r.step || 5));
      else s.target = cur;
      break;
    }
    case "minutes": {
      const cur = s.target ?? r.minutes ?? 10;
      if (fb !== "schwer") s.target = Math.min(r.max ?? 999, cur + (r.step || 5));
      else s.target = cur;
      break;
    }
  }
  return s;
}

/* ---------- Trend (1.28): steigt, hält oder gibt nach ---------- */

/** Bestes Satzprodukt einer Übung: Gewicht × (1 + Wdh/30); ohne Gewicht die Wiederholungen, ohne beides die Sekunden */
export function bestProduct(e: SessionEntry): number | null {
  const done = e.sets.filter((x) => x.done);
  if (!done.length) return null;
  return Math.max(...done.map((x) => (x.weight ? x.weight * (1 + (x.reps ?? 0) / 30) : x.reps ? x.reps : x.seconds ?? 0)));
}

/** Vergleich zweier Einheiten derselben Übung über das beste Satzprodukt */
export function trendOf(prev: SessionEntry, cur: SessionEntry): "up" | "held" | "down" {
  const p = bestProduct(prev) ?? 0, c = bestProduct(cur) ?? 0;
  return c > p + 1e-6 ? "up" : c < p - 1e-6 ? "down" : "held";
}

/** Kernübungen, deren letzte Einheit (ab `since`) gegenüber der davor nachgegeben hat — ein Signal für die Entlastung */
export function coreDowns(state: AppState, focus: Focus, since: string): string[] {
  const core = coreIds(focus);
  const hist = new Map<string, { date: string; e: SessionEntry }[]>();
  for (const s of state.sessions) if (s.done) for (const e of Object.values(s.entries)) {
    if (!core.has(e.slotId) || e.prog === "none" || !e.sets.some((x) => x.done)) continue;
    hist.set(e.name, [...(hist.get(e.name) ?? []), { date: s.date, e }]);
  }
  const out: string[] = [];
  for (const [name, h] of hist) {
    const xs = h.sort((a, b) => a.date.localeCompare(b.date)).slice(-2);
    if (xs.length === 2 && xs[1].date >= since && trendOf(xs[0].e, xs[1].e) === "down") out.push(name);
  }
  return out;
}
const coreIds = (focus: Focus): Set<string> => {
  const core = new Set<string>();
  for (const r of Object.values(focus.roles)) for (const b of r.blocks) {
    const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : [];
    for (const sl of slots) if (sl.core) core.add(sl.id);
  }
  return core;
};

/** Kernübungen (Slots mit `core`), die in zwei Einheiten nacheinander nachgegeben haben (Gewicht oder Wiederholungen
    runter). Einzelne schwache Tage bleiben still. `since`: nur Einheiten ab diesem Datum zählen für den letzten Rückgang. */
export function slippingCore(state: AppState, focus: Focus, since?: string): string[] {
  const core = coreIds(focus);
  const out: string[] = [];
  const hist = new Map<string, { date: string; e: SessionEntry }[]>();
  for (const s of state.sessions) if (s.done) for (const e of Object.values(s.entries)) {
    if (!core.has(e.slotId) || e.prog === "none" || !e.sets.some((x) => x.done)) continue;
    hist.set(e.name, [...(hist.get(e.name) ?? []), { date: s.date, e }]);
  }
  for (const [name, h] of hist) {
    const xs = h.sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
    if (xs.length < 3 || (since && xs[2].date < since)) continue;
    if (trendOf(xs[0].e, xs[1].e) === "down" && trendOf(xs[1].e, xs[2].e) === "down") out.push(name);
  }
  return out;
}

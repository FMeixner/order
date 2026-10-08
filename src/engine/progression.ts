/* Progression: Vorschlag für die nächste Einheit und Fortschreiben nach der Einheit.
   Regeln :
   - double: im Wiederholungsbereich hocharbeiten. Der schwächste Satz zählt: Er setzt das nächste Ziel (+1),
             und liegt er 2 oder mehr Wiederholungen unter dem unteren Ende, geht es eine Stufe runter. Alle Sätze am oberen Ende oder Feedback »leicht« → eine Laststufe hoch, Wiederholungen wieder unten.
             »sehr leicht« → zwei Stufen. Zweimal »schwer« hintereinander → −5 %.
   - weight: feste Wiederholungen. »OK« hält, »leicht« +1 Stufe, »sehr leicht« +2, zweimal »schwer« −5 %.
   - topset: Top-Satz wie weight, Back-off-Sätze mit −10 %.
   - reps:   alle Sätze geschafft und nicht »schwer« → +1 Wiederholung.
   - ladder: zweimal hintereinander alle Sätze am oberen Ende → nächste Stufe. Zweimal »schwer« → eine Stufe zurück.
   - hold / minutes: nicht »schwer« → +step bis max.
   Lückenregel (große Gewichtssprünge, z. B. 10 → 12 kg):
   - double: Ist die nächste vorhandene Last größer, als der Wiederholungsbereich abfängt, wird die Obergrenze angehoben
             (höchstens auf 20), bis man nach dem Sprung wieder etwa unten im Bereich landet. Nach dem Sprung schätzt die App
             die Zielwiederholungen aus der Leistung vorher (Epley), statt stur auf das untere Ende zu setzen.
   - weight/topset: Sprung über 7,5 % → bei »leicht« erst +1 bis +2 Wiederholungen, dann die nächste Last.
   Dreimal »OK« mit gleichem Gewicht und ohne mehr Wiederholungen → einmal mehr fordern: nächste Laststufe
   (bei großem Sprung +2 Wiederholungen). Wer sich damit überrascht, bleibt oben; sonst regelt »schwer« zurück.
   Anderes Profil (Studio → Zuhause): Gibt es das Gewicht dort nicht, rechnet die App über die Leistung (Epley)
   auf die Stufen des Profils um. Stand zuletzt »leicht« an, darf es dabei die nächsthöhere Stufe sein. */
import type { EquipmentProfile, Feedback, SessionEntry, SlotState } from "../types";
import { snapDown, snapNearest, stepLoad } from "./loads";
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
export const GAP_CAP = 20;
/** Ab diesem Sprung gilt die Lückenregel bei festen Wiederholungen */
export const FIXED_GAP = 0.075;
const RIR: Record<Feedback, number> = { schwer: 1, ok: 2, leicht: 3, sehrleicht: 4 };

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

export const EMPTY_STATE: SlotState = { weight: null, target: null, stage: 0, fb: [], topHits: 0, updated: "" };

/** Gewichtsdaten einer Übung: gleiche Übung, gleiche Daten, egal ob regulär oder als Ersatz an anderer Stelle.
    Es zählt der jüngste Stand dieser Übung. Leitern und Übungen ohne Gewicht bleiben an ihrer Stelle. */
export function sharedState(slots: Record<string, SlotState>, r: Resolved): SlotState | undefined {
  const own = slots[r.key];
  if (!r.loadable || r.ladder) return own;
  let best = own;
  for (const [k, st] of Object.entries(slots)) {
    if (k === r.key || k.slice(k.indexOf("|") + 1) !== r.name || st.weight == null) continue;
    if (!best || (st.updated ?? "") > (best.updated ?? "")) best = st;
  }
  // Stufe (Leiter) gehört zur Stelle, Gewicht und Wiederholungsziel zur Übung
  return best && best !== own ? { ...best, stage: own?.stage ?? 0 } : best;
}

/** Stand auf ein Profil übertragen, in dem es das gespeicherte Gewicht nicht gibt.
    Leistung = Gewicht × (1 + Wdh/30). Gewählt wird die schwerste Stufe, bei der die nötigen Wiederholungen
    noch im Bereich liegen. War die letzte Rückmeldung »leicht« oder das Ziel am oberen Ende, darf man wie bei
    einem normalen Sprung bis zu 3 Wiederholungen unter dem Bereich landen. */
export function transferState(r: Resolved, st: SlotState, p: EquipmentProfile): SlotState {
  const w = st.weight;
  if (w == null || !r.loadable || (r.prog !== "double" && r.prog !== "weight" && r.prog !== "topset")) return st;
  if (Math.abs(snapDown(p, r.equip, w) - w) < 1e-9) return st; // Gewicht gibt es hier
  const rp = parseReps(r.reps);
  if (rp.lo == null || rp.amrap) return { ...st, weight: snapDown(p, r.equip, w) };
  const lo = rp.lo;
  const t = st.target ?? lo;
  const cap = w * (1 + t / 30);
  const lastFb = st.fb[st.fb.length - 1];
  const ready = st.nudge || lastFb === "leicht" || lastFb === "sehrleicht" || t >= (rp.hi ?? lo);
  const floor = r.prog === "double" && ready ? Math.max(1, lo - 3) : lo;
  const down = snapDown(p, r.equip, w);
  const cands = [stepLoad(p, r.equip, w, 2), stepLoad(p, r.equip, w, 1), down].filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => b - a);
  for (const c of cands) {
    if (c > w && !ready) continue;
    const need = Math.ceil(30 * (cap / c) - 30 - 1e-9);
    if (need >= floor) return { ...st, weight: c, target: r.prog === "double" ? need : lo };
  }
  return { ...st, weight: down };
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
      const ceil = p && w0 != null && r.prog === "double" ? gapCeiling(p, r.equip, w0, rp.lo, hi) : hi;
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
    if (n) gap = `→ bei „Leicht“ +1 Wdh bis ${r.sets} × ${ceil}, dann ${fmtKg(n.next)} kg`;
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
  if (s.nudge && weight != null) gap = `Dreimal OK: heute ${targetReps != null ? `${r.sets} × ${targetReps} @ ${fmtKg(weight)} kg` : "etwas mehr"}. Geht nicht? Dann „Schwer“.`;
  const backoff: number | null = null; // Back-off-Last rechnet backoffLoad() mit dem Profil
  if (weight == null && r.loadable) hint = "Startgewicht wählen";

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
  if (r.ladder && (r.ladderStart ?? 0) > s.stage) s.stage = r.ladderStart!; // Skillcheck: Leiter startet höher
  const fb: Feedback = entry.feedback ?? "ok";
  const prevFb = s.fb[s.fb.length - 1];
  s.fb = [...s.fb, fb].slice(-5);
  s.updated = today;
  s.nudge = false;
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
      else if (fc != null && lo != null && fc > lo && (fb === "leicht" || fb === "sehrleicht") && cur < fc) {
        s.weight = snapNearest(p, r.equip, w);
        s.target = Math.min(fc, cur + (fb === "sehrleicht" ? 2 : 1));
      }
      else if (fb === "sehrleicht") { s.weight = stepLoad(p, r.equip, w, fc != null && fc > (lo ?? 0) ? n : 2 * n); s.target = lo; }
      else if (fb === "leicht") { s.weight = stepLoad(p, r.equip, w, n); s.target = lo; }
      else s.weight = snapNearest(p, r.equip, w);
      break;
    }
    case "reps": {
      if (rp.amrap) { s.target = Math.max(...repsDone); break; }
      // Vom tatsächlich Geschafften aus: 2 × 20 bei Ziel 15 → nächstes Ziel 21, nicht 16. „Sehr leicht“ +2, „Schwer“ hält.
      const tgt = s.target ?? rp.lo ?? 0;
      if (allDone && minReps >= tgt) s.target = fb === "schwer" ? minReps : minReps + (r.step || 1) * (fb === "sehrleicht" ? 2 : 1);
      else s.target = tgt;
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
  // Dreimal OK mit gleichem Gewicht und ohne mehr Wiederholungen: einmal mehr fordern
  if (r.loadable && (r.prog === "double" || r.prog === "weight" || r.prog === "topset") && usedW != null) {
    const hist = [...(st?.hist ?? []), { w: usedW, r: minReps }].slice(-3);
    s.hist = hist;
    const stuck = hist.length === 3 && s.fb.slice(-3).every((x) => x === "ok") && hist.every((h) => h.w === usedW) && hist[2].r <= hist[0].r;
    // Nur wenn die normale Regel nicht ohnehin schon steigert
    const rising = (s.weight ?? 0) > usedW || (r.prog !== "double" && (s.target ?? 0) > minReps);
    if (stuck && !rising && !twiceHard) {
      const lo = rp.lo ?? 0;
      const n = nextLoad(p, r.equip, usedW);
      const big = n ? n.jump > (r.prog === "double" ? 0.1 : FIXED_GAP) : true;
      if (!big && n) { s.weight = n.next; s.target = r.prog === "double" ? landingReps(usedW, minReps, "ok", n.next, lo) : lo; }
      else s.target = minReps + 2;
      s.nudge = true;
      s.hist = [];
    }
  }
  return s;
}

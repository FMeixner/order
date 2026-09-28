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
   - weight/topset: Sprung über 7,5 % → bei »leicht« erst +1 bis +2 Wiederholungen, dann die nächste Last. */
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

export function suggest(r: Resolved, st: SlotState | undefined, weekInBlock = 1, p?: EquipmentProfile): Suggestion {
  const s = st ?? EMPTY_STATE;
  const rp = parseReps(r.reps);
  const stage = r.ladder ? Math.min(s.stage, r.ladder.length - 1) : 0;
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
      if (n) gap = `Nächste Stufe ${fmtKg(n.next)} kg ist +${Math.round(n.jump * 100)} %. Erst ${ceil} Wdh in allen Sätzen, dann ${fmtKg(n.next)} kg.`;
    }
  } else if ((r.prog === "weight" || r.prog === "topset") && rp.lo !== null && !rp.amrap) {
    const ceil = p && w0 != null ? fixedCeiling(p, r.equip, w0, rp.lo) : rp.lo;
    targetReps = Math.min(ceil, Math.max(rp.lo, s.target ?? rp.lo));
    repsLabel = `${rp.lo}${ceil > rp.lo ? `–${ceil}` : ""}${rp.suffix}`;
    const n = ceil > rp.lo && p && w0 != null ? nextLoad(p, r.equip, w0) : null;
    if (n) gap = `Nächste Stufe ${fmtKg(n.next)} kg ist +${Math.round(n.jump * 100)} %. Bei „Leicht“ erst mehr Wiederholungen (bis ${ceil}), dann ${fmtKg(n.next)} kg.`;
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
  const fb: Feedback = entry.feedback ?? "ok";
  const prevFb = s.fb[s.fb.length - 1];
  s.fb = [...s.fb, fb].slice(-5);
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
        else if (extended && (fb === "leicht" || fb === "sehrleicht")) s.target = Math.min(ceil, Math.max(lo, minReps + (fb === "sehrleicht" ? 3 : 2)));
        else if (rp.lo !== null) s.target = Math.min(ceil, Math.max(Math.max(1, lo - 3), minReps + 1));
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
      const tgt = s.target ?? rp.lo ?? 0;
      if (allDone && fb !== "schwer" && repsDone.every((x) => x >= tgt)) s.target = tgt + (r.step || 1);
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
  return s;
}

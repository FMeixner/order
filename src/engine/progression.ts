/* Progression: Vorschlag für die nächste Einheit und Fortschreiben nach der Einheit.
   Regeln :
   - double: im Wiederholungsbereich hocharbeiten. Alle Sätze am oberen Ende oder Feedback »leicht« → eine Laststufe hoch, Wiederholungen wieder unten.
             »sehr leicht« → zwei Stufen. Zweimal »schwer« hintereinander → −5 %.
   - weight: feste Wiederholungen. »OK« hält, »leicht« +1 Stufe, »sehr leicht« +2, zweimal »schwer« −5 %.
   - topset: Top-Satz wie weight, Back-off-Sätze mit −10 %.
   - reps:   alle Sätze geschafft und nicht »schwer« → +1 Wiederholung.
   - ladder: zweimal hintereinander alle Sätze am oberen Ende → nächste Stufe. Zweimal »schwer« → eine Stufe zurück.
   - hold / minutes: nicht »schwer« → +step bis max. */
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
}

export const EMPTY_STATE: SlotState = { weight: null, target: null, stage: 0, fb: [], topHits: 0, updated: "" };

export function suggest(r: Resolved, st: SlotState | undefined, weekInBlock = 1): Suggestion {
  const s = st ?? EMPTY_STATE;
  const rp = parseReps(r.reps);
  const stage = r.ladder ? Math.min(s.stage, r.ladder.length - 1) : 0;
  const name = r.ladder ? r.ladder[stage] : r.name;
  let targetReps: number | null = null;
  let repsLabel = r.reps;
  let hint = "";

  if (r.prog === "double" || r.prog === "ladder") {
    if (rp.lo !== null) {
      targetReps = Math.min(rp.hi ?? rp.lo, Math.max(rp.lo, s.target ?? rp.lo));
      repsLabel = rp.lo !== rp.hi ? `${targetReps}${rp.suffix} (${r.reps})` : r.reps;
    }
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
  if (weight == null && r.loadable) hint = "Startgewicht wählen, 2–3 Wdh in Reserve";

  let seconds: number | null = null;
  if (r.kind === "hold") seconds = r.prog === "hold" || r.prog === "ladder" ? Math.max(r.hold ?? 20, s.target ?? r.hold ?? 20) : r.hold ?? 20;
  let minutes: number | null = null;
  if (r.kind === "timer") minutes = r.prog === "minutes" ? Math.min(r.max ?? 999, Math.max(r.minutes ?? 10, s.target ?? r.minutes ?? 10)) : r.minutes ?? 10;
  void weekInBlock;
  return { name, stage, weight, backoff, targetReps, repsLabel, seconds, minutes, hint };
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
        const top = rp.hi ?? rp.lo ?? 0;
        const allTop = allDone && repsDone.every((x) => x >= top);
        if (twiceHard) { s.weight = snapDown(p, r.equip, usedW * 0.95); s.target = rp.lo; }
        else if (fb === "sehrleicht") { s.weight = stepLoad(p, r.equip, usedW, 2); s.target = rp.lo; }
        else if (fb === "leicht" || (allTop && fb !== "schwer")) { s.weight = stepLoad(p, r.equip, usedW, 1); s.target = rp.lo; }
        else if (rp.lo !== null) s.target = Math.min(top, Math.max(rp.lo, minReps + 1));
      }
      break;
    }
    case "weight":
    case "topset": {
      const w = r.prog === "topset" ? (done[0].weight ?? s.weight) : usedW;
      if (w == null) break;
      s.weight = w;
      const n = r.prog === "topset" ? Math.max(1, r.step) : 1;
      if (twiceHard) s.weight = snapDown(p, r.equip, w * 0.95);
      else if (fb === "sehrleicht") s.weight = stepLoad(p, r.equip, w, 2 * n);
      else if (fb === "leicht") s.weight = stepLoad(p, r.equip, w, n);
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

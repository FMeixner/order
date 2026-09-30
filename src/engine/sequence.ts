/* Vorschlag einer Blockfolge: welcher Orden in welche Phase?
   Beam-Suche über alle Phasen. Punkte für: passt zur Alltagslast und Reise, Länge passt zum Orden,
   gute Nachfolge (successors), keine Wiederholung direkt hintereinander, und am Ende die Jahresbalance
   (allround) oder der Anteil eines gewählten Schwerpunkts. Vergangene und laufende Phasen bleiben. */
import { FOCI, FOCUS_BY_ID } from "../data";
import type { Focus, PlanBlock } from "../types";
import { AXES, balanceOf, type AxisId, type Balance } from "./balance";
import { blockWeeks, fitScore, isTestBlock, TEST_BLOCK } from "./plan";

export type Aim = "allround" | "deficits" | AxisId;
/** Defizite aus der letzten Testwoche als Gewichte je Achse (für „Defizite zuerst“) */
export type DeficitWeights = { axis: AxisId; w: number }[];
export interface SeqItem { id: string; focusId: string; locked: boolean; reasons: string[] }
export interface SeqResult { items: SeqItem[]; balance: Balance; before: Balance }

const BEAM = 40;

function stepScore(f: Focus, b: PlanBlock, prev: Focus | null, used: string[]): { score: number; reasons: string[] } {
  const fit = fitScore(f, b.load, b.travel);
  let score = fit.score;
  const reasons = fit.reasons.filter((r) => /Reise/.test(r));
  const w = blockWeeks(b);
  if (w < f.weeks.min) { score -= (f.weeks.min - w) * 0.6; reasons.push(`eigentlich ab ${f.weeks.min} Wochen`); }
  else if (w > f.weeks.max) { score -= (w - f.weeks.max) * 0.4; reasons.push(`eigentlich bis ${f.weeks.max} Wochen`); }
  if (prev) {
    if (prev.id === f.id) score -= 3;
    else if (prev.successors?.includes(f.id)) { score += 1.5; reasons.push(`folgt gut auf ${prev.name}`); }
  }
  if (used.includes(f.id)) score -= 0.8;
  return { score, reasons };
}

export function suggestSequence(plan: PlanBlock[], today: string, aim: Aim, deficits: DeficitWeights = []): SeqResult {
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const from = sorted[0]?.start ?? today, to = sorted[sorted.length - 1]?.end ?? today;
  type Beam = { seq: string[]; score: number; reasons: string[][] };
  let beams: Beam[] = [{ seq: [], score: 0, reasons: [] }];
  for (const b of sorted) {
    if (isTestBlock(b)) { beams = beams.map((bm) => ({ ...bm, seq: [...bm.seq, TEST_BLOCK], reasons: [...bm.reasons, ["eigene Testwoche"]] })); continue; }
    const locked = b.start <= today && !!FOCUS_BY_ID[b.focusId];
    const next: Beam[] = [];
    for (const bm of beams) {
      const lastReal = [...bm.seq].reverse().find((x) => x !== TEST_BLOCK);
      const prev = lastReal ? FOCUS_BY_ID[lastReal] ?? null : null;
      const options = locked ? [FOCUS_BY_ID[b.focusId]] : FOCI.filter((f) => fitScore(f, b.load, b.travel).score >= 0);
      for (const f of options) {
        const st = stepScore(f, b, prev, bm.seq);
        next.push({ seq: [...bm.seq, f.id], score: bm.score + (locked ? 0 : st.score), reasons: [...bm.reasons, locked ? ["läuft oder ist vorbei"] : st.reasons] });
      }
    }
    // Zwischenstand mit Balance-Anteil bewerten, damit die Suche das Ziel früh berücksichtigt
    const withAim = (bm: Beam) => bm.score + aimScore(sorted.slice(0, bm.seq.length).map((x, i) => ({ ...x, focusId: bm.seq[i] })), from, to, aim, deficits);
    beams = next.sort((a, c) => withAim(c) - withAim(a)).slice(0, BEAM);
  }
  const best = beams[0];
  const proposed = sorted.map((b, i) => ({ ...b, focusId: best?.seq[i] ?? b.focusId }));
  return {
    items: sorted.map((b, i) => ({ id: b.id, focusId: best?.seq[i] ?? b.focusId, locked: isTestBlock(b) || (b.start <= today && !!FOCUS_BY_ID[b.focusId]), reasons: best?.reasons[i] ?? [] })),
    balance: balanceOf(proposed, from, to),
    before: balanceOf(sorted, from, to),
  };
}

function aimScore(plan: PlanBlock[], from: string, to: string, aim: Aim, deficits: DeficitWeights): number {
  if (aim === "allround" || (aim === "deficits" && !deficits.length)) {
    const bal = balanceOf(plan, from, to);
    return bal.score == null ? 0 : 8 * bal.score;
  }
  // Schwerpunkte zählen nur den Hauptteil, sonst gewinnt, wer kaum Warm-up und Cool-down hat
  const main = balanceOf(plan, from, to, true);
  if (main.score == null) return 0;
  if (aim === "deficits") {
    // Allrounder: schwache Bereiche zuerst, aber die Breite bleibt im Blick
    const bal = balanceOf(plan, from, to);
    return 20 * deficits.reduce((s, d) => s + d.w * main.share[d.axis], 0) + 4 * (bal.score ?? 0);
  }
  return 30 * main.share[aim];
}

export const AIM_OPTIONS: { value: Aim; label: string }[] = [{ value: "deficits", label: "Defizite zuerst" }, { value: "allround", label: "Allround" }, ...AXES.map((a) => ({ value: a.id as Aim, label: a.name }))];

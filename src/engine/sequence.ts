/* Vorschlag einer Blockfolge: welcher Orden in welche Phase?
   Beam-Suche über alle Phasen. Punkte für: passt zur Alltagslast und Reise, Länge passt zum Orden,
   gute Nachfolge (successors), keine Wiederholung direkt hintereinander, und am Ende die Jahresbalance
   (allround) oder der Anteil eines gewählten Schwerpunkts. Vergangene und laufende Phasen bleiben. */
import { FOCI, FOCUS_BY_ID } from "../data";
import type { Focus, PlanBlock } from "../types";
import { AXES, balanceOf, focusVector, goalVector, type AxisId, type Balance } from "./balance";
import { carriesAccent } from "./kcal";
import { blockWeeks, fitScore, isTestBlock, TEST_BLOCK } from "./plan";

export type Aim = "allround" | "deficits" | AxisId;
/** Defizite aus der letzten Testwoche als Gewichte je Achse (für „Defizite zuerst“) */
export type DeficitWeights = { axis: AxisId; w: number }[];
export interface SeqItem { id: string; focusId: string; locked: boolean; reasons: string[] }
export interface SeqResult { items: SeqItem[]; balance: Balance; before: Balance }

const BEAM = 40;

export function stepScore(f: Focus, b: PlanBlock, prev: Focus | null, used: string[]): { score: number; reasons: string[] } {
  const fit = fitScore(f, b.load);
  let score = fit.score;
  const reasons = fit.reasons.filter((r) => /Reise/.test(r));
  const w = blockWeeks(b);
  if (w < f.weeks.min) {
    // Mesozyklus-Teil: vier bis sechs Wochen sind ein bewusster Akzent, kein Verstoß gegen die Empfehlung (die Einarbeitungswochen stecken in weeks.min)
    if (b.meso) reasons.push("Akzent im Mesozyklus");
    else { score -= (f.weeks.min - w) * 0.6; reasons.push(`eigentlich ab ${f.weeks.min} Wochen`); }
  }
  else if (w > f.weeks.max) { score -= (w - f.weeks.max) * 0.4; reasons.push(`eigentlich bis ${f.weeks.max} Wochen`); }
  if (prev) {
    if (prev.id === f.id) score -= 3;
    else if (prev.successors?.includes(f.id)) { score += 1.5; reasons.push(`folgt gut auf ${prev.name}`); }
  }
  if (used.includes(f.id)) score -= 0.8;
  return { score, reasons };
}

export function suggestSequence(plan: PlanBlock[], today: string, aim: Aim, deficits: DeficitWeights = [], steer: DeficitWeights = []): SeqResult {
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const from = sorted[0]?.start ?? today, to = sorted[sorted.length - 1]?.end ?? today;
  type Beam = { seq: string[]; score: number; reasons: string[][] };
  let beams: Beam[] = [{ seq: [], score: 0, reasons: [] }];
  for (const b of sorted) {
    if (isTestBlock(b)) { beams = beams.map((bm) => ({ ...bm, seq: [...bm.seq, TEST_BLOCK], reasons: [...bm.reasons, ["eigene Testwoche"]] })); continue; }
    const locked = b.start <= today && !!FOCUS_BY_ID[b.focusId];
    const next: Beam[] = [];
    // Mesozyklus-Kette: jeder Teil folgt aus den Successors des vorherigen (letzter Teil vor b.start; ausgewählter Orden bleibt erlaubt; ohne tragbare Successors alle)
    let partnerIdx = -1;
    if (!locked && b.meso) sorted.forEach((x, i) => { if (x.meso === b.meso && x.id !== b.id && x.end < b.start) partnerIdx = i; });
    for (const bm of beams) {
      const lastReal = [...bm.seq].reverse().find((x) => x !== TEST_BLOCK);
      const prev = lastReal ? FOCUS_BY_ID[lastReal] ?? null : null;
      let options = locked ? [FOCUS_BY_ID[b.focusId]] : FOCI.filter((f) => fitScore(f, b.load).score >= 0);
      if (!locked && b.meso) options = options.filter((f) => mesoPartFit(f) || f.id === b.focusId);
      // Akzent-Modus: Jeder Teil des Mesozyklus trägt die Ziel-Domäne als Hauptziel (Fallback: alle, wenn keiner passt)
      if (!locked && b.meso && b.accent) {
        const acc = options.filter((f) => carriesAccent(f, b.accent!) || f.id === b.focusId);
        if (acc.length) options = acc;
      }
      const succ = partnerIdx >= 0 && bm.seq[partnerIdx] !== TEST_BLOCK ? FOCUS_BY_ID[bm.seq[partnerIdx]] : undefined;
      if (!locked && succ) {
        const bound = options.filter((f) => succ.successors?.includes(f.id) || f.id === b.focusId);
        if (bound.length) options = bound;
      }
      for (const f of options) {
        const st = stepScore(f, b, prev, bm.seq);
        next.push({ seq: [...bm.seq, f.id], score: bm.score + (locked ? 0 : st.score), reasons: [...bm.reasons, locked ? ["läuft oder ist vorbei"] : st.reasons] });
      }
    }
    // Zwischenstand mit Balance-Anteil bewerten, damit die Suche das Ziel früh berücksichtigt
    // Ziel-Punkte einmal je Variante rechnen, nicht bei jedem Vergleich im Sortieren
    const head = sorted.slice(0, next[0]?.seq.length ?? 0);
    beams = next.map((bm) => ({ bm, v: bm.score + aimScore(head.map((x, i) => ({ ...x, focusId: bm.seq[i] })), from, to, aim, deficits, steer) }))
      .sort((a, c) => c.v - a.v).slice(0, BEAM).map((x) => x.bm);
  }
  const best = beams[0];
  const proposed = sorted.map((b, i) => ({ ...b, focusId: best?.seq[i] ?? b.focusId }));
  return {
    items: sorted.map((b, i) => ({ id: b.id, focusId: best?.seq[i] ?? b.focusId, locked: isTestBlock(b) || (b.start <= today && !!FOCUS_BY_ID[b.focusId]), reasons: best?.reasons[i] ?? [] })),
    balance: balanceOf(proposed, from, to),
    before: balanceOf(sorted, from, to),
  };
}

/** Anteil einer Achse am Zeitraum für Schwerpunkt-Ziele, mit Volumen gerechnet: Zeit-Orden (unter 35 Minuten)
    halten eine Domäne nicht allein aufrecht — dieselbe Herald-Regel wie im Akzent-Modus, hier fürs Jahresziel.
    Ihr Zielanteil zählt halbiert. Testwochen zählen neutral, Harlequin wie gehabt als Mischung. */
function axisShare(plan: PlanBlock[], from: string, to: string, axis: AxisId): number {
  let sum = 0, total = 0;
  for (const b of plan) {
    const f = FOCUS_BY_ID[b.focusId];
    if (!f) continue;
    const s = b.start > from ? b.start : from, e = b.end < to ? b.end : to;
    if (s > e) continue;
    const d = Math.round((Date.parse(e) - Date.parse(s)) / 864e5) + 1;
    total += d;
    const v = isTestBlock(b) ? 1 / AXES.length
      : f.medley?.length ? focusVector(f)[axis]
      : goalVector(f)[axis] * (carriesAccent(f, axis) ? 1 : 0.5);
    sum += v * d;
  }
  return total ? sum / total : 0;
}

export function aimScore(plan: PlanBlock[], from: string, to: string, aim: Aim, deficits: DeficitWeights, steer: DeficitWeights = []): number {
  const main = balanceOf(plan, from, to, true);
  // Rote Uhren lenken immer mit, egal welche Richtung sonst gilt: Anteil auf ihren Achsen zahlt (Stufe 1 der Eskalationsleiter)
  const steerScore = 12 * steer.reduce((s, d) => s + d.w * main.share[d.axis], 0);
  if (aim === "allround" || (aim === "deficits" && !deficits.length)) {
    const bal = balanceOf(plan, from, to);
    return (bal.score == null ? 0 : 8 * bal.score) + steerScore;
  }
  // Schwerpunkte zählen nur den Hauptteil, sonst gewinnt, wer kaum Warm-up und Cool-down hat
  if (main.score == null) return steerScore;
  if (aim === "deficits") {
    // Allrounder: schwache Bereiche zuerst, aber die Breite bleibt im Blick
    const bal = balanceOf(plan, from, to);
    return 20 * deficits.reduce((s, d) => s + d.w * main.share[d.axis], 0) + 4 * (bal.score ?? 0) + steerScore;
  }
  return 30 * axisShare(plan, from, to, aim) + steerScore;
}

export const AIM_OPTIONS: { value: Aim; label: string }[] = [{ value: "deficits", label: "Defizite zuerst" }, { value: "allround", label: "Allround" }, ...AXES.map((a) => ({ value: a.id as Aim, label: a.name }))];

/** Orden für eine Phase, beste zuerst: dieselbe Bewertung wie die Blockfolge (Last, Länge, Übergang, Wiederholung)
    plus Beitrag zur Richtung des Jahres, mit dem Rest des Plans, wie er ist. */
export function rankFor(plan: PlanBlock[], id: string, aim: Aim, deficits: DeficitWeights = [], steer: DeficitWeights = []): { f: Focus; score: number; reasons: string[] }[] {
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const b = sorted.find((x) => x.id === id);
  if (!b || isTestBlock(b)) return [];
  const from = sorted[0].start, to = sorted[sorted.length - 1].end;
  const before = sorted.filter((x) => x.start < b.start && !isTestBlock(x));
  const prev = before.length ? FOCUS_BY_ID[before[before.length - 1].focusId] ?? null : null;
  const used = sorted.filter((x) => x.id !== id && !isTestBlock(x)).map((x) => x.focusId);
  return FOCI.filter((f) => fitScore(f, b.load).score >= 0 || f.id === b.focusId)
    .map((f) => {
      const st = stepScore(f, b, prev, used);
      const reasons = [...st.reasons];
      if (steer.length) {
        // Begründung der Lenkung (Stufe 1): welche roten Achsen dieser Orden bedient
        const v = goalVector(f);
        const hit = [...new Set(steer.filter((d) => (v[d.axis] ?? 0) > 0).map((d) => AXES.find((a) => a.id === d.axis)?.name ?? d.axis))];
        if (hit.length) reasons.unshift(`hält rote Uhren: ${hit.join(", ")}`);
      }
      if (fitScore(f, b.load).score >= 0) reasons.unshift("passt zur Alltagslast");
      if (aim !== "allround" && aim !== "deficits" && goalVector(f)[aim] > 0 && !carriesAccent(f, aim))
        reasons.push(`trägt ${AXES.find((a) => a.id === aim)?.name} nur gedimpt — zu kurze Einheiten`);
      const score = st.score + aimScore(sorted.map((x) => (x.id === id ? { ...x, focusId: f.id } : x)), from, to, aim, deficits, steer);
      return { f, score, reasons };
    })
    .sort((x, y) => y.score - x.score);
}

/** Passt ein Orden in einen Mesozyklus-Teil? Fixe Längen über sechs Wochen (Monk: 12/12) lassen sich nicht als Akzent verkürzen — die Dosis bricht. Ordensreihen mit Spiel (etwa Slayer, 10–15) bleiben bewusste Akzente. */
export const mesoPartFit = (f: Focus) => !(f.weeks.min === f.weeks.max && f.weeks.min > 6);

/** Alltags-Anbindung (Baustein „Alltags“): Bei hoher Alltagslast passen kürzere Orden besser in die Woche,
    bei niedriger Last darf es der zeithungrige sein (Slayer 60, Smith 60). Zusatzpunkte, kein Filter —
    fitScore (load_fit) prüft ohnehin, ob der Orden die Last aushält. */
export function timeBias(b: PlanBlock, f: Focus): number {
  if (b.load === "high" && f.session_min <= 45) return 1;
  if (b.load === "low" && f.session_min >= 50) return 1;
  return 0;
}

/** Frisch angelegter Mesozyklus (newMeso in stack.ts): Teil 1 nach Empfehlung, jeder weitere aus den Successors
    des vorherigen — bester zuerst, sonst die beste Alternative. Rote Uhren (steer) ordnen die Kandidaten,
    die Ketten-Bindung bleibt. Akzent-Modus (accent je Teil): Jeder Teil trägt die Ziel-Domäne als Hauptziel,
    die Orden rotieren (carriesAccent; ohne tragbare Kandidaten gilt die beste Alternative — Warnung statt Sperre).
    Die Alltagslast ordnet mit: kurze Orden bei hoher Last, zeithungrige bei niedriger. */
export function fillMeso(p: PlanBlock[], aim: Aim, deficits: DeficitWeights = [], steer: DeficitWeights = []): PlanBlock[] {
  const parts = p.filter((x) => x.meso).sort((a, b) => a.start.localeCompare(b.start));
  let out = p, prev: Focus | undefined;
  for (const part of parts) {
    let ranked = rankFor(out, part.id, aim, deficits, steer)
      .filter((r) => mesoPartFit(r.f))
      .map((r) => ({ ...r, score: r.score + timeBias(part, r.f) }));
    if (part.accent) {
      const acc = ranked.filter((r) => carriesAccent(r.f, part.accent!));
      if (acc.length) ranked = acc;
    }
    const top = prev ? ranked.find((r) => prev!.successors?.includes(r.f.id)) ?? ranked[0] : ranked[0];
    if (!top) break;
    out = out.map((x) => (x.id === part.id ? { ...x, focusId: top.f.id } : x));
    prev = top.f;
  }
  return out;
}

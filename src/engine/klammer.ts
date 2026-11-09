/* Klammern (seit 1.0): Eine kleine Handvoll übergeordneter Ziel-Klammern hält das Leitziel über 8–16 Wochen,
   die Orden darin liefern die Variation. Drei Ebenen: Lebensabschnitte (Zeit und Alltagslast, gehören dem Nutzer) →
   Klammern (Leitziel, Kalorien, Testwoche am Ende) → Orden (1–3 je Klammer nach Länge).
   - Platzierung: Klammern rasten an Abschnittsgrenzen ein, mit ±1–2 Wochen Spielraum; sie dürfen Abschnitte
     überspannen, ein langer Abschnitt trägt zwei.
   - Ordenswahl: Zielbindung (trägt der Orden die Leitachse), Variation (anderer Orden als zuvor), Verlauf
     (Aufbau früh, Umwandlung und Zuspitzung spät — kuratiert in klammern.json).
   - Kalorien je Klammer, Rangfolge: Last (kein Defizit bei hoher Last oder Dauerlast) → Kalender (Winter
     Überschuss, Sommer Defizit) → Reise (Erhaltung, kohlenhydratbetont) → Grundmodus der Klammer.
   - Pins: Was der Nutzer von Hand setzt (Orden, Kalorien, Klammer-Art), bleibt beim Neuplanen stehen.
   Technisch ist eine Klammer eine Gruppe von Phasen mit gemeinsamer `meso`-Id und `klammer`-Art. */
import { FOCI, FOCUS_BY_ID, KLAMMERN, KLAMMER_BY_ID } from "../data";
import type { AxisId, Focus, Kcal, KlammerDef, KlammerId, Load, PlanBlock, Section } from "../types";
import { DEFAULT_TEST_POLICY } from "../types";
import { goalVector } from "./balance";
import { primaryAxis } from "./kcal";
import { addDays, fitScore, isTestBlock, mondayOf, parseIso, TEST_BLOCK } from "./plan";
import { loadOfWindow, setTestWeek, testAfter, travelOfWindow } from "./stack";
import { timeBias, type Aim, type DeficitWeights } from "./sequence";

/** Länge einer Klammer in Wochen, Testwoche eingeschlossen */
/** Kalender: Winter (Aufbau, Überschuss) und Sommer (Defizit-Fenster) */
const WINTER = [11, 12, 1], SUMMER = [5, 6, 7, 8];
export const KL_MIN = 8, KL_MAX = 16, KL_TARGET = 13;
/** Dauerlast: So viele Wochen mittlere oder hohe Last am Stück, und mittlere Last zählt als hohe */
export const DAUERLAST_WEEKS = 8;

const byStart = <T extends { start: string }>(x: T[]): T[] => [...x].sort((a, b) => a.start.localeCompare(b.start));
const weeksLeft = (a: string, b: string) => Math.floor(((parseIso(b).getTime() - parseIso(a).getTime()) / 864e5 + 1) / 7);
const monthOf = (iso: string) => parseIso(iso).getMonth() + 1;
/** Anteil der Wochen eines Fensters, die in den genannten Monaten liegen (Saison nach Anteil statt nach Fenstermitte) */
export const monthShare = (a: string, b: string, months: number[]) => {
  let n = 0, hit = 0;
  for (let d = a; d <= b; d = addDays(d, 7)) { n++; if (months.includes(monthOf(d))) hit++; }
  return n ? hit / n : 0;
};
const midOf = (a: string, b: string) => addDays(a, Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 864e5 / 2));

/** Anzeigename eines Zeichens mit Stichwort: „Bär · Masse“ (die Tiere allein verraten weniger als die Ordensnamen) */
export const klammerName = (id: KlammerId | undefined) => {
  const k = id ? KLAMMER_BY_ID[id] : undefined;
  return k ? `${k.name} · ${k.tag}` : id ?? "";
};

/* ---------- Last je Woche, mit Dauerlast ---------- */

/** Effektive Alltagslast je Woche (Montag → Last): Abschnittslast, mittlere Last wird nach DAUERLAST_WEEKS Wochen
    ohne ruhigen Abschnitt zur hohen. Ohne Abschnitte: leer (dann gilt die Last der Phase). */
export function effectiveLoads(sections: Section[] | undefined): Map<string, Load> {
  const out = new Map<string, Load>();
  // Dauerlast zählt nur zusammenhängende Wochen mittlerer Last: Hohe Last ist ohnehin hoch, niedrige setzt zurück.
  // (Modelljahre 1.3: Mit hoher Last im Zähler wurde jede Semesterpause zur Dauerlast — Defizite waren nie planbar.)
  let run = 0;
  for (const s of byStart(sections ?? [])) {
    for (let d = mondayOf(s.start); d <= s.end; d = addDays(d, 7)) {
      run = s.load === "medium" ? run + 1 : 0;
      out.set(d, s.load === "medium" && run > DAUERLAST_WEEKS ? "high" : s.load);
    }
  }
  return out;
}

/** Ist das Fenster überwiegend (mehr als die Hälfte der Wochen) effektiv hoch belastet? */
export function hasHighLoad(eff: Map<string, Load>, start: string, end: string, fallback: Load): boolean {
  if (!eff.size) return fallback === "high";
  let hi = 0, n = 0;
  for (let d = mondayOf(start); d <= end; d = addDays(d, 7)) { n++; if (eff.get(d) === "high") hi++; }
  return n > 0 && hi * 2 > n;
}

/* ---------- Platzierung ---------- */

export interface Window { start: string; end: string; weeks: number }

/** Klammer-Fenster ab `from` bis `endOf`: Schnitte möglichst auf Abschnittsgrenzen (±2 Wochen Spielraum),
    Längen 8–16 Wochen, Ziel um 13. Kürzer als 8 Wochen: ein einziges Fenster. */
export function placeWindows(sections: Section[], from: string, endOf: string): Window[] {
  const N = weeksLeft(from, endOf);
  if (N <= 0) return [];
  if (N < KL_MIN) return [{ start: from, end: addDays(from, 7 * N - 1), weeks: N }];
  const bounds = [...new Set(byStart(sections).map((s) => Math.round((parseIso(mondayOf(s.start)).getTime() - parseIso(from).getTime()) / (7 * 864e5))).filter((i) => i > 0 && i < N))];
  const cut = (j: number) => {
    if (j === N) return 0;
    const d = bounds.length ? Math.min(...bounds.map((b) => Math.abs(b - j))) : 99;
    return d === 0 ? 0 : d <= 2 ? d * 0.8 : 3;
  };
  const dp: number[] = Array(N + 1).fill(Infinity);
  const back: number[] = Array(N + 1).fill(-1);
  dp[0] = 0;
  for (let j = KL_MIN; j <= N; j++) {
    for (let L = KL_MIN; L <= KL_MAX; L++) {
      const i = j - L;
      if (i < 0 || dp[i] === Infinity) continue;
      const c = dp[i] + cut(j) + Math.abs(L - KL_TARGET) * 0.25;
      if (c < dp[j]) { dp[j] = c; back[j] = i; }
    }
  }
  const out: Window[] = [];
  for (let j = N; j > 0 && back[j] >= 0; j = back[j]) {
    const i = back[j];
    out.unshift({ start: addDays(from, 7 * i), end: addDays(from, 7 * j - 1), weeks: j - i });
  }
  return out;
}

/* ---------- Art der Klammer ---------- */

export interface KindCtx { aim: Aim; deficits: DeficitWeights; steer: DeficitWeights; prev?: KlammerId; used: KlammerId[]; pool?: string[]; aims?: AimPrio[] }

/** Punkte für eine Klammer-Art in einem Fenster: Richtung des Jahres, Saison, Last, Reise, rote Uhren, Abwechslung */
export function kindScore(k: KlammerDef, load: Load, travel: boolean, win: { start: string; end: string }, ctx: KindCtx): number {
  let s = 0;
  // Ohne einen Orden, der das Ziel trägt und zur Last passt, bleibt das Zeichen leer (Falke in Hochlast: kein Schnellkraft-Orden)
  const carriers = candidates(ctx.pool).filter((f) => fitScore(f, load).score >= 0 && bindOf(f, k) === "lead").length;
  if (carriers === 0) s -= 10; // praktisch ausgeschlossen: ein Zeichen ohne Träger ist leer, auch wenn es Ziel Nr. 1 ist
  const { aim } = ctx;
  const lead = (a: AxisId) => (k.axes.includes(a) ? 1 : k.accept.includes(a) ? 1 / 3 : 0);
  if (ctx.aims?.length) {
    // Mehrere Ziele mit Priorität: 1 zählt dreifach, 2 doppelt, 3 einfach
    for (const a of ctx.aims) s += (4 - a.prio) * lead(a.aim);
  } else if (aim !== "allround" && aim !== "deficits") s += 3 * lead(aim);
  if (aim === "deficits") s += ctx.deficits.reduce((a, d) => a + d.w * (k.axes.includes(d.axis) ? 2 : k.accept.includes(d.axis) ? 1 : 0), 0);
  s += 1.2 * monthShare(win.start, win.end, k.months);
  // Kalender: Im Sommer ohne hohe Last ist Zeit für ein Defizit — Zeichen, die eins tragen können, rücken vor
  if (k.deficitOk && load !== "high") s += 1.5 * monthShare(win.start, win.end, SUMMER);
  if (load === "high" && k.id === "regeneration") s += 1;
  if (load === "low" && (k.id === "muskel" || k.id === "kraft")) s += 0.5;
  if (travel) s += k.travel ? 1.5 : -2;
  s += 0.8 * ctx.steer.filter((d) => k.axes.includes(d.axis)).length;
  const top = ctx.aims?.find((a) => a.prio === 1)?.aim ?? (aim !== "allround" && aim !== "deficits" ? aim : undefined);
  if (ctx.prev === k.id) s -= top && k.axes.includes(top) ? 1 : 2.5;
  s -= 0.6 * ctx.used.filter((u) => u === k.id).length;
  // Zwei Überschuss-Zeichen im Jahr reichen für Hypertrophie (Grundsatz: zwei Aufbaublöcke); ein drittes rückt deutlich zurück
  if (k.kcal === "surplus" && ctx.used.filter((u) => KLAMMER_BY_ID[u]?.kcal === "surplus").length >= 2) s -= 3;
  return s;
}

/* ---------- Orden in der Klammer ---------- */

/** Ein Jahresziel mit Priorität (1 = wichtigstes) */
export interface AimPrio { aim: AxisId; prio: 1 | 2 | 3 }

export type Bind = "lead" | "accept" | "none";
/** Zielbindung eines Ordens an die Klammer: trägt er die Leitachse (lead), eine Nebenachse (accept) oder keine? */
export function bindOf(f: Focus, k: KlammerDef): Bind {
  const p = primaryAxis(f);
  // Herald-Regel: Zeit-Orden unter 35 Minuten tragen eine Leitachse nicht über einen ganzen Teil
  if (p && k.axes.includes(p)) return f.session_min >= 35 ? "lead" : "accept";
  if (p && k.accept.includes(p)) return "accept";
  const v = goalVector(f);
  return k.axes.some((a) => (v[a] ?? 0) > 0) ? "accept" : "none";
}

/** Jahresziele als Liste: mehrere mit Priorität, sonst das eine Ziel als Priorität 1 */
export const aimsOf = (aim: Aim, aims?: AimPrio[]): AimPrio[] => aims?.length ? aims : aim !== "allround" && aim !== "deficits" ? [{ aim, prio: 1 }] : [];

/** Stelle im Verlauf: erster Teil früh, letzter spät, dazwischen mittig */
export const posOf = (i: number, n: number): "early" | "mid" | "late" | "single" => (n === 1 ? "single" : i === 0 ? "early" : i === n - 1 ? "late" : "mid");

/** Punkte eines Ordens für einen Teil der Klammer */
export function orderScore(f: Focus, k: KlammerDef, b: PlanBlock, pos: ReturnType<typeof posOf>, prev: Focus | undefined, usedInK: string[], usedBefore: string[], steer: DeficitWeights, aims: AimPrio[] = []): number {
  const bind = bindOf(f, k);
  let s = bind === "lead" ? 3 : bind === "accept" ? 1.2 : 0;
  if ((pos === "early" || pos === "single") && k.early.includes(f.id)) s += 1.5;
  if ((pos === "late" || pos === "single") && k.late.includes(f.id)) s += pos === "single" ? 0.8 : 1.5;
  if (pos === "mid" && (k.early.includes(f.id) || k.late.includes(f.id))) s += 0.6;
  if (prev?.id === f.id) s -= 5;
  if (usedInK.includes(f.id)) s -= 4;
  // Abwechslung übers Jahr: jede frühere Verwendung im letzten Jahr kostet (Troubadour war in Modelljahren Lückenfüller)
  s -= 0.7 * usedBefore.filter((x) => x === f.id).length;
  if (prev?.successors?.includes(f.id)) s += 0.5;
  s += 0.5 * timeBias(b, f);
  const v = goalVector(f);
  if (steer.some((d) => (v[d.axis] ?? 0) > 0)) s += 0.4;
  // Mitläufer eines Zeichens (early/late) rücken vor, wenn ihr Hauptziel ein Jahresziel ist (Dancer im Fuchs bei Ziel Beweglichkeit).
  // Nur kuratierte Mitläufer: Fremde Orden verwässern das Zeichen nicht.
  const p = primaryAxis(f);
  const aimHit = aims.find((a) => a.aim === p && !k.axes.includes(a.aim));
  if (aimHit && f.session_min >= 35 && (k.early.includes(f.id) || k.late.includes(f.id))) s += 4 - aimHit.prio;
  // Zeit-Orden (Herald, unter 35 Minuten): wählbar, aber nie Vorschlag — für Wochen mit wenig Zeit wählt man ihn bewusst
  if (f.session_min < 35) s -= 3;
  return s;
}

/** Darf der Orden diesen Teil tragen? Last muss passen; Orden mit fester Länge über sechs Wochen (Monk) brechen verkürzt. */
export function orderFits(f: Focus, b: PlanBlock, weeks: number): boolean {
  if (f.id === TEST_BLOCK || fitScore(f, b.load).score < 0) return false;
  if (f.weeks.min === f.weeks.max && f.weeks.min > 6 && weeks < f.weeks.min) return false;
  return true;
}

/** Kandidaten für einen Teil, beste zuerst (für Assistent und Phasenblatt) */
export function rankInKlammer(plan: PlanBlock[], id: string, pool?: string[], steer: DeficitWeights = [], aims: AimPrio[] = []): { f: Focus; score: number; bind: Bind }[] {
  const b = plan.find((x) => x.id === id);
  if (!b?.klammer || !b.meso) return [];
  const k = KLAMMER_BY_ID[b.klammer];
  const parts = byStart(plan.filter((x) => x.meso === b.meso && !isTestBlock(x)));
  const i = parts.findIndex((x) => x.id === id);
  // Vorgänger: der Teil davor, beim ersten Teil der letzte Orden vor der Klammer (dieselbe Bewertung wie planYear)
  const before = byStart(plan).filter((x) => x.end < b.start && !isTestBlock(x));
  const prev = i > 0 ? FOCUS_BY_ID[parts[i - 1].focusId] : FOCUS_BY_ID[before[before.length - 1]?.focusId ?? ""];
  const kStart = parts[0].start;
  const usedBefore = yearBefore(plan, kStart);
  // Nur die Teile davor zählen als „schon gewählt“ — wie beim Planen, das vorne beginnt
  const usedInK = parts.slice(0, i).map((x) => x.focusId);
  const weeks = weeksLeft(b.start, b.end);
  return candidates(pool)
    .filter((f) => orderFits(f, b, weeks) || f.id === b.focusId)
    .map((f) => ({ f, bind: bindOf(f, k), score: orderScore(f, k, b, posOf(i, parts.length), prev, usedInK, usedBefore, steer, aims) }))
    .sort((x, y) => y.score - x.score);
}

/** Orden im Jahr vor einem Datum (ohne Testwochen) — Grundlage für die Abwechslung übers Jahr */
const yearBefore = (plan: PlanBlock[], at: string) => plan.filter((x) => !isTestBlock(x) && x.focusId && x.end < at && x.start >= addDays(at, -365)).map((x) => x.focusId);

const candidates = (pool?: string[]) => (pool?.length ? FOCI.filter((f) => pool.includes(f.id)) : FOCI).filter((f) => f.id !== TEST_BLOCK);

/* ---------- Kalorien je Klammer ---------- */

/** Kalorien-Modus einer Klammer mit Begründung. Rangfolge: Last → Kalender → Reise → Grundmodus. */
export function kcalOfKlammer(k: KlammerDef, start: string, end: string, eff: Map<string, Load>, load: Load, travel: boolean): { mode: Kcal; why: string } {
  let mode: Kcal = k.kcal, why = `Grundmodus: ${k.name} · ${k.tag}`;
  if (monthShare(start, end, WINTER) >= 0.5 && (k.id === "muskel" || k.id === "kraft")) { mode = "surplus"; why = "Winter: Aufbau mit Überschuss"; }
  if (monthShare(start, end, SUMMER) >= 0.4 && k.deficitOk) { mode = "deficit"; why = "Sommer: Defizit-Fenster"; }
  if (travel) { mode = mode === "surplus" ? "surplus" : "maintenance"; why = "Reise: Erhaltung, kohlenhydratbetont"; }
  // Last zuerst — aber je Orden: Ein Defizit-Zeichen hält in Teilen mit hoher Last oder Dauerlast nur Erhaltung
  if (mode === "deficit" && hasHighLoad(eff, start, end, load)) { mode = "maintenance"; why = "Hohe Last oder Dauerlast: kein Defizit"; }
  else if (mode === "deficit") why += " — Teile mit hoher Last bleiben auf Erhaltung";
  return { mode, why };
}

/* ---------- Jahr planen ---------- */

export interface PlanYearOpts {
  aim: Aim;
  deficits?: DeficitWeights;
  steer?: DeficitWeights;
  testPolicy?: "each" | "twice" | "none";
  pool?: string[];
  /** Mehrere Jahresziele mit Priorität 1–3 (ersetzt `aim`, wenn gesetzt) */
  aims?: AimPrio[];
  /** Klammer-Art je Fenster (Index), von Hand gewählt im Assistenten */
  kinds?: Partial<Record<number, KlammerId>>;
}

/** Plant alles hinter der laufenden Phase: Fenster → Klammer-Art → Teile → Orden → Kalorien → Testwochen.
    Gepinnte Entscheidungen alter Phasen (Orden, Kalorien, Klammer-Art) werden auf die neuen Phasen übertragen,
    die zeitlich an ihrer Stelle liegen. */
export function planYear(plan: PlanBlock[], sections: Section[], today: string, newId: () => string, opts: PlanYearOpts): PlanBlock[] {
  const { aim, deficits = [], steer = [], testPolicy = DEFAULT_TEST_POLICY, pool } = opts;
  const aimList = aimsOf(aim, opts.aims);
  const sorted = byStart(plan);
  // Eine laufende Klammer bleibt ganz (alle Teile und ihre Testwoche); alles danach wird neu geplant
  const running = new Set(sorted.filter((b) => b.start <= today && b.meso).map((b) => b.meso!));
  const runningTests = new Set(sorted.filter((b) => b.meso && running.has(b.meso)).map((b) => testAfter(sorted, b)?.id).filter(Boolean));
  const keep = (b: PlanBlock) => b.start <= today || (!!b.meso && running.has(b.meso)) || runningTests.has(b.id);
  const future = sorted.filter((b) => !keep(b));
  const kept = sorted.filter(keep);
  const keptEnd = kept.length ? kept.reduce((m, b) => (b.end > m ? b.end : m), kept[0].end) : null;
  const secs = byStart(sections);
  const from = keptEnd ? addDays(keptEnd, 1) : secs[0] && secs[0].start > mondayOf(today) ? mondayOf(secs[0].start) : mondayOf(today);
  const endOf = secs.length ? secs[secs.length - 1].end : addDays(from, 7 * 52 - 1);
  const eff = effectiveLoads(secs);
  const pinsAt = (iso: string) => future.find((b) => b.pin && b.start <= iso && iso <= b.end && !isTestBlock(b));

  const windows = placeWindows(secs, from, endOf);
  let out: PlanBlock[] = [...kept];
  const keptKinds = kept.filter((b) => b.klammer).map((b) => b.klammer!);
  const ctx: KindCtx = { aim, deficits, steer, prev: keptKinds[keptKinds.length - 1], used: [...keptKinds], pool, aims: opts.aims };
  let prevF: Focus | undefined = FOCUS_BY_ID[[...kept].reverse().find((b) => !isTestBlock(b))?.focusId ?? ""];
  let usedBefore: string[] = yearBefore(kept, from);

  windows.forEach((w, wi) => {
    const load = loadOfWindow(secs, w.start, w.end);
    const travel = travelOfWindow(secs, w.start, w.end);
    const mid = midOf(w.start, w.end);
    const pinnedKind = pinsAt(mid)?.pin?.klammer ? pinsAt(mid)!.klammer : undefined;
    const forced = opts.kinds?.[wi] ?? pinnedKind;
    const k = forced ? KLAMMER_BY_ID[forced] : [...KLAMMERN].sort((a, b) => kindScore(b, load, travel, w, ctx) - kindScore(a, load, travel, w, ctx))[0];
    ctx.prev = k.id; ctx.used.push(k.id);

    const test = testPolicy !== "none" && w.weeks >= 5;
    const T = w.weeks - (test ? 1 : 0);
    const n = T <= 8 ? 1 : T <= 12 ? 2 : 3;
    const base = Math.floor(T / n), rem = T % n;
    const meso = newId();
    const kc = kcalOfKlammer(k, w.start, w.end, eff, load, travel);
    const usedInK: string[] = [];
    let at = w.start;
    for (let i = 0; i < n; i++) {
      const weeks = base + (i < rem ? 1 : 0);
      const end = addDays(at, 7 * weeks - 1);
      const b: PlanBlock = { id: newId(), focusId: "", label: "", start: at, end, load: loadOfWindow(secs, at, end), travel: travelOfWindow(secs, at, end), meso, klammer: k.id, accent: k.axes[0], kcal: kc.mode };
      if (forced) b.pin = { klammer: true };
      const pinned = pinsAt(midOf(at, end));
      if (pinned?.pin?.focus && FOCUS_BY_ID[pinned.focusId]) { b.focusId = pinned.focusId; b.pin = { ...b.pin, focus: true }; }
      if (b.kcal === "deficit" && hasHighLoad(eff, b.start, b.end, b.load)) b.kcal = "maintenance";
      if (pinned?.pin?.kcal && pinned.kcal) { b.kcal = pinned.kcal; b.pin = { ...b.pin, kcal: true }; }
      if (!b.focusId) {
        const best = candidates(pool)
          .filter((f) => orderFits(f, b, weeks))
          .map((f) => ({ f, s: orderScore(f, k, b, posOf(i, n), prevF, usedInK, usedBefore, steer, aimList) }))
          .sort((x, y) => y.s - x.s)[0];
        if (best) b.focusId = best.f.id;
      }
      out.push(b);
      if (b.focusId) { usedInK.push(b.focusId); prevF = FOCUS_BY_ID[b.focusId]; }
      at = addDays(end, 1);
    }
    if (test) out.push({ id: newId(), focusId: TEST_BLOCK, label: "Testwoche", start: at, end: addDays(at, 6), load, travel: false });
    usedBefore = [...usedBefore, ...usedInK];
  });

  // Zweimal im Jahr: die mittlere und die letzte Testwoche bleiben, die anderen gehen an die Phase davor zurück
  if (testPolicy === "twice") {
    const tests = byStart(out).filter((b) => isTestBlock(b) && b.start >= from);
    if (tests.length > 2) {
      const last = tests[tests.length - 1];
      const target = midOf(tests[0].start, last.end);
      const half = tests.slice(0, -1).sort((a, b) => Math.abs(parseIso(a.end).getTime() - parseIso(target).getTime()) - Math.abs(parseIso(b.end).getTime() - parseIso(target).getTime()))[0];
      for (const t of tests) {
        if (t.id === last.id || t.id === half.id) continue;
        const part = out.find((x) => !isTestBlock(x) && testAfter(out, x)?.id === t.id);
        if (part) out = setTestWeek(out, part.id, false, "");
      }
    }
  }
  return out;
}

/* ---------- Lesen: Klammern im Plan ---------- */

export interface KlammerView { meso: string; kind: KlammerId; start: string; end: string; parts: PlanBlock[]; test?: PlanBlock; kcal?: Kcal }

/** Klammern im Plan, nach Start sortiert (Teile mit gemeinsamer meso-Id und klammer-Art, Testwoche direkt dahinter) */
export function klammernOf(plan: PlanBlock[]): KlammerView[] {
  const groups = new Map<string, PlanBlock[]>();
  for (const b of plan) if (b.meso && b.klammer && !isTestBlock(b)) groups.set(b.meso, [...(groups.get(b.meso) ?? []), b]);
  return [...groups.entries()].map(([meso, ps]) => {
    const parts = byStart(ps);
    const last = parts[parts.length - 1];
    const test = testAfter(plan, last);
    return { meso, kind: parts[0].klammer!, start: parts[0].start, end: test?.end ?? last.end, parts, test, kcal: parts[0].kcal };
  }).sort((a, b) => a.start.localeCompare(b.start));
}

/** Warnzeichen einer Phase als Codes statt Sätzen (das UI zeigt Symbole, der Text steht im Phasenblatt) */
export type Flag = "off-goal" | "kcal-load" | "kcal-goal";
export function flagsOf(b: PlanBlock, sections?: Section[]): Flag[] {
  const f = FOCUS_BY_ID[b.focusId];
  if (!f || isTestBlock(b)) return [];
  const out: Flag[] = [];
  if (b.klammer && bindOf(f, KLAMMER_BY_ID[b.klammer]) === "none") out.push("off-goal");
  if (b.kcal === "deficit" && hasHighLoad(effectiveLoads(sections), b.start, b.end, b.load)) out.push("kcal-load");
  if (b.kcal === "deficit" && (f.nutrition === "surplus" || primaryAxis(f) === "muskel")) out.push("kcal-goal");
  return out;
}

export const FLAG_TEXT: Record<Flag, string> = {
  "off-goal": "Trägt das Ziel des Zeichens nicht",
  "kcal-load": "Defizit bei hoher Last oder Dauerlast",
  "kcal-goal": "Defizit gegen das Ziel des Ordens",
};

/** Achse → Klammer, die sie als Leitachse trägt (für Hinweise) */
export const klammerForAxis = (a: AxisId): KlammerDef | undefined => KLAMMERN.find((k) => k.axes.includes(a));

/** Warum ein Zeichen so geschnitten ist (für den Assistenten): wo es endet und warum es so viele Orden hat */
export function whyCut(k: KlammerView, sections: Section[]): string {
  const next = addDays(k.end, 1);
  const secs = byStart(sections);
  const wk = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / (7 * 864e5));
  let end: string;
  const at = secs.find((x) => x.start === next);
  if (at || !secs.some((x) => x.start <= k.end && x.end >= next)) end = at ? `Endet, wo „${at.name}“ beginnt.` : "Endet mit dem geplanten Jahr.";
  else {
    const near = secs.filter((x) => x.start > k.start).map((x) => ({ x, d: wk(x.start, next) })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
    const inside = secs.find((x) => x.start < next && next <= x.end)!;
    end = near && Math.abs(near.d) <= 2
      ? `Endet ${Math.abs(near.d)} ${Math.abs(near.d) === 1 ? "Woche" : "Wochen"} ${near.d > 0 ? "nach" : "vor"} dem Beginn von „${near.x.name}“ — so passen die Längen der Zeichen besser (8–16 Wochen, Ziel etwa 13).`
      : `Teilt „${inside.name}“: zu lang für ein Zeichen (höchstens 16 Wochen).`;
  }
  const train = k.parts.reduce((n, p) => n + wk(p.start, addDays(p.end, 1)), 0);
  const n = k.parts.length;
  return `${end} ${n} ${n === 1 ? "Orden" : "Orden"}, weil ${train} Trainingswochen (bis 8 einer, bis 12 zwei, darüber drei).`;
}

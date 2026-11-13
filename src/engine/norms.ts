/* Auswertung der Testwoche gegen Normen. Die Normen selbst stehen in data/modules/norms.json. */
import { who5For } from "./who5";
import { DOMAINS, FOCI, NORMS, TESTWEEK } from "../data";
import type { AppState, Focus, TestDef, TestResult } from "../types";

export { ageAt, findNorm, normScore, normValue, oneRmFrom5, type NormResult } from "./normcore";
import { ageAt, findNorm, normScore, type NormResult } from "./normcore";

/* ---------- Auswertung eines Blocks ---------- */
const TEST_BY_ID: Record<string, TestDef> = Object.fromEntries([...TESTWEEK.cups.flatMap((c) => c.tests), ...(TESTWEEK.retired ?? [])].map((t) => [t.id, t]));

export interface TestEval {
  test: TestDef;
  result: TestResult;
  prev: TestResult | null;
  /** Veränderung zum letzten Test, gemessen am Messfehler. null ohne Vergleich */
  change: "better" | "same" | "worse" | null;
  norm: NormResult | null;
  /** Warum keine Norm */
  why?: string;
}
export interface DomainEval {
  id: string; name: string; score: number | null; tests: TestEval[];
  /** Schätzung (1.14), wenn der Bereich selbst keine belastbare Norm hat: aus verwandten Tests mit Norm, breite Spanne */
  estimate?: { score: number; from: string[] };
}

/** Verwandte Tests für Bereiche ohne belastbare Norm. Seit 1.47 leer: Maximalkraft liest die App laufend aus dem Log
    (fitness.ts), die Schätzung aus Klimmzügen, Liegestützen und Sprung fällt mit diesen Tests weg. */
const ESTIMATE_FROM: Record<string, string[]> = {};
export interface Evaluation {
  domains: DomainEval[];
  weakest: DomainEval | null;
  suggestions: Focus[];
  who5: number | null;
  missingProfile: boolean;
}

/** Bester Wert eines Tests in einem Block (bei mehreren Einträgen). */
function bestOf(list: TestResult[], t: TestDef): TestResult | null {
  if (!list.length) return null;
  return list.reduce((a, b) => (t.better === "higher" ? (b.value > a.value ? b : a) : b.value < a.value ? b : a));
}

export function evaluateBlock(state: AppState, blockId: string): Evaluation {
  const { sex, birthYear } = state.user;
  // Einsteiger: nur der eigene Verlauf, kein Vergleich mit Normen
  const beginner = state.user.level === "einsteiger";
  const missingProfile = !beginner && (!sex || !birthYear);
  const bwList = (state.tests["t-bodyweight"] ?? []).filter((r) => r.blockId === blockId);
  const allBw = state.tests["t-bodyweight"] ?? [];
  const bodyweight = (bwList[bwList.length - 1] ?? allBw[allBw.length - 1])?.value ?? null;

  const domains: DomainEval[] = DOMAINS.map((d) => {
    const tests: TestEval[] = [];
    for (const id of d.tests) {
      const t = TEST_BY_ID[id];
      if (!t) continue;
      const hist = state.tests[id] ?? [];
      const result = bestOf(hist.filter((r) => r.blockId === blockId), t);
      if (!result) continue;
      const earlier = hist.filter((r) => r.blockId !== blockId && r.date < result.date && (r.variant ?? null) === (result.variant ?? null));
      const prevBlock = earlier.length ? earlier[earlier.length - 1].blockId : null;
      const prev = prevBlock ? bestOf(earlier.filter((r) => r.blockId === prevBlock), t) : null;
      const diff = prev ? (t.better === "higher" ? result.value - prev.value : prev.value - result.value) : 0;
      const change = prev ? (Math.abs(diff) <= (t.swc ?? 0) ? "same" : diff > 0 ? "better" : "worse") : null;
      const n = beginner ? null : findNorm(id, result.variant, sex, ageAt(birthYear, result.date));
      let norm: NormResult | null = null;
      let why: string | undefined;
      if (n) {
        norm = normScore(n, result.value, bodyweight);
        if (!norm && n.conv === "rel1rm") why = "Körpergewicht fehlt (Balmung-Cup)";
      } else if (beginner) why = undefined;
      else if (missingProfile) why = "Geburtsjahr und Geschlecht fehlen (Setup)";
      else if (t.variants && !result.variant) why = "Variante nicht angegeben";
      else why = NORMS.some((x) => x.test === id) ? "keine Norm für Alter oder Geschlecht" : "nur Verlauf";
      tests.push({ test: t, result, prev, change, norm, why });
    }
    const scored = tests.map((x) => x.norm).filter((x): x is NormResult => !!x && !x.noScore);
    const score = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : null;
    return { id: d.id, name: d.name, score, tests };
  });

  // Schätzungen für Bereiche ohne Punkte (z. B. Maximalkraft an der Maschine)
  const byTest = new Map(domains.flatMap((d) => d.tests).map((t) => [t.test.id, t]));
  for (const d of domains) {
    const src = ESTIMATE_FROM[d.id];
    if (d.score != null || !src) continue;
    const used = src.map((id) => byTest.get(id)).filter((t): t is TestEval => !!t?.norm && !t.norm.noScore);
    if (used.length) d.estimate = { score: Math.round(used.reduce((a, t) => a + t.norm!.score, 0) / used.length), from: used.map((t) => t.test.name) };
  }
  const scoredDomains = domains.filter((d) => d.score != null);
  const weakest = scoredDomains.length >= 2 ? scoredDomains.reduce((a, b) => (b.score! < a.score! ? b : a)) : null;
  const who5 = who5For(state, state.plan.find((b) => b.id === blockId), blockId);

  // Vorschlag: niedriges Wohlbefinden zuerst, sonst die schwächste Domäne
  const goal = who5 != null && who5 < 52 ? "wellbeing" : weakest ? DOMAINS.find((d) => d.id === weakest.id)!.goal : null;
  const suggestions = goal
    ? FOCI.filter((f) => f.goals.primary !== "test")
        .map((f) => ({ f, pts: (f.goals.primary === goal ? 2 : 0) + (f.goals.secondary.includes(goal) ? 1 : 0) }))
        .filter((x) => x.pts > 0)
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 3)
        .map((x) => x.f)
    : [];
  return { domains, weakest, suggestions, who5, missingProfile };
}

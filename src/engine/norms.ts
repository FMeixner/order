/* Auswertung der Testwoche gegen Normen. Die Normen selbst stehen in data/modules/norms.json. */
import { DOMAINS, FOCI, NORMS, TESTWEEK } from "../data";
import type { AppState, Focus, Norm, TestDef, TestResult } from "../types";

export interface NormResult { score: number; label: string; tier: "A" | "B"; src: string; noScore?: boolean }

/** Geschätztes 1RM aus 5RM (Epley): 1RM = 5RM × (1 + 5/30) */
export const oneRmFrom5 = (w: number) => w * (1 + 5 / 30);

export function ageAt(birthYear: number | null | undefined, date: string): number | null {
  if (!birthYear) return null;
  return parseInt(date.slice(0, 4)) - birthYear;
}

/** Passende Norm für Test, Variante, Geschlecht und Alter. */
export function findNorm(test: string, variant: string | undefined, sex: "m" | "w" | null | undefined, age: number | null): Norm | null {
  if (!sex || age == null) return null;
  return NORMS.find((n) => n.test === test && (n.variant ?? undefined) === (variant ?? undefined) && n.sex === sex && age >= n.age[0] && age <= n.age[1]) ?? null;
}

export function normValue(n: Norm, value: number, bodyweight: number | null): number | null {
  if (n.conv === "cm2m") return value / 100;
  if (n.conv === "sr26") return value + 26;
  if (n.conv === "rel1rm") return bodyweight ? oneRmFrom5(value) / bodyweight : null;
  return value;
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Messwert gegen Norm: Punkte 0–100 (etwa Perzentil) und Klartext. */
export function normScore(n: Norm, value: number, bodyweight: number | null): NormResult | null {
  const v = normValue(n, value, bodyweight);
  if (v == null) return null;
  const out = (score: number, label: string): NormResult => ({ score, label, tier: n.tier, src: n.src, noScore: n.noScore });
  if (n.type === "cat" && n.cats) {
    const c = n.cats.find(([lim]) => lim == null || v < lim) ?? n.cats[n.cats.length - 1];
    return out(c[2], c[1]);
  }
  if (n.type === "bands" && n.bands) {
    const [b, s, g] = n.bands;
    if (v >= g) return out(90, "Gold-Niveau");
    if (v >= s) return out(70, "Silber-Niveau");
    if (v >= b) return out(45, "Bronze-Niveau");
    return out(20, "unter Bronze");
  }
  if (n.type === "ms" && n.mean != null && n.sd) {
    const p = Math.min(99, Math.max(1, Math.round(50 * (1 + erf((v - n.mean) / n.sd / Math.SQRT2)))));
    return out(p, `etwa P${p}`);
  }
  if (n.type === "pct" && n.anchors?.length) {
    const a = n.anchors;
    const lower = n.better === "lower";
    const worse = (x: number, y: number) => (lower ? x > y : x < y);
    if (worse(v, a[0][1])) return out(Math.round(a[0][0] / 2), `unter P${a[0][0]}`);
    const last = a[a.length - 1];
    if (!worse(v, last[1])) return out(Math.round((100 + last[0]) / 2), `über P${last[0]}`);
    for (let i = 0; i < a.length - 1; i++) {
      const [p1, v1] = a[i], [p2, v2] = a[i + 1];
      const inSeg = lower ? v <= v1 && v >= v2 : v >= v1 && v <= v2;
      if (inSeg) {
        const p = Math.round(p1 + ((v - v1) / (v2 - v1)) * (p2 - p1));
        return out(p, `etwa P${p}`);
      }
    }
  }
  return null;
}

/* ---------- Auswertung eines Blocks ---------- */
const TEST_BY_ID: Record<string, TestDef> = Object.fromEntries(TESTWEEK.cups.flatMap((c) => c.tests).map((t) => [t.id, t]));

export interface TestEval {
  test: TestDef;
  result: TestResult;
  prev: TestResult | null;
  /** besser als letztes Mal? null ohne Vergleich */
  improved: boolean | null;
  norm: NormResult | null;
  /** Warum keine Norm */
  why?: string;
}
export interface DomainEval { id: string; name: string; score: number | null; tests: TestEval[] }
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
  const missingProfile = !sex || !birthYear;
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
      const improved = prev ? (t.better === "higher" ? result.value > prev.value : result.value < prev.value) : null;
      const n = findNorm(id, result.variant, sex, ageAt(birthYear, result.date));
      let norm: NormResult | null = null;
      let why: string | undefined;
      if (n) {
        norm = normScore(n, result.value, bodyweight);
        if (!norm && n.conv === "rel1rm") why = "Körpergewicht fehlt (Excalibur-Cup)";
      } else if (missingProfile) why = "Geburtsjahr und Geschlecht fehlen (Setup)";
      else if (t.variants && !result.variant) why = "Variante nicht angegeben";
      else why = NORMS.some((x) => x.test === id) ? "keine Norm für Alter oder Geschlecht" : "nur Verlauf";
      tests.push({ test: t, result, prev, improved, norm, why });
    }
    const scored = tests.map((x) => x.norm).filter((x): x is NormResult => !!x && !x.noScore);
    const score = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : null;
    return { id: d.id, name: d.name, score, tests };
  });

  const scoredDomains = domains.filter((d) => d.score != null);
  const weakest = scoredDomains.length >= 2 ? scoredDomains.reduce((a, b) => (b.score! < a.score! ? b : a)) : null;
  const who5List = state.who5.filter((w) => w.blockId === blockId);
  const who5 = who5List.length ? who5List[who5List.length - 1].score : null;

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

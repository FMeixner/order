/* Normen ohne Abhängigkeiten außer den Daten (1.47): von norms.ts und fitness.ts geteilt, ohne Zirkelimport über who5/weekplan. */
import { NORMS } from "../data";
import type { Norm } from "../types";

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


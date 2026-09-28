/* Gewichtsstufen je Equipment-Profil. Jede Steigerung landet auf einer Last, die es wirklich gibt. */
import type { Equip, EquipmentProfile } from "../types";

export const LOADABLE: Equip[] = ["barbell", "dumbbell", "kettlebell", "cable", "machine", "plate", "vest", "sandbag"];

export function isLoadable(e: Equip): boolean {
  return LOADABLE.includes(e);
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Liste der verfügbaren Lasten oder eine feste Schrittweite */
export function loadScale(p: EquipmentProfile, equip: Equip): { list: number[] } | { step: number } | null {
  switch (equip) {
    case "barbell": {
      if (!p.barbell) return null;
      const inc = 2 * p.barbell.smallestPlate;
      const out: number[] = [];
      for (let w = p.barbell.bar; w <= 400; w = round(w + inc)) out.push(w);
      return { list: out };
    }
    case "plate": {
      // Gürtel oder Weste mit Scheiben: Zusatzgewicht in Schritten der kleinsten Scheibe
      const step = p.barbell ? p.barbell.smallestPlate : p.vest.length ? 0 : 2.5;
      if (!step) return p.vest.length ? { list: [0, ...p.vest] } : null;
      const out: number[] = [];
      for (let w = 0; w <= 100; w = round(w + step)) out.push(w);
      return { list: out };
    }
    case "dumbbell":
      return p.dumbbells.length ? { list: [...p.dumbbells].sort((a, b) => a - b) } : p.kettlebells.length ? { list: [...p.kettlebells].sort((a, b) => a - b) } : null;
    case "kettlebell":
      return p.kettlebells.length ? { list: [...p.kettlebells].sort((a, b) => a - b) } : p.dumbbells.length ? { list: [...p.dumbbells].sort((a, b) => a - b) } : null;
    case "vest":
      return p.vest.length ? { list: [0, ...p.vest.filter((v) => v > 0)].sort((a, b) => a - b) } : { list: [0] };
    case "cable":
      return p.has.cable ? { step: p.cableStep || 2.5 } : null;
    case "machine":
      return p.has.machines ? { step: p.machineStep || 5 } : null;
    case "sandbag":
      return p.has.sandbag ? { step: 5 } : null;
    default:
      return null;
  }
}

/** n Stufen nach oben (n negativ: nach unten) */
export function stepLoad(p: EquipmentProfile, equip: Equip, w: number, n: number): number {
  const sc = loadScale(p, equip);
  if (!sc) return w;
  if ("step" in sc) return Math.max(0, round(w + n * sc.step));
  const list = sc.list;
  if (!list.length) return w;
  if (n >= 0) {
    // erste Stufe echt über w, dann n−1 weitere
    let i = list.findIndex((x) => x > w + 1e-9);
    if (i < 0) return list[list.length - 1];
    i = Math.min(list.length - 1, i + n - 1);
    return n === 0 ? snapDown(p, equip, w) : list[i];
  }
  let i = -1;
  for (let k = list.length - 1; k >= 0; k--) if (list[k] < w - 1e-9) { i = k; break; }
  if (i < 0) return list[0];
  return list[Math.max(0, i + n + 1)];
}

/** Höchste verfügbare Last ≤ w */
export function snapDown(p: EquipmentProfile, equip: Equip, w: number): number {
  const sc = loadScale(p, equip);
  if (!sc) return w;
  if ("step" in sc) return Math.max(0, round(Math.floor(w / sc.step + 1e-9) * sc.step));
  const below = sc.list.filter((x) => x <= w + 1e-9);
  return below.length ? below[below.length - 1] : sc.list[0];
}

/** Nächstliegende verfügbare Last */
export function snapNearest(p: EquipmentProfile, equip: Equip, w: number): number {
  const sc = loadScale(p, equip);
  if (!sc) return w;
  if ("step" in sc) return Math.max(0, round(Math.round(w / sc.step) * sc.step));
  return sc.list.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), sc.list[0]);
}

/** Text wie "2; 4; 6-20/2; 22,5" in eine Liste umwandeln.
    Trenner: Semikolon oder Leerzeichen. Dezimalkomma erlaubt. Bereich: von-bis/Schritt. */
export function parseWeightList(text: string): number[] {
  const out = new Set<number>();
  for (const partRaw of text.replace(/kg/gi, " ").split(/[;\s]+/)) {
    const part = partRaw.trim().replace(/,/g, ".");
    if (!part) continue;
    const m = part.match(/^([\d.]+)[-–]([\d.]+)(?:\/([\d.]+))?$/);
    if (m) {
      const a = parseFloat(m[1]), b = parseFloat(m[2]), s = m[3] ? parseFloat(m[3]) : 1;
      if (s > 0 && b >= a && (b - a) / s <= 400) for (let w = a; w <= b + 1e-9; w = round(w + s)) out.add(round(w));
      continue;
    }
    const v = parseFloat(part);
    if (!isNaN(v)) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

export function formatWeightList(list: number[]): string {
  return list.map((x) => String(x).replace(".", ",")).join("; ");
}

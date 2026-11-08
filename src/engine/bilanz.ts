/* Domänen-Bilanz (Baustein 4 der Jahresarchitektur): Der Plan wird als Matrix geprüft —
   Testwochen-Domäne × Mesozyklus, Zellen sind effektive Wochen (Hauptziel zählt voll,
   Nebenziele halb). Zwei Invarianten:
   - Allround: Jede messbare Domäne erreicht je Halbjahr mindestens HALF_MIN effektive Wochen
     („4 von 26"); geprüft wird ein Halbjahr erst ab HALF_CHECK geplanten Wochen.
     Fett verlieren und Wohlbefinden sind Wunschziele ohne Pflicht; Masse läuft über die Kraft mit
     (angezeigt, aber nie geprüft — die Testwoche misst keinen Umfang).
   - Abwechslung: Kein Hauptziel in mehr als zwei Phasen in Folge; Harlequin ist der Joker und
     unterbricht die Reihe.
   Bewusst Bewertung, kein Planer: Nichts wird gesperrt oder eingeplant — die Lenkung
   (Meso-Vorschläge, die unterversorgte Domänen priorisieren) ist ein Folgeber. */
import { DOMAINS } from "../data";
import { addDays, blockFocus, blockWeeks, fmtDate, isTestBlock, mondayOf, parseIso } from "./plan";
import type { Focus, Goal, PlanBlock } from "../types";

/** Mindestsumme effektiver Wochen je Pflichtdomäne je Halbjahr */
export const HALF_MIN = 4;
/** Ab so vielen geplanten Wochen wird ein Halbjahr geprüft (halb gefüllt heißt noch keine Aussage) */
export const HALF_CHECK = 13;

/** Zeile „Masse": angezeigt, aber nie geprüft */
const MASS = "masse";
/** Zeile „Sehnen": angezeigt, aber nie geprüft (die Testwoche misst keine Sehnen) — zählt nach dem Anteil an Halteübungen */
const TENDON = "sehnen";

/** Anteil Halteübungen eines Ordens (Sehnen und Bindegewebe): ab 15 % halbe, ab 30 % volle Wochen */
export function tendonWeight(f: Focus): number {
  let hold = 0, all = 0;
  for (const r of Object.values(f.roles)) {
    if (r.optional) continue;
    for (const b of r.blocks) {
      const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : [];
      for (const x of slots) { all++; if (x.kind === "hold") hold++; }
    }
  }
  const share = all ? hold / all : 0;
  return share >= 0.3 ? 1 : share >= 0.15 ? 0.5 : 0;
}

/** Goal → Testwochen-Domänen; Kondition trägt Kraftausdauer und Anaerob */
const DOMAINS_OF_GOAL: Partial<Record<Goal, string[]>> = {};
for (const d of DOMAINS) DOMAINS_OF_GOAL[d.goal] = [...(DOMAINS_OF_GOAL[d.goal] ?? []), d.id];

/** Effektives Gewicht je Woche eines Blocks: Hauptziel 1.0, jedes Nebenziel 0.5 (Masse läuft extra mit) */
function blockWeights(b: PlanBlock): Map<string, number> {
  const f = blockFocus(b);
  const m = new Map<string, number>();
  if (!f) return m;
  const add = (g: Goal, w: number) => {
    for (const d of DOMAINS_OF_GOAL[g] ?? []) m.set(d, (m.get(d) ?? 0) + w);
    if (g === "hypertrophy") m.set(MASS, (m.get(MASS) ?? 0) + w);
  };
  add(f.goals.primary, 1);
  for (const g of f.goals.secondary) add(g, 0.5);
  const t = tendonWeight(f);
  if (t) m.set(TENDON, t);
  return m;
}

const halfOf = (iso: string) => {
  const d = parseIso(iso);
  return `${d.getFullYear()} H${d.getMonth() + 1 <= 6 ? 1 : 2}`;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Eine Spalte der Matrix: ein Mesozyklus (Teile zusammen) oder eine einzelne Phase */
export interface BalanceColumn {
  id: string;
  /** Zeitraum als Kurzfassung, z. B. „4.1.–14.2.27" */
  label: string;
  /** Mesozyklus oder einzelne Phase */
  meso: boolean;
  weeks: number;
}
export interface DomainRow {
  id: string;
  name: string;
  /** Effektive Wochen je Spalte, in Spaltenreihenfolge */
  cells: number[];
  /** Pflichtdomäne: wird gegen HALF_MIN geprüft */
  required: boolean;
}
export interface HalfYear {
  label: string;
  /** Geplante Wochen im Halbjahr (Testwochen zählen zur Belegung) */
  planned: number;
  checked: boolean;
  byDomain: Record<string, number>;
}
/** Allround-Invariante verletzt: Domäne im Halbjahr unter der Mindestsumme */
export interface BalanceGap { half: string; domain: string; name: string; weeks: number }
/** Abwechslungs-Invariante verletzt: gleiches Hauptziel in mehr als zwei Phasen in Folge */
export interface BalanceStreak { goal: Goal; labels: string[] }

export interface MesoBalance {
  columns: BalanceColumn[];
  rows: DomainRow[];
  halves: HalfYear[];
  gaps: BalanceGap[];
  streaks: BalanceStreak[];
}

/** Domänen-Bilanz eines Plans: Matrix, Halbjahressummen und beide Invarianten. */
export function mesoBalance(plan: PlanBlock[]): MesoBalance {
  const blocks = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const trained = blocks.filter((b) => !isTestBlock(b));

  // Spalten: Mesozyklen über die gemeinsame meso-Id, einzelne Phasen (ohne Testwochen) je eigene Spalte
  const groups = new Map<string, { from: string; to: string; meso: boolean; weeks: number; blocks: PlanBlock[] }>();
  const order: string[] = [];
  for (const b of trained) {
    const key = b.meso ?? b.id;
    let g = groups.get(key);
    if (!g) { g = { from: b.start, to: b.end, meso: !!b.meso, weeks: 0, blocks: [] }; groups.set(key, g); order.push(key); }
    if (b.start < g.from) g.from = b.start;
    if (b.end > g.to) g.to = b.end;
    g.weeks += blockWeeks(b);
    g.blocks.push(b);
  }
  const columns: BalanceColumn[] = order.map((k) => {
    const g = groups.get(k)!;
    return { id: k, label: `${fmtDate(g.from)}–${fmtDate(g.to)}`, meso: g.meso, weeks: g.weeks };
  });

  // Zellen: effektive Wochen je Domäne je Spalte (Gewichte je Block nur einmal)
  const wOf = new Map(blocks.map((b) => [b.id, blockWeights(b)]));
  const rows: DomainRow[] = DOMAINS.map((d) => {
    const cells = order.map((k) => {
      let w = 0;
      for (const b of groups.get(k)!.blocks) w += (wOf.get(b.id)!.get(d.id) ?? 0) * blockWeeks(b);
      return round1(w);
    });
    return { id: d.id, name: d.name, cells, required: true };
  });
  {
    const cells = order.map((k) => {
      let w = 0;
      for (const b of groups.get(k)!.blocks) w += (wOf.get(b.id)!.get(MASS) ?? 0) * blockWeeks(b);
      return round1(w);
    });
    rows.push({ id: MASS, name: "Masse (kein Test)", cells, required: false });
  }
  {
    const cells = order.map((k) => {
      let w = 0;
      for (const b of groups.get(k)!.blocks) w += (wOf.get(b.id)!.get(TENDON) ?? 0) * blockWeeks(b);
      return round1(w);
    });
    rows.push({ id: TENDON, name: "Sehnen (kein Test)", cells, required: false });
  }

  // Halbjahre: jede Woche zählt zu dem Halbjahr, in dem ihr Montag liegt
  const halves = new Map<string, HalfYear>();
  for (const b of blocks) {
    const w = wOf.get(b.id)!;
    for (let i = 0; i < blockWeeks(b); i++) {
      const h = halfOf(addDays(mondayOf(b.start), 7 * i));
      let hy = halves.get(h);
      if (!hy) { hy = { label: h, planned: 0, checked: false, byDomain: {} }; halves.set(h, hy); }
      hy.planned++;
      if (!isTestBlock(b)) for (const [d, wt] of w) hy.byDomain[d] = round1((hy.byDomain[d] ?? 0) + wt);
    }
  }
  const halfList = [...halves.values()].sort((a, b) => a.label.localeCompare(b.label));
  for (const hy of halfList) hy.checked = hy.planned >= HALF_CHECK;

  // Allround-Invariante
  const gaps: BalanceGap[] = [];
  for (const hy of halfList) {
    if (!hy.checked) continue;
    for (const d of DOMAINS) {
      const w = hy.byDomain[d.id] ?? 0;
      if (w < HALF_MIN) gaps.push({ half: hy.label, domain: d.id, name: d.name, weeks: round1(w) });
    }
  }

  // Abwechslungs-Invariante: Harlequin ist der Joker und unterbricht jede Reihe
  const streaks: BalanceStreak[] = [];
  // Eine Klammer zählt als eine Phase: Zielbindung über ihre Orden ist gewollt, keine Wiederholung
  let run: { goal: Goal; labels: string[] } | null = null;
  let lastMeso: string | undefined;
  for (const b of trained) {
    if (b.klammer && b.meso && b.meso === lastMeso) continue;
    lastMeso = b.meso;
    if (b.focusId === "harlequin") { run = null; continue; }
    const f = blockFocus(b);
    if (!f) { run = null; continue; }
    const label = b.label || f.name;
    if (run && run.goal === f.goals.primary) run.labels.push(label);
    else run = { goal: f.goals.primary, labels: [label] };
    if (run.labels.length === 3) streaks.push({ goal: run.goal, labels: [...run.labels] });
  }

  return { columns, rows, halves: halfList, gaps, streaks };
}

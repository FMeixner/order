/* Stand (1.20): ein Dashboard statt verteilter Statistiken. Je Bereich eine Zeile mit drei Antworten:
   - Test: Wo stehe ich? (Punkte ≈ Perzentil aus der letzten Testwoche; Schätzung gestrichelt; ohne Test leer)
   - Zustand: Hält der Bereich? (gut · bald · fehlt — aus Frische im Log und Abdeckung im Plan, bereiche.ts)
   - Schwachstelle: Ist er ein Defizit aus den Tests (sharpen.ts)?
   Dazu: woran die laufende Phase im Schwerpunkt-Slot arbeitet, und die Bilanz der letzten Testwoche.
   Hier wird nur zusammengeführt; gerechnet wird in norms.ts, bereiche.ts, sharpen.ts. */
import { DOMAINS, TESTWEEK } from "../data";
import type { AppState, PlanBlock } from "../types";
import { bereiche, type BereichRow } from "./bereiche";
import { evaluateBlock } from "./norms";
import { isTestBlock } from "./plan";
import type { ResidualClock } from "./residual";
import { deficitsOf, domainName, latestTest, PURPOSE_LABEL, yearSlots } from "./sharpen";
import { liftStand, repStand } from "./fitness";

export interface StandRow extends BereichRow {
  /** Punkte 0–100 aus der letzten Testwoche; null ohne Test */
  score: number | null;
  /** Schätzung aus verwandten Tests */
  est: boolean;
  /** Veränderung zum Test davor */
  change: "better" | "same" | "worse" | null;
  /** Defizit aus den Tests */
  weak: boolean;
  /** Laufender Stand aus dem Log (1.47, Kraft und Kraftausdauer): Klartext je Übung bzw. Familie */
  live?: string[];
}

export interface Stand {
  rows: StandRow[];
  /** Letzte Testwoche: Datum und Bilanz */
  test: { blockId: string; date: string; tests: number; better: number; worse: number } | null;
  /** Nächste Testwoche im Plan */
  nextTest: PlanBlock | null;
  /** Schwerpunkt-Slot der laufenden Phase */
  slot: { name: string; purpose: string } | null;
  weak: string[];
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function standOf(state: AppState, today: string, clocks?: ResidualClock[]): Stand {
  const base = bereiche(state, today, state.plan, clocks);
  const lt = latestTest(state, "9999-12-31");
  const ev = lt ? evaluateBlock(state, lt.blockId) : null;
  const weakIds = new Set(lt ? deficitsOf(state, lt.blockId).map((d) => d.id as string) : []);
  const rows: StandRow[] = base.map((r) => {
    const ds = (ev?.domains ?? []).filter((d) => r.def.domains.includes(d.id));
    const real = ds.filter((d) => d.score != null).map((d) => d.score!);
    const ests = ds.filter((d) => d.score == null && d.estimate).map((d) => d.estimate!.score);
    const ch = ds.flatMap((d) => d.tests.map((t) => t.change)).filter(Boolean);
    const change = !ch.length ? null : ch.includes("better") && !ch.includes("worse") ? "better" : ch.includes("worse") && !ch.includes("better") ? "worse" : "same";
    return { ...r, score: real.length ? avg(real) : avg(ests), est: !real.length && ests.length > 0, change, weak: r.def.domains.some((d) => weakIds.has(d)) };
  });
  // Laufender Stand aus dem Log (1.47): Kraft und Kraftausdauer misst das Training selbst, nicht die Testwoche
  const lifts = liftStand(state, today);
  const reps = repStand(state, today);
  const fmtN = (n: number) => String(n).replace(".", ",");
  const trend = (cs: (string | null)[]): StandRow["change"] => { const c = cs.filter(Boolean); return !c.length ? null : c.includes("better") && !c.includes("worse") ? "better" : c.includes("worse") && !c.includes("better") ? "worse" : "same"; };
  // Checkpoints und freie Tests (1.49): neuer als der letzte Testwochenwert, dann als laufender Wert
  const TDEF = Object.fromEntries(TESTWEEK.cups.flatMap((c) => c.tests).map((t) => [t.id, t]));
  for (const row of rows) for (const dom of row.def.domains) for (const id of DOMAINS.find((d) => d.id === dom)?.tests ?? []) {
    const cp = (state.checkpoints?.[id] ?? []).filter((r) => r.date <= today).sort((a, b) => a.date.localeCompare(b.date)).pop();
    const tw = (state.tests[id] ?? []).map((r) => r.date).sort().pop();
    if (!cp || (tw && tw >= cp.date) || !TDEF[id]) continue;
    (row.live ??= []).push(`${TDEF[id].name} ${fmtN(cp.value)} (${cp.date.slice(8, 10)}.${cp.date.slice(5, 7)}., ${cp.blockId === "frei" ? "frei" : "Checkpoint"})`);
  }
  for (const row of rows) {
    if (row.def.id === "kraft" && lifts.length) {
      row.change = trend(lifts.map((l) => l.change));
      row.live = lifts.map((l) => `${l.name} ~${l.now} kg (${Math.round((l.now / l.best) * 100)} % vom Bestwert)`);
    }
    if (row.def.id === "ke" && reps.length) {
      const sc = reps.map((x) => x.norm).filter((n) => n && !n.noScore).map((n) => n!.score);
      if (sc.length) { row.score = avg(sc); row.est = false; }
      row.change = trend(reps.map((x) => x.change));
      row.live = reps.map((x) => `${x.name} ~${fmtN(x.reps)} Wdh am Stück${x.norm ? ` (${x.norm.label})` : ""}`);
    }
  }
  const all = (ev?.domains ?? []).flatMap((d) => d.tests);
  const cur = state.plan.find((b) => b.start <= today && today <= b.end && !isTestBlock(b));
  const ys = cur ? yearSlots(state, today).get(cur.id) : undefined;
  return {
    rows,
    test: lt && ev ? { blockId: lt.blockId, date: lt.date, tests: all.length, better: all.filter((t) => t.change === "better").length, worse: all.filter((t) => t.change === "worse").length } : null,
    nextTest: [...state.plan].filter((b) => isTestBlock(b) && b.end >= today).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null,
    slot: ys?.domain ? { name: domainName(ys.domain), purpose: ys.purpose ? PURPOSE_LABEL[ys.purpose] : "" } : null,
    weak: rows.filter((r) => r.weak).map((r) => r.def.name),
  };
}

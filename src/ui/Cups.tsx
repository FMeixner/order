/* Cups nachholen (1.38): Versäumte Tests der jüngsten Testwoche jederzeit über den Almanach absolvieren.
   Nachgeholt wird unter Alltagsbedingungen — ohne Warm-up und Cool-down, ohne WHO-5 und ohne das Urteil des
   Turniers, die bleiben der Testwoche selbst vorbehalten. */
import type { AppState } from "../types";
import { TESTWEEK } from "../data";
import { cupDone, openCupTarget, saveTestResult, skipTestResult } from "../engine/testweek";
import { fmtDate } from "../engine/plan";
import { Collapse } from "./common";
import { Benchmark, TestRow } from "./TestWeek";

type Update = (fn: (s: AppState) => AppState) => void;

export function Cups({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const block = openCupTarget(state, today);
  if (!block) return (
    <div className="card hero">
      <div className="hero-focus">Alle Cups verdient</div>
      <div className="muted small">Keine Testwoche hat offene Cups — nachgeholt wird erst, wenn etwas fehlt.</div>
    </div>
  );
  const cups = TESTWEEK.cups;
  const done = (c: (typeof cups)[number]) => cupDone(state, block, c, today);
  const earned = cups.filter(done).length;
  const save = (id: string, value: number, raw: string, variant?: string) =>
    update((st) => saveTestResult(st, block.id, id, value, raw, today, variant));
  const skip = (id: string, on: boolean) => update((st) => skipTestResult(st, block.id, id, on));
  return (
    <div className="stack">
      <section className="card hero">
        <div className="hero-focus">Cups nachholen</div>
        <div className="muted small">Testwoche {fmtDate(block.start)} – {fmtDate(block.end)} · {earned} von {cups.length} Cups verdient</div>
        <div className="muted small">
          Nachgeholt gilt wie in der Testwoche: ein Wert je Test, „Korrigieren“ ersetzt ihn, „Auslassen“ für Tests ohne Material —
          nur eben unter Alltagsbedingungen, ohne Warm-up und Cool-down. Die Werte zählen für Verlauf, Normen und Auswertung wie jeder Test.
        </div>
      </section>
      {cups.map((cup) => (
        <Collapse key={cup.id} title={done(cup) ? `${cup.name} ✓` : cup.name} meta={cup.focus} tone="teal" defaultOpen={!done(cup)}>
          {cup.tests.map((t) => (
            <TestRow key={t.id} t={t} state={state} block={block} onSave={(value, raw, variant) => save(t.id, value, raw, variant)} onSkip={(on) => skip(t.id, on)} />
          ))}
          <Benchmark cup={cup} state={state} update={update} block={block} today={today} />
        </Collapse>
      ))}
    </div>
  );
}

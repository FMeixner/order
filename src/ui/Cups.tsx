/* Cups nachholen (1.38): Versäumte Tests der jüngsten Testwoche jederzeit über den Almanach absolvieren.
   Nachgeholt wird unter Alltagsbedingungen — ohne Warm-up und Cool-down und ohne das Urteil des Turniers.
   Seit 1.49 bleibt Ausgelassenes offen, bis es einen Wert hat, und jeder Test lässt sich frei machen wie eine
   Bestie aus dem Bestiarium: Freie Werte zählen als Checkpoint (Stand, Schwerpunkt-Freigabe), nicht als Testwoche. */
import { useState } from "react";
import type { AppState, TestDef } from "../types";
import { TESTWEEK } from "../data";
import { cupMeasured, openCupTarget, saveTestResult, skipTestResult } from "../engine/testweek";
import { saveCheckpoint } from "../engine/fitness";
import { fmtDate } from "../engine/plan";
import { Collapse } from "./common";
import { Benchmark, TestRow, parseValue, show } from "./TestWeek";
import { TestTimer } from "./TestTimer";

type Update = (fn: (s: AppState) => AppState) => void;

export function Cups({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const block = openCupTarget(state, today);
  const cups = TESTWEEK.cups;
  return (
    <div className="stack">
      {!block ? (
        <div className="card hero">
          <div className="hero-focus">Alle Cups komplett</div>
          <div className="muted small">Jeder Test der letzten Testwoche hat einen Wert. Frei testen geht trotzdem, unten.</div>
        </div>
      ) : (() => {
        const done = (c: (typeof cups)[number]) => cupMeasured(state, block, c, today);
        const save = (id: string, value: number, raw: string, variant?: string) => update((st) => saveTestResult(st, block.id, id, value, raw, today, variant));
        const skip = (id: string, on: boolean) => update((st) => skipTestResult(st, block.id, id, on));
        return (
          <>
            <section className="card hero">
              <div className="hero-focus">Cups nachholen</div>
              <div className="muted small">Testwoche {fmtDate(block.start)} – {fmtDate(block.end)} · {cups.filter(done).length} von {cups.length} Cups komplett</div>
              <div className="muted small">Ausgelassenes bleibt hier offen, bis es einen Wert hat. Ein Wert je Test, „Korrigieren“ ersetzt ihn – unter Alltagsbedingungen, ohne Warm-up und Cool-down. Die Werte zählen wie in der Testwoche.</div>
            </section>
            {cups.map((cup) => (
              <Collapse key={cup.id} title={done(cup) ? `${cup.name} ✓` : cup.name} meta={cup.focus} tone="teal" defaultOpen={!done(cup)}>
                {cup.tests.map((t) => <TestRow key={t.id} t={t} state={state} block={block} onSave={(value, raw, variant) => save(t.id, value, raw, variant)} onSkip={(on) => skip(t.id, on)} />)}
                <Benchmark cup={cup} state={state} update={update} block={block} today={today} />
              </Collapse>
            ))}
          </>
        );
      })()}
      <Collapse title="Frei testen" meta="jederzeit" tone="amber">
        <div className="muted small">Wie eine Bestie aus dem Bestiarium: jeder Test, wann du willst. Freie Werte zählen als Checkpoint – im Stand und für die Freigabe des Schwerpunkts –, nicht als Testwoche.</div>
        {cups.flatMap((c) => c.tests).filter((t) => t.id !== "t-rhr").map((t) => <FreeTest key={t.id} t={t} state={state} update={update} today={today} />)}
      </Collapse>
    </div>
  );
}

function FreeTest({ t, state, update, today }: { t: TestDef; state: AppState; update: Update; today: string }) {
  const [val, setVal] = useState("");
  const parsed = parseValue(val, t.unit);
  const hist = [...(state.tests[t.id] ?? []), ...(state.checkpoints?.[t.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const last = hist[hist.length - 1];
  const todays = (state.checkpoints?.[t.id] ?? []).find((r) => r.date === today);
  return (
    <div className="test-row">
      <div className="slot-title"><span className="slot-name">{t.name}</span>{last && <span className="muted small">zuletzt {show(last.value, t.unit)} ({fmtDate(last.date)})</span>}</div>
      {t.timer && <TestTimer spec={t.timer} onResult={(sec) => { if (t.timer?.mode === "hold") setVal(String(sec).replace(".", ",")); }} />}
      <div className="row wrap">
        <input type="text" inputMode="decimal" className="test-in" aria-label={`Frei: ${t.name}`} placeholder={todays ? `${show(todays.value, t.unit)} korrigieren` : t.unit === "mmss" ? "m.ss.z" : "Wert"} value={val} onChange={(e) => setVal(e.target.value)} />
        <button className="btn small" disabled={parsed == null} onClick={() => { update((st) => saveCheckpoint(st, t.id, "frei", parsed!, val, today)); setVal(""); }}>{todays ? "Korrigieren" : "Speichern"}</button>
      </div>
    </div>
  );
}

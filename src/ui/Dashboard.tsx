/* Stand: das Dashboard. Oben das Jahr (wo bin ich), dann die Bereiche in einer Tabelle (Test · Zustand · Schwachstelle),
   dann die letzte Testwoche, darunter Volumen und Verlauf. Details bleiben einen Tipp entfernt. */
import { useMemo, useState } from "react";
import { balanceOf } from "../engine/balance";
import { mesoBalance } from "../engine/bilanz";
import { standOf, type StandRow } from "../engine/dashboard";
import { reviewLine, reviewWeek, weekReview } from "../engine/weekreview";
import { AFFECT_MIN, affectSummary, affectTone, affectWord } from "../engine/affect";
import { addDays, blockAt, daysBetween, fmtDate } from "../engine/plan";
import type { ResidualClock } from "../engine/residual";
import type { AppState } from "../types";
import { Collapse, Modal } from "./common";
import { Evaluation } from "./Evaluation";
import { GOAL_LABEL } from "./PlanEditor";
import { ProgressView } from "./Progress";
import { VolumeCard } from "./VolumeCard";
import { YearTimeline } from "./YearPicture";

const WATCH = { gut: "ok", bald: "soon", fehlt: "due" } as const;
const ARROW = { better: "↑", same: "→", worse: "↓" } as const;
const detail = (r: StandRow) => [
  r.score != null ? `${r.est ? "Schätzung " : ""}${r.score} Punkte (≈ Perzentil der Altersnorm)` : "noch kein Testwert",
  r.days != null ? `letzter Reiz vor ${r.days} Tagen, hält etwa ${r.budget}` : null,
  r.def.required ? `${String(r.weeks).replace(".", ",")} Wochen im nächsten halben Jahr (Richtwert 4)` : null,
].filter(Boolean).join(" · ");

export function Dashboard({ state, update, today, clocks, onOptimize, goPlan }: { state: AppState; update: (fn: (s: AppState) => AppState) => void; today: string; clocks: ResidualClock[]; onOptimize: () => void; goPlan: () => void }) {
  const st = useMemo(() => standOf(state, today, clocks), [state, today, clocks]);
  const [evalOpen, setEvalOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const streaks = mesoBalance(state.plan).streaks;
  const bal = balanceOf(state.plan, today, addDays(today, 26 * 7 - 1));
  const anyScore = st.rows.some((r) => r.score != null);
  const attention = st.rows.filter((r) => r.watch !== "gut");
  return (
    <div className="stack dash">
      <section className="card stack">
        <div className="row between"><h2>Dein Jahr</h2><button className="btn ghost small" onClick={goPlan}>Plan öffnen</button></div>
        <YearTimeline plan={state.plan} sections={state.sections} today={today} balance view={state.yearView ?? "year"} onView={(yearView) => update((s) => ({ ...s, yearView }))} />
      </section>

      <section className="card stack">
        <div className="row between wrap">
          <h2>Bereiche</h2>
          <span className="muted small">{attention.length ? `${attention.length} brauchen Aufmerksamkeit` : "alles im Lot"}</span>
        </div>
        <div className="dash-grid" role="table" aria-label="Bereiche">
          <div className="dash-row dash-head" role="row"><span role="columnheader">Bereich</span><span role="columnheader">Test</span><span role="columnheader">Zustand</span></div>
          {st.rows.map((r) => (
            <div key={r.def.id} className="dash-item">
              <button className="dash-row" role="row" aria-expanded={open === r.def.id} onClick={() => setOpen(open === r.def.id ? null : r.def.id)}>
                <span role="cell" className="dash-name">{r.def.name}{r.weak && <i className="dash-weak" title="Schwachstelle aus den Tests" aria-label="Schwachstelle" />}</span>
                <span role="cell" className="dash-test">
                  {r.score != null ? <>
                    <span className="bar-track"><span className={`bar-fill ${r.est ? "est" : r.score < 40 ? "low" : r.score >= 70 ? "high" : ""}`} style={{ width: `${r.score}%` }} /></span>
                    <span className="dash-score">{r.est ? "~" : ""}{r.score}{r.change && <em className={r.change}>{ARROW[r.change]}</em>}</span>
                  </> : <span className="muted">–</span>}
                </span>
                <span role="cell" className={`ber-pill ${WATCH[r.watch]}`}><i />{r.watch === "gut" ? "gut" : r.why}</span>
              </button>
              {open === r.def.id && <div className="dash-detail muted small">{r.def.hint}. {detail(r)}.</div>}
            </div>
          ))}
        </div>
        {anyScore && <div className="muted small">Test: Punkte ≈ Perzentil deiner Altersnorm, 50 ist der Durchschnitt. <i className="dash-weak inline" /> Schwachstelle · ~ Schätzung · ↑↓ gegenüber dem Test davor.</div>}
        {(st.weak.length > 0 || st.slot) && (
          <div className="note small">
            {st.weak.length > 0 && <div><strong>Schwachstellen:</strong> {st.weak.join(", ")}</div>}
            {st.slot && <div><strong>Schwerpunkt jetzt:</strong> {st.slot.name}{st.slot.purpose ? ` (${st.slot.purpose})` : ""}</div>}
          </div>
        )}
        {streaks.length > 0 && <div className="note warn small">{streaks.map((s) => `${GOAL_LABEL[s.goal]} ${s.labels.length}-mal in Folge`).join("; ")} — Abwechslung fehlt.</div>}
        {bal.score != null && (
          <div className="balance-scale" role="img" aria-label={`Nächstes halbes Jahr: ${bal.label}`}>
            <div className="balance-track"><div className="balance-marker" style={{ left: `${bal.score * 100}%` }} /></div>
            <div className="row between small muted"><span>Spezialist</span><span>{bal.label}</span><span>Allrounder</span></div>
          </div>
        )}
      </section>

      <AffectCard state={state} today={today} />

      <ReviewCard state={state} today={today} />

      <section className="card stack">
        <h2>Testwoche</h2>
        {st.test ? (
          <>
            <div className="dash-kpis">
              <div><b>{fmtDate(st.test.date)}</b><span>zuletzt</span></div>
              <div><b>{st.test.tests}</b><span>Tests</span></div>
              <div><b className="up">{st.test.better}</b><span>besser</span></div>
              <div><b className={st.test.worse ? "down" : ""}>{st.test.worse}</b><span>schwächer</span></div>
            </div>
            <div className="row wrap">
              <button className="btn small" onClick={() => setEvalOpen(true)}>Auswertung</button>
              <button className="btn primary small" onClick={onOptimize}>Orden nach Schwachstellen optimieren</button>
            </div>
          </>
        ) : <div className="muted small">Noch keine Testwoche. Nach der ersten weiß die App, wo du stehst und was dir fehlt.</div>}
        {st.nextTest && <div className="muted small">Nächste Testwoche: ab {fmtDate(st.nextTest.start)}{st.nextTest.start > today ? ` (in ${Math.ceil(daysBetween(today, st.nextTest.start) / 7)} Wochen)` : " — läuft"}.</div>}
      </section>

      <VolumeCard state={state} today={today} />

      <Collapse title="Verlauf" meta={blockAt(state.plan, today)?.kcal === "deficit" ? "Defizit-Phase: Halten ist das Ziel." : "Gewichte und Bestzeiten"}>
        <ProgressView state={state} />
      </Collapse>

      {evalOpen && st.test && <Modal title="Auswertung der Testwoche" onClose={() => setEvalOpen(false)} wide><Evaluation state={state} blockId={st.test.blockId} defaultOpen /></Modal>}
    </div>
  );
}

const signed = (x: number) => (x > 0 ? `+${String(x).replace(".", ",")}` : String(x).replace(".", ",").replace("-", "−"));

/** Befinden (1.24): Mittel der letzten vier Wochen, je Tagestyp die letzten Werte, Hinweis bei zähen Tagen */
function AffectCard({ state, today }: { state: AppState; today: string }) {
  const a = useMemo(() => affectSummary(state, today), [state, today]);
  return (
    <section className="card stack" aria-label="Befinden">
      <div className="row between wrap">
        <h2>Befinden</h2>
        {a.n >= AFFECT_MIN && a.mean4w != null && <span className="aff-mean"><b>{signed(a.mean4w)}</b> {affectWord(a.mean4w)} <span className="muted small">· 4 Wochen</span></span>}
      </div>
      {a.n < AFFECT_MIN ? <div className="muted small">Noch zu wenige Einheiten mit Befinden.</div> : <>
        {a.byRole.length > 0 && (
          <div className="aff-list">
            {a.byRole.map((r) => (
              <div key={r.role} className="aff-row">
                <span className="aff-name">{r.name}</span>
                <span className="aff-dots" aria-label={`letzte Werte: ${r.values.map(signed).join(", ")}`}>{r.values.map((v, i) => <i key={i} className={affectTone(v)} title={signed(v)} />)}</span>
                <span className="aff-val">{signed(r.mean)}</span>
              </div>
            ))}
          </div>
        )}
        {a.flag && <div className="note small">{a.flag}</div>}
      </>}
    </section>
  );
}

/** Wochenrückblick (1.27): eine Zeile, antippen zeigt die Einheiten und was gestiegen ist. Keine Pflicht, kein Zähler. */
function ReviewCard({ state, today }: { state: AppState; today: string }) {
  const r = useMemo(() => { const t = reviewWeek(state, today); return t ? weekReview(state, t.block, t.week) : null; }, [state, today]);
  const [open, setOpen] = useState(false);
  if (!r || (!r.done && !r.condensed)) return null;
  return (
    <section className="card stack" aria-label="Letzte Woche">
      <button className="review-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="review-title"><h2>Letzte Woche</h2><span className="muted small">ab {fmtDate(r.monday)}</span></span>
        <span className="review-line">{reviewLine(r)}</span>
        <span className={`chev ${open ? "open" : ""}`} aria-hidden>›</span>
      </button>
      {open && (
        <div className="stack tight">
          <div className="review-list">
            {r.sessions.map((s) => (
              <div key={s.role + s.date} className="review-row">
                <span className="mono small">{s.day}</span>
                <span>{s.name}</span>
                <span className="muted small">{s.minutes != null ? `${s.minutes} Min` : ""}</span>
                <span className="mono small">{s.feeling != null ? signed(s.feeling) : ""}</span>
              </div>
            ))}
          </div>
          {r.up.length > 0 && <div className="small"><strong>Gesteigert:</strong> {r.up.join(", ")}</div>}
          {r.deficit && r.held.length > 0 && <div className="small"><strong>Gehalten:</strong> {r.held.join(", ")}</div>}
        </div>
      )}
    </section>
  );
}

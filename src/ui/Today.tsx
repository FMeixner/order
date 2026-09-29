import { useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { addDays, blockAt, focusName, followedByTest, isTestBlock, blockWeeks, dayRoleMap, fmtDate, isAWeek, isDeloadWeek, isTestWeek, mondayOf, nextBlock, weekdayOf, weekInBlock } from "../engine/plan";
import { TESTWEEK } from "../data";
import type { AppState, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { SessionPreview, SessionView, sessionId } from "./SessionView";
import { focusFor } from "../engine/weekplan";
import { TestWeek } from "./TestWeek";

type Update = (fn: (s: AppState) => AppState) => void;

export function Today({ state, update, today, goPlan }: { state: AppState; update: Update; today: string; goPlan: () => void }) {
  const block = blockAt(state.plan, today);
  const [pick, setPick] = useState<Weekday | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  if (!block) {
    const nb = nextBlock(state.plan, today);
    return (
      <div className="stack">
        <div className="card">
          <h2>Gerade keine Phase geplant</h2>
          <p className="muted">{nb ? `Die nächste Phase beginnt am ${fmtDate(nb.start)} mit ${focusName(nb.focusId)}.` : "Lege im Plan eine Phase mit Orden an."}</p>
          <button className="btn primary" onClick={goPlan}>Zum Plan</button>
        </div>
      </div>
    );
  }
  if (isTestBlock(block)) return (
    <div className="stack">
      <div className="card hero">
        <div className="hero-top"><div><div className="hero-focus">Testwoche</div><div className="muted small">{fmtDate(block.start)} – {fmtDate(block.end)}</div></div></div>
      </div>
      <TestWeek state={state} update={update} block={block} />
    </div>
  );
  const baseFocus = FOCUS_BY_ID[block.focusId];
  if (!baseFocus) return <div className="card">Der Orden dieser Phase fehlt. <button className="btn small" onClick={goPlan}>Plan öffnen</button></div>;
  const curWeek = weekInBlock(block, today);
  const total = blockWeeks(block);
  const week = viewWeek ?? curWeek;
  const isCur = week === curWeek;
  const future = week > curWeek;
  const weekStart = addDays(mondayOf(block.start), (week - 1) * 7);
  const go = (w: number) => { setViewWeek(w === curWeek ? null : w); setPick(null); setShowTraining(false); };
  // Orden dieser Woche: Harlequin wechselt wöchentlich, bei drei Tagen die verdichtete Form
  const focus = focusFor(state, block, week) ?? baseFocus;
  const extTest = followedByTest(state.plan, block);
  const test = !extTest && isTestWeek(baseFocus, block, week);
  const deload = isDeloadWeek(baseFocus, week);
  const rkey = `${block.id}:${week}`;
  const beforeTest = extTest ? week === total : isTestWeek(baseFocus, block, week + 1);
  const reduced = deload || !!state.reduced[rkey] || beforeTest;
  const days = dayRoleMap(state, block, focus);
  const todayWd = weekdayOf(today);
  const doneRoles = new Set(state.sessions.filter((s) => s.blockId === block.id && s.week === week && s.done).map((s) => s.role));
  const defaultDay = isCur
    ? days.find((d) => d.day === todayWd && !doneRoles.has(d.role))?.day ?? days.find((d) => !doneRoles.has(d.role))?.day ?? days[0]?.day
    : days[0]?.day;
  /** Datum für Einträge: heute in der laufenden Woche, sonst der Wochentag der gewählten Woche */
  const dateFor = (d: Weekday) => (isCur ? today : addDays(weekStart, WEEKDAYS.indexOf(d)));
  const sel = days.find((d) => d.day === (pick ?? defaultDay));
  const profile = sel ? state.equipment.find((e) => e.id === sel.profileId) : undefined;

  return (
    <div className="stack">
      <div className="card hero">
        <div className="hero-top">
          <div>
            <div className="hero-focus">{baseFocus.name}</div>
            <div className="muted small">{baseFocus.medley ? `Diese Woche: ${focus.name}` : block.label || focus.tagline}</div>
          </div>
          <div className="week-nav">
            <button onClick={() => go(week - 1)} disabled={week <= 1} aria-label="Vorige Woche">‹</button>
            <div className="hero-week">Woche {Math.min(week, total)}<span className="muted">/{total}</span></div>
            <button onClick={() => go(week + 1)} disabled={week >= total} aria-label="Nächste Woche">›</button>
          </div>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (100 * week) / total)}%` }} /></div>
        <div className="tags">
          {!isCur && <span className="tag amber">{future ? "Vorschau" : "vergangen"} · ab {fmtDate(weekStart)}</span>}
          <span className="tag">{isAWeek(week) ? "A-Woche" : "B-Woche"}</span>
          {test && <span className="tag teal">Testwoche</span>}
          {deload && <span className="tag">Entlastung −1 Satz</span>}
          {!deload && beforeTest && <span className="tag">vor der Testwoche −1 Satz</span>}
        </div>
        {!isCur && <button className="btn ghost small back-now" onClick={() => go(curWeek)}>Zur aktuellen Woche</button>}
        {!deload && !future && (
          <label className="check small">
            <input type="checkbox" checked={!!state.reduced[rkey]} onChange={(e) => update((st) => ({ ...st, reduced: { ...st.reduced, [rkey]: e.target.checked } }))} />
            <span>Diese Woche −1 Satz (müde, krank, viel los)</span>
          </label>
        )}
      </div>

      {test && future ? (
        <div className="card stack">
          <strong>Testwoche</strong>
          <ul className="slot-list">{TESTWEEK.cups.map((c) => <li key={c.id}><strong>{c.name}</strong> · {c.place}: {c.tests.map((t) => t.name).join(", ")}</li>)}</ul>
          <button className="btn ghost small" onClick={() => setShowTraining(true)}>Trainingswoche stattdessen ansehen</button>
        </div>
      ) : null}
      {test && future && !showTraining ? null : test && !showTraining ? (
        <>
          <TestWeek state={state} update={update} block={block} />
          <button className="btn ghost" onClick={() => setShowTraining(true)}>Stattdessen normal trainieren</button>
        </>
      ) : (
        <>
          <div className="days">
            {days.map((d) => {
              const r = focus.roles[d.role];
              const p = state.equipment.find((e) => e.id === d.profileId);
              const done = doneRoles.has(d.role);
              return (
                <button key={d.day} className={`day-btn ${sel?.day === d.day ? "on" : ""} ${done ? "done" : ""} ${isCur && d.day === todayWd ? "today" : ""}`} onClick={() => setPick(d.day)}>
                  <span className="day">{d.day}</span>
                  <span className="day-role">{r?.name ?? d.role}</span>
                  <span className="muted small">{p?.name ?? "?"}{done ? " · ✓" : ""}</span>
                </button>
              );
            })}
          </div>
          {sel && profile && future ? (
            <SessionPreview state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} />
          ) : sel && profile ? (
            <SessionView key={sessionId(block.id, week, sel.role) + profile.id} state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} />
          ) : (
            <div className="card muted">Kein Trainingstag eingerichtet oder Equipment-Profil fehlt. Unter Setup den Wochenplan prüfen.</div>
          )}
        </>
      )}
    </div>
  );
}

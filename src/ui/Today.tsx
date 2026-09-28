import { useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { blockAt, blockWeeks, dayRoleMap, fmtDate, isAWeek, isDeloadWeek, isTestWeek, nextBlock, weekdayOf, weekInBlock } from "../engine/plan";
import type { AppState, Weekday } from "../types";
import { SessionView, sessionId } from "./SessionView";
import { TestWeek } from "./TestWeek";

type Update = (fn: (s: AppState) => AppState) => void;

export function Today({ state, update, today, goPlan }: { state: AppState; update: Update; today: string; goPlan: () => void }) {
  const block = blockAt(state.plan, today);
  const [pick, setPick] = useState<Weekday | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  if (!block) {
    const nb = nextBlock(state.plan, today);
    return (
      <div className="stack">
        <div className="card">
          <h2>Gerade keine Phase geplant</h2>
          <p className="muted">{nb ? `Die nächste Phase beginnt am ${fmtDate(nb.start)} mit ${FOCUS_BY_ID[nb.focusId]?.name ?? "?"}.` : "Lege im Plan eine Phase mit Orden an."}</p>
          <button className="btn primary" onClick={goPlan}>Zum Plan</button>
        </div>
      </div>
    );
  }
  const focus = FOCUS_BY_ID[block.focusId];
  if (!focus) return <div className="card">Der Orden dieser Phase fehlt. <button className="btn small" onClick={goPlan}>Plan öffnen</button></div>;
  const week = weekInBlock(block, today);
  const total = blockWeeks(block);
  const test = isTestWeek(focus, block, week);
  const deload = isDeloadWeek(focus, week);
  const rkey = `${block.id}:${week}`;
  const reduced = deload || !!state.reduced[rkey] || (isTestWeek(focus, block, week + 1));
  const days = dayRoleMap(state, block);
  const todayWd = weekdayOf(today);
  const doneRoles = new Set(state.sessions.filter((s) => s.blockId === block.id && s.week === week && s.done).map((s) => s.role));
  const defaultDay = days.find((d) => d.day === todayWd && !doneRoles.has(d.role))?.day ?? days.find((d) => !doneRoles.has(d.role))?.day ?? days[0]?.day;
  const sel = days.find((d) => d.day === (pick ?? defaultDay));
  const profile = sel ? state.equipment.find((e) => e.id === sel.profileId) : undefined;

  return (
    <div className="stack">
      <div className="card hero">
        <div className="hero-top">
          <div>
            <div className="hero-focus">{focus.name}</div>
            <div className="muted small">{block.label || focus.tagline}</div>
          </div>
          <div className="hero-week">Woche {Math.min(week, total)}<span className="muted">/{total}</span></div>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (100 * week) / total)}%` }} /></div>
        <div className="tags">
          <span className="tag">{isAWeek(week) ? "A-Woche" : "B-Woche"}</span>
          {test && <span className="tag teal">Testwoche</span>}
          {deload && <span className="tag">Entlastung −1 Satz</span>}
          {!deload && isTestWeek(focus, block, week + 1) && <span className="tag">vor der Testwoche −1 Satz</span>}
        </div>
        {!deload && (
          <label className="check small">
            <input type="checkbox" checked={!!state.reduced[rkey]} onChange={(e) => update((st) => ({ ...st, reduced: { ...st.reduced, [rkey]: e.target.checked } }))} />
            <span>Diese Woche −1 Satz (müde, krank, viel los)</span>
          </label>
        )}
      </div>

      {test && !showTraining ? (
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
                <button key={d.day} className={`day-btn ${sel?.day === d.day ? "on" : ""} ${done ? "done" : ""} ${d.day === todayWd ? "today" : ""}`} onClick={() => setPick(d.day)}>
                  <span className="day">{d.day}</span>
                  <span className="day-role">{r?.name ?? d.role}</span>
                  <span className="muted small">{p?.name ?? "?"}{done ? " · ✓" : ""}</span>
                </button>
              );
            })}
          </div>
          {sel && profile ? (
            <SessionView key={sessionId(block.id, week, sel.role) + profile.id} state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={today} reduced={reduced} />
          ) : (
            <div className="card muted">Kein Trainingstag eingerichtet oder Equipment-Profil fehlt. Unter Setup den Wochenplan prüfen.</div>
          )}
        </>
      )}
    </div>
  );
}

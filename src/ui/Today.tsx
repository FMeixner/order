import { useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { addDays, blockAt, daysBetween, focusName, followedByTest, isTestBlock, blockWeeks, dayRoleMap, fmtDate, isDeloadWeek, isTestWeek, mondayOf, nextBlock, weekdayOf, weekInBlock } from "../engine/plan";
import { TESTWEEK } from "../data";
import type { AppState, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { isRunBlock, SessionPreview, SessionView, sessionId } from "./SessionView";
import { focusFor } from "../engine/weekplan";
import { exportState } from "../store";
import { TestWeek } from "./TestWeek";
import { Seg } from "./common";
import { RavenToday, ravenOn } from "./Raven";

type Update = (fn: (s: AppState) => AppState) => void;

export function Today({ state, update, today, goPlan }: { state: AppState; update: Update; today: string; goPlan: () => void }) {
  const block = blockAt(state.plan, today);
  const [pick, setPick] = useState<Weekday | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [adjust, setAdjust] = useState(false);
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
      <TestWeek state={state} update={update} block={block} today={today} />
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
  // Wiedereinstieg: letzte abgeschlossene Einheit liegt 10 Tage oder mehr zurück
  // gilt für die ganze Woche: Abstand zwischen der letzten Einheit vor dieser Woche und der ersten in dieser Woche (oder heute)
  const lastBefore = state.sessions.filter((s) => s.done && s.date < weekStart).map((s) => s.date).sort().pop();
  const firstThis = state.sessions.filter((s) => s.done && s.date >= weekStart).map((s) => s.date).sort()[0] ?? today;
  const pauseDays = lastBefore ? daysBetween(lastBefore, firstThis) : 0;
  const comeback = isCur && pauseDays >= 10;
  const reduced = deload || !!state.reduced[rkey] || beforeTest || comeback;
  const days = dayRoleMap(state, block, focus);
  const todayWd = weekdayOf(today);
  const doneRoles = new Set(state.sessions.filter((s) => s.blockId === block.id && s.week === week && s.done).map((s) => s.role));
  const defaultDay = isCur
    ? days.find((d) => d.day === todayWd && !doneRoles.has(d.role))?.day ?? days.find((d) => !doneRoles.has(d.role))?.day ?? days[0]?.day
    : days[0]?.day;
  /** Datum für Einträge: heute in der laufenden Woche, sonst der Wochentag der gewählten Woche */
  const dateFor = (d: Weekday) => (isCur ? today : addDays(weekStart, WEEKDAYS.indexOf(d)));
  const sel = days.find((d) => d.day === (pick ?? defaultDay));
  // Trainingsort für diesen Tag: Standard aus dem Wochenplan, heute umschaltbar
  const pidOf = (d: { role: string; profileId: string }) => state.profileFor?.[sessionId(block.id, week, d.role)] ?? d.profileId;
  const profile = sel ? state.equipment.find((e) => e.id === pidOf(sel)) : undefined;
  const setPlace = (pid: string) => sel && update((st) => {
    const pf = { ...(st.profileFor ?? {}) };
    const k = sessionId(block.id, week, sel.role);
    if (pid === sel.profileId) delete pf[k]; else pf[k] = pid;
    return { ...st, profileFor: pf };
  });

  // Anpassungen für heute, gebündelt hinter dem Zahnrad neben der Überschrift der Einheit
  const sid = sel ? sessionId(block.id, week, sel.role) : "";
  const hasRun = !!(sel && focus.roles[sel.role]?.blocks.some(isRunBlock));
  const canReduce = !deload && !future;
  const activeAdj = sel ? [profile && profile.id !== sel.profileId, canReduce && !!state.reduced[rkey], hasRun && !!state.noRun?.[sid]].filter(Boolean).length : 0;
  const adjustButton = (
    <button className={`btn ghost small adjust-btn ${activeAdj ? "on" : ""}`} onClick={() => setAdjust((o) => !o)} aria-expanded={adjust} aria-label="Anpassen für heute">
      <span aria-hidden>⚙</span> Anpassen{activeAdj ? ` · ${activeAdj}` : ""}
    </button>
  );
  const adjustPanel = adjust && sel ? (
    <div className="card stack adjust-panel">
      {state.equipment.length > 1 && (
        <div className="stack">
          <span className="field-label">Ort für diese Einheit</span>
          <Seg value={profile?.id ?? sel.profileId} options={state.equipment.map((e) => ({ value: e.id, label: e.name }))} onChange={setPlace} />
        </div>
      )}
      {canReduce && (
        <label className="check small">
          <input type="checkbox" checked={!!state.reduced[rkey]} onChange={(e) => update((st) => ({ ...st, reduced: { ...st.reduced, [rkey]: e.target.checked } }))} />
          <span>Diese Woche −1 Satz (müde, krank, viel los)</span>
        </label>
      )}
      {hasRun && (
        <label className="check small">
          <input type="checkbox" checked={!!state.noRun?.[sid]} onChange={(e) => update((st) => ({ ...st, noRun: { ...(st.noRun ?? {}), [sid]: e.target.checked } }))} />
          <span>Heute kein Laufen möglich: Bestie statt Lauf</span>
        </label>
      )}
    </div>
  ) : null;

  const doneCount = state.sessions.filter((s) => s.done).length;
  const backupAge = state.lastBackup ? daysBetween(state.lastBackup, today) : null;
  const needBackup = doneCount >= 3 && (backupAge == null || backupAge >= 14);
  return (
    <div className="stack">
      {needBackup && (
        <div className="note small row between wrap">
          <span>{backupAge == null ? "Noch keine Sicherung." : `Letzte Sicherung vor ${backupAge} Tagen.`} Deine Daten liegen nur auf diesem Gerät.</span>
          <button className="btn small" onClick={() => { exportState(state); update((st) => ({ ...st, lastBackup: today })); }}>Jetzt sichern</button>
        </div>
      )}
      {state.user.skills == null && state.user.level !== "einsteiger" && (
        <div className="note small">Tipp: Unter Setup › Können angeben, was sitzt (Klimmzug, Pistol Squat, Muscle-Up …). Dann passt die App Übungen und Bestien an.</div>
      )}
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
        {(!isCur || test || deload || beforeTest) && <div className="tags">
          {!isCur && <span className="tag amber">{future ? "Vorschau" : "vergangen"} · ab {fmtDate(weekStart)}</span>}
          {test && <span className="tag teal">Testwoche</span>}
          {deload && <span className="tag">Entlastung −1 Satz</span>}
          {!deload && beforeTest && <span className="tag">vor der Testwoche −1 Satz</span>}
        </div>}
        {comeback && <div className="note small">Willkommen zurück. Nach {pauseDays} Tagen Pause läuft diese Woche mit −1 Satz, und Gewichte starten etwas leichter. Ab nächster Woche geht es normal weiter.</div>}
        {!isCur && <button className="btn ghost small back-now" onClick={() => go(curWeek)}>Zur aktuellen Woche</button>}
      </div>

      {ravenOn(state) && <RavenToday key={`${block.id}:${today}`} state={state} update={update} block={block} today={today} />}

      {test && future ? (
        <div className="card stack">
          <strong>Testwoche</strong>
          <ul className="slot-list">{TESTWEEK.cups.map((c) => <li key={c.id}><strong>{c.name}</strong> · {c.place}: {c.tests.map((t) => t.name).join(", ")}</li>)}</ul>
          <button className="btn ghost small" onClick={() => setShowTraining(true)}>Trainingswoche stattdessen ansehen</button>
        </div>
      ) : null}
      {test && future && !showTraining ? null : test && !showTraining ? (
        <>
          <TestWeek state={state} update={update} block={block} today={today} />
          <button className="btn ghost" onClick={() => setShowTraining(true)}>Stattdessen normal trainieren</button>
        </>
      ) : (
        <>
          <div className="days">
            {days.map((d) => {
              const r = focus.roles[d.role];
              const p = state.equipment.find((e) => e.id === pidOf(d));
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
            <SessionPreview state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} headAction={adjustButton} headPanel={adjustPanel} />
          ) : sel && profile ? (
            <SessionView key={sessionId(block.id, week, sel.role) + profile.id} state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} headAction={adjustButton} headPanel={adjustPanel} />
          ) : (
            <div className="card muted">Kein Trainingstag eingerichtet oder Equipment-Profil fehlt. Unter Setup den Wochenplan prüfen.</div>
          )}
        </>
      )}
    </div>
  );
}

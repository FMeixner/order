import { useState } from "react";
import { addDays, blockFocus, roleAt, blockAt, daysBetween, focusName, followedByTest, isTestBlock, blockWeeks, dayRoleMap, fmtDate, isDeloadWeek, isTestWeek, mondayOf, nextBlock, weekdayOf, weekInBlock } from "../engine/plan";
import { TESTWEEK } from "../data";
import type { AppState, PlanBlock, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { SessionPreview, SessionView } from "./SessionView";
import { sessionId } from "./session/ctx";
import { isRunBlock, unpinBeasts } from "./session/items";
import { focusFor } from "../engine/weekplan";
import { dayMods, rememberMod, remembered, toggleMod, withQuiet, type DayKey } from "../engine/dayadj";
import { canShorten } from "../engine/shortday";

const DAY_NAME: Record<Weekday, string> = { Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch", Do: "Donnerstag", Fr: "Freitag", Sa: "Samstag", So: "Sonntag" };
import { exportState } from "../store";
import { TestWeek } from "./TestWeek";
import { Seg } from "./common";
import { RavenBadge, ravenOn } from "./Raven";

type Update = (fn: (s: AppState) => AppState) => void;

/** Alle Trainingstage dieser Woche erledigt? */
function weekDone(state: AppState, b: PlanBlock, week: number): boolean {
  if (isTestBlock(b)) return false;
  const f = focusFor(state, b, week);
  if (!f) return false;
  const days = dayRoleMap(state, b, f, week);
  const done = new Set(state.sessions.filter((s) => s.blockId === b.id && s.week === week && s.done).map((s) => s.role));
  return days.length > 0 && days.every((d) => done.has(d.role));
}

export function Today({ state, update, today, goPlan }: { state: AppState; update: Update; today: string; goPlan: () => void }) {
  // Woche geschafft: die Folgewoche ist ab sofort die laufende, voll bearbeitbar (auch über eine Phasengrenze)
  const todayBlock = blockAt(state.plan, today);
  const nextMon = addDays(mondayOf(today), 7);
  const ahead = !!todayBlock && weekDone(state, todayBlock, weekInBlock(todayBlock, today)) && !!blockAt(state.plan, nextMon);
  const anchor = ahead ? nextMon : today;
  const block = blockAt(state.plan, anchor);
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
  const baseFocus = blockFocus(block);
  if (!baseFocus) return <div className="card">Der Orden dieser Phase fehlt. <button className="btn small" onClick={goPlan}>Plan öffnen</button></div>;
  const curWeek = weekInBlock(block, anchor);
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
  const beforeTest = extTest ? week === total : isTestWeek(baseFocus, block, week + 1);
  // Wiedereinstieg: letzte abgeschlossene Einheit liegt 10 Tage oder mehr zurück
  // gilt für die ganze Woche: Abstand zwischen der letzten Einheit vor dieser Woche und der ersten in dieser Woche (oder heute)
  const lastBefore = state.sessions.filter((s) => s.done && s.date < weekStart).map((s) => s.date).sort().pop();
  const firstThis = state.sessions.filter((s) => s.done && s.date >= weekStart).map((s) => s.date).sort()[0] ?? today;
  const pauseDays = lastBefore ? daysBetween(lastBefore, firstThis) : 0;
  const comeback = isCur && pauseDays >= 10;
  const sysReduced = deload || beforeTest || comeback;
  const days = dayRoleMap(state, block, focus, week);
  const todayWd = weekdayOf(today);
  const doneRoles = new Set(state.sessions.filter((s) => s.blockId === block.id && s.week === week && s.done).map((s) => s.role));
  // Vorwahl: heute, sonst die nächste offene Einheit, sonst die erste offene
  const open = days.filter((d) => !doneRoles.has(d.role));
  const inWeek = today >= weekStart;
  const ti = WEEKDAYS.indexOf(todayWd);
  const defaultDay = isCur
    ? (inWeek ? open.find((d) => d.day === todayWd) ?? open.find((d) => WEEKDAYS.indexOf(d.day) > ti) ?? open[0] : open[0])?.day ?? days[0]?.day
    : days[0]?.day;
  /** Datum für Einträge: heute in der laufenden Woche, sonst der Wochentag der gewählten Woche */
  const dateFor = (d: Weekday) => (isCur ? today : addDays(weekStart, WEEKDAYS.indexOf(d)));
  const sel = days.find((d) => d.day === (pick ?? defaultDay));
  // Trainingsort für diesen Tag: Standard aus dem Wochenplan, heute umschaltbar
  const pidOf = (d: { role: string; profileId: string }) => state.profileFor?.[sessionId(block.id, week, d.role)] ?? d.profileId;
  const profile0 = sel ? state.equipment.find((e) => e.id === pidOf(sel)) : undefined;
  const mods = sel ? dayMods(state, block, week, sel.role, sel.day) : null;
  const reduced = sysReduced || !!mods?.light;
  const profile = profile0 && withQuiet(profile0, !!mods?.quiet);
  const setPlace = (pid: string) => sel && update((st) => {
    const pf = { ...(st.profileFor ?? {}) };
    const k = sessionId(block.id, week, sel.role);
    if (pid === sel.profileId) delete pf[k]; else pf[k] = pid;
    return unpinBeasts({ ...st, profileFor: pf }, (s) => s.id === k);
  });

  // Anpassungen für heute, gebündelt hinter dem Zahnrad neben der Überschrift der Einheit
  const sid = sel ? sessionId(block.id, week, sel.role) : "";
  const role0 = sel ? focus.roles[sel.role] : undefined;
  const hasRun = !!(role0 && roleAt(role0, profile ?? undefined).blocks.some(isRunBlock));
  const canAdjust = !!role0 && !future;
  // Intensiv: nur mit Bestie oder Schwert am Tag und nicht in Wochen, die ohnehin leichter laufen
  const canBoost = canAdjust && !sysReduced
    // Der Tag, wie der Orden ihn vorsieht (Leise kann eine Bestie verschieben, Intensiv soll trotzdem wählbar bleiben)
    && ((baseFocus.medley ? undefined : baseFocus.roles[sel!.role]) ?? role0!).blocks.some((b) => b.type === "beast" || (b.type === "module" && b.module === "sword" && !!profile0?.has.sword));
  const chips: { k: DayKey | "intense"; label: string; on: boolean; disabled?: boolean; info: string }[] = mods ? [
    { k: "short", label: "Kurz", on: mods.short, disabled: !role0 || !canShorten(role0), info: remembered(state, block, sel!.role, sel!.day).short ? "Nur die drei Kernübungen. Fixiert: Die übrigen Tage der Woche gleichen aus, wenn es das Ziel des Ordens braucht." : days.findIndex((d) => d.day === sel!.day) === days.length - 1 ? "Nur die drei Kernübungen. Letzter Tag der Woche, daher kein Ausgleich." : "Nur die drei Kernübungen. Die Tage danach gleichen aus, wenn es das Ziel des Ordens braucht." },
    { k: "light", label: "Leicht", on: mods.light || sysReduced, disabled: sysReduced, info: sysReduced ? "Diese Woche läuft ohnehin mit −1 Satz." : "−1 Satz je Übung, Bestien nur als Plage." },
    { k: "intense", label: "Intensiv", on: mods.intense, disabled: !canBoost, info: "Bestien eine Klasse länger, Schwertübungen +1 Satz. Kraft und Ausdauer bleiben." },
    { k: "quiet", label: "Leise", on: mods.quiet, info: "Leise Bestie ohne Sprünge, Burpees und Sprints. Kein Laufen, keine Intervalle, kurzes Warm-up." },
  ] : [];
  const weekMatch = (s: { blockId: string; week: number }) => s.blockId === block.id && s.week === week;
  // Kurz verändert die ganze Woche (Ausgleich), der Rest nur diesen Tag
  const flip = (k: DayKey | "intense") => sel && update((st) => unpinBeasts(toggleMod(st, block, week, sel.role, sel.day, k), k === "short" || k === "quiet" ? weekMatch : (s) => s.id === sid));
  const remember = (k: "short" | "quiet", on: boolean) => sel && update((st) => unpinBeasts(rememberMod(st, block, week, sel.role, sel.day, k, on), weekMatch));
  const mem = sel ? remembered(state, block, sel.role, sel.day) : { short: false, quiet: false };
  const activeAdj = sel ? [profile0 && profile0.id !== sel.profileId, mods?.short, mods?.light, mods?.intense, mods?.quiet, hasRun && !!state.noRun?.[sid]].filter(Boolean).length : 0;
  const modsLabel = chips.filter((c) => c.on).map((c) => c.label).join(" · ");
  const adjustButton = (
    <button className={`btn ghost small adjust-btn ${activeAdj ? "on" : ""}`} onClick={() => setAdjust((o) => !o)} aria-expanded={adjust} aria-label="Anpassen für heute">
      <span aria-hidden>⚙</span> Anpassen{activeAdj ? ` · ${activeAdj}` : ""}
    </button>
  );
  const adjustPanel = adjust && sel ? (
    <div className="card stack adjust-panel">
      {canAdjust && (
        <div className="stack">
          <div className="day-mods" role="group" aria-label="Heute">
            {chips.map((c) => (
              <button key={c.k} className={`mod-chip ${c.on ? "on" : ""}`} aria-pressed={c.on} disabled={c.disabled} onClick={() => flip(c.k)}>{c.label}</button>
            ))}
          </div>
          {chips.filter((c) => c.on).map((c) => <div key={c.k} className="muted small"><strong>{c.label}:</strong> {c.info}</div>)}
          {(["short", "quiet"] as const).filter((k) => mods?.[k] || mem[k]).map((k) => (
            <label key={k} className="check small">
              <input type="checkbox" checked={mem[k]} onChange={(e) => remember(k, e.target.checked)} />
              <span>{k === "short" ? "Kurz" : "Leise"} für jeden {DAY_NAME[sel.day]} fixieren</span>
            </label>
          ))}
        </div>
      )}
      {state.equipment.length > 1 && (
        <div className="stack">
          <span className="field-label">Ort für diese Einheit</span>
          <Seg value={profile0?.id ?? sel.profileId} options={state.equipment.map((e) => ({ value: e.id, label: e.name }))} onChange={setPlace} />
        </div>
      )}
      {hasRun && (
        <label className="check small">
          <input type="checkbox" checked={!!state.noRun?.[sid]} onChange={(e) => update((st) => unpinBeasts({ ...st, noRun: { ...(st.noRun ?? {}), [sid]: e.target.checked } }, (s) => s.id === sid))} />
          <span>Heute kein Laufen möglich: Bestie statt Lauf</span>
        </label>
      )}
    </div>
  ) : null;

  const doneCount = state.sessions.filter((s) => s.done).length;
  const backupAge = state.lastBackup ? daysBetween(state.lastBackup, today) : null;
  const needBackup = doneCount >= 3 && (backupAge == null || backupAge >= 14) && (state.autoBackup ?? "week") === "off";
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
            <div className="hero-name">
              <div className="hero-focus">{focusName(baseFocus.id)}</div>
              {ravenOn(state) && <RavenBadge key={`${block.id}:${today}`} state={state} update={update} block={block} today={today} />}
            </div>
            <div className="muted small">{baseFocus.medley ? `Diese Woche: ${focusName(focus.id)}` : block.label || focus.tagline}</div>
          </div>
          <div className="week-nav">
            <button onClick={() => go(week - 1)} disabled={week <= 1} aria-label="Vorige Woche">‹</button>
            <div className="hero-week" aria-label={`Woche ${Math.min(week, total)} von ${total}`}><span className="wk-word">Woche </span>{Math.min(week, total)}<span className="muted">/{total}</span></div>
            <button onClick={() => go(week + 1)} disabled={week >= total} aria-label="Nächste Woche">›</button>
          </div>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (100 * week) / total)}%` }} /></div>
        {(!isCur || ahead || test || deload || beforeTest) && <div className="tags">
          {isCur && ahead && <span className="tag teal">Vorwoche geschafft · weiter ab {fmtDate(weekStart)}</span>}
          {!isCur && <span className="tag amber">{future ? "Vorschau" : "vergangen"} · ab {fmtDate(weekStart)}</span>}
          {test && <span className="tag teal">Testwoche</span>}
          {deload && <span className="tag">Entlastung −1 Satz</span>}
          {!deload && beforeTest && <span className="tag">vor der Testwoche −1 Satz</span>}
        </div>}
        {comeback && <div className="note small">Willkommen zurück. Nach {pauseDays} Tagen Pause läuft diese Woche mit −1 Satz, und Gewichte starten etwas leichter. Ab nächster Woche geht es normal weiter.</div>}
        {!isCur && <button className="btn ghost small back-now" onClick={() => go(curWeek)}>Zur aktuellen Woche</button>}
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
                <button key={d.day} className={`day-btn ${sel?.day === d.day ? "on" : ""} ${done ? "done" : ""} ${isCur && inWeek && d.day === todayWd ? "today" : ""}`} onClick={() => setPick(d.day)}>
                  <span className="day">{d.day}</span>
                  <span className="day-role">{r?.name ?? d.role}</span>
                  <span className="muted small">{p?.name ?? "?"}{done ? " · ✓" : ""}</span>
                </button>
              );
            })}
          </div>
          {sel && profile && future ? (
            <SessionPreview state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} modsLabel={modsLabel} headAction={adjustButton} headPanel={adjustPanel} />
          ) : sel && profile ? (
            <SessionView key={sessionId(block.id, week, sel.role) + profile.id} state={state} update={update} block={block} focus={focus} week={week} roleKey={sel.role} profile={profile} date={dateFor(sel.day)} reduced={reduced} modsLabel={modsLabel} headAction={adjustButton} headPanel={adjustPanel} />
          ) : (
            <div className="card muted">Kein Trainingstag eingerichtet oder Equipment-Profil fehlt. Unter Setup den Wochenplan prüfen.</div>
          )}
        </>
      )}
    </div>
  );
}

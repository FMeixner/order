import { useState } from "react";
import { compassOf } from "../engine/compass";
import { klammerName } from "../engine/klammer";
import { KCAL_LABEL } from "../engine/kcal";
import { KlammerIcon, Sign } from "./Signs";
import { addDays, blockFocus, roleAt, blockAt, daysBetween, focusName, followedByTest, isWeaponModule, weaponTag, isTestBlock, blockWeeks, dayRoleMap, fmtDate, isDeloadWeek, isTestWeek, mondayOf, nextBlock, weekdayOf, weekInBlock } from "../engine/plan";
import type { AppState, PlanBlock, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { SessionPreview, SessionView } from "./SessionView";
import { runSubOf, sessionId } from "./session/ctx";
import { SUB_LABEL } from "../engine/cardio";
import { isRunBlock, unpinBeasts } from "./session/items";
import { focusFor } from "../engine/weekplan";
import { dayMods, rememberMod, remembered, setSkip, toggleMod, withDay, type DayKey, type FixKey } from "../engine/dayadj";
import { deloadAdvice, isDeloaded, setDeload } from "../engine/deload";

const FIX_LABEL: Record<FixKey, string> = { short: "Kurz", quiet: "Leise", tight: "Kein Platz" };

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
  // Ausgefallene Einheiten zählen als erledigt: Ihr Wichtigstes steckt in den Tagen danach
  return days.length > 0 && days.every((d) => done.has(d.role) || !!f.roles[d.role]?.skipped);
}

export function Today({ state, update, today, goPlan, onOptimize }: { state: AppState; update: Update; today: string; goPlan: () => void; onOptimize?: () => void }) {
  // Woche(n) geschafft: Jede voll erledigte Woche vor der heutigen zählt als vorbei — auch mehrere hintereinander
  // (schnelles Nachtragen oder Durchklicken) und über eine Phasengrenze hinweg. Die Ansicht springt in die
  // erste Woche, die noch nicht komplett ist.
  let anchor = today;
  for (let guard = 0; guard < 60; guard++) {
    const ab = blockAt(state.plan, anchor);
    if (!ab || isTestBlock(ab)) break;
    if (!weekDone(state, ab, weekInBlock(ab, anchor))) break;
    const nm = addDays(mondayOf(anchor), 7);
    if (!blockAt(state.plan, nm)) break;
    anchor = nm;
  }
  const ahead = anchor !== today;
  const block = blockAt(state.plan, anchor);
  const [pick, setPick] = useState<Weekday | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  const [view, setView] = useState<{ id: string; w: number } | null>(null);
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
      <TestWeek state={state} update={update} block={block} today={today} onPlan={onOptimize} />
    </div>
  );
  const baseFocus = blockFocus(block);
  if (!baseFocus) return <div className="card">Der Orden dieser Phase fehlt. <button className="btn small" onClick={goPlan}>Plan öffnen</button></div>;
  const curWeek = weekInBlock(block, anchor);
  const total = blockWeeks(block);
  const extTest = followedByTest(state.plan, block);
  // Folgt auf diesen Orden direkt eine Testwoche, öffnet der Pfeil in der letzten Woche die Vorschau
  const testBlock = extTest ? state.plan.find((x) => isTestBlock(x) && x.start === addDays(block.end, 1)) ?? null : null;
  const week = view?.id === block.id ? view.w : curWeek;
  const compass = compassOf(state, block, Math.min(week, total));
  const isCur = week === curWeek;
  const future = week > curWeek;
  const weekStart = addDays(mondayOf(block.start), (week - 1) * 7);
  const go = (w: number) => { setView(w === curWeek ? null : { id: block.id, w }); setPick(null); setShowTraining(false); };
  // Orden dieser Woche: Harlequin wechselt wöchentlich, bei drei Tagen die verdichtete Form
  const focus = focusFor(state, block, week) ?? baseFocus;
  const test = !extTest && isTestWeek(baseFocus, block, week);
  const deload = isDeloadWeek(baseFocus, week);
  const entlastet = isDeloaded(state, block, week);
  const beforeTest = extTest ? week === total : isTestWeek(baseFocus, block, week + 1);
  // Folgende Testwoche: ab dem Wochenende davor (oder wenn die Woche geschafft ist) echt geplant, vorher Vorschau
  const testLive = !!testBlock && (today >= addDays(testBlock.start, -2) || weekDone(state, block, total));
  if (testBlock && week > total) return (
    <div className="stack">
      <div className="card hero">
        <div className="hero-top">
          <div>
            <div className="hero-focus">Testwoche</div>
            <div className="muted small">{fmtDate(testBlock.start)} – {fmtDate(testBlock.end)} · folgt auf diesen Orden</div>
          </div>
          <div className="week-nav">
            <button onClick={() => go(total)} aria-label="Vorige Woche">‹</button>
            <div className="hero-week">{testLive ? "Test" : "Vorschau"}</div>
            <button disabled aria-label="Nächste Woche">›</button>
          </div>
        </div>
        <div className="progress"><div style={{ width: "100%" }} /></div>
        {!testLive && <div className="tags"><span className="tag amber">Vorschau · eintragen ab dem Wochenende davor</span></div>}
        {!isCur && <button className="btn ghost small back-now" onClick={() => go(curWeek)}>Zur aktuellen Woche</button>}
      </div>
      <TestWeek state={state} update={update} block={testBlock} today={today} preview={!testLive} onPlan={onOptimize} />
    </div>
  );
  // Wiedereinstieg: letzte abgeschlossene Einheit liegt 10 Tage oder mehr zurück
  // gilt für die ganze Woche: Abstand zwischen der letzten Einheit vor dieser Woche und der ersten in dieser Woche (oder heute)
  // Testwerte zählen als Training: Nach der Testwoche gibt es kein „Willkommen zurück“ (die Testwoche ist die Entlastung)
  const testDates = Object.values(state.tests).flat().map((r) => r.date);
  const lastBefore = [...state.sessions.filter((s) => s.done).map((s) => s.date), ...testDates].filter((d) => d < weekStart).sort().pop();
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
  const reduced = sysReduced;
  const profile = profile0 && withDay(profile0, { quiet: !!mods?.quiet, tight: !!mods?.tight });
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
  // Laufen ersetzen: bei Laufblöcken und Bestien (Bestien mit Laufstrecke werden umgerechnet)
  const hasBeast = !!(role0 && role0.blocks.some((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher)));
  const runSub = sel ? runSubOf(state, sid) : undefined;
  const canAdjust = !!role0 && !future;
  // Intensiv: nur mit Bestie oder Schwert am Tag und nicht in Wochen, die ohnehin leichter laufen
  const canBoost = canAdjust && !sysReduced && !entlastet
    // Der Tag, wie der Orden ihn vorsieht (Leise kann eine Bestie verschieben, Intensiv soll trotzdem wählbar bleiben)
    && ((baseFocus.medley ? undefined : baseFocus.roles[sel!.role]) ?? role0!).blocks.some((b) => b.type === "beast" || (b.type === "module" && isWeaponModule(b.module) && !!profile0?.has.sword));
  const chips: { k: DayKey | "intense"; label: string; on: boolean; disabled?: boolean; info: string }[] = mods ? [
    { k: "short", label: "Kurz", on: mods.short, disabled: !role0, info: remembered(state, block, sel!.role, sel!.day).short ? "Die vier Kernübungen, Bestie und Schwerttraining kürzer, Ziel 35 Minuten. Fixiert: Die übrigen Tage der Woche gleichen aus, wenn es das Ziel des Ordens braucht." : days.findIndex((d) => d.day === sel!.day) === days.length - 1 ? "Die vier Kernübungen, Bestie und Schwerttraining kürzer, Ziel 35 Minuten. Letzter Tag der Woche, daher kein Ausgleich." : "Die vier Kernübungen, Bestie und Schwerttraining kürzer, Ziel 35 Minuten. Die Tage danach gleichen aus, wenn es das Ziel des Ordens braucht." },
    { k: "intense", label: "Intensiv", on: mods.intense, disabled: !canBoost, info: "Bestien eine Klasse länger, Schwertübungen +1 Satz. Kraft und Ausdauer bleiben." },
    { k: "quiet", label: "Leise", on: mods.quiet, info: "Leise Bestie und leise Übungen: keine Sprünge, Burpees, Sprints, keine Langhantel vom Boden. Kein Laufen, keine Intervalle, kurzes Warm-up." },
    { k: "tight", label: "Kein Platz", on: mods.tight, info: "Alles auf der Stelle: kein Lunge Walk, Crawl, Carry oder Weitsprung; Bestien ohne Strecke." },
  ] : [];
  const weekMatch = (s: { blockId: string; week: number }) => s.blockId === block.id && s.week === week;
  // Kurz verändert die ganze Woche (Ausgleich), der Rest nur diesen Tag
  const flip = (k: DayKey | "intense") => sel && update((st) => unpinBeasts(toggleMod(st, block, week, sel.role, sel.day, k), k === "short" || k === "quiet" || k === "tight" ? weekMatch : (s) => s.id === sid));
  const remember = (k: FixKey, on: boolean) => sel && update((st) => unpinBeasts(rememberMod(st, block, week, sel.role, sel.day, k, on), weekMatch));
  const mem = sel ? remembered(state, block, sel.role, sel.day) : { short: false, quiet: false, tight: false };
  const skipped = role0?.skipped;
  const lastOpen = sel ? days.slice(days.findIndex((d) => d.day === sel.day) + 1).filter((d) => !doneRoles.has(d.role) && !focus.roles[d.role]?.skipped).length : 0;
  const skip = (on: boolean, grow = false) => sel && update((st) => unpinBeasts(setSkip(st, block, week, sel.role, on, grow), weekMatch));
  const activeAdj = sel ? [mods?.skip, profile0 && profile0.id !== sel.profileId, mods?.short, mods?.intense, mods?.quiet, mods?.tight, (hasRun || hasBeast) && !!runSub].filter(Boolean).length : 0;
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
          {!doneRoles.has(sel.role) && (
            <div className="stack skip-box">
              <button className={`mod-chip ${mods?.skip ? "on" : ""}`} aria-pressed={!!mods?.skip} onClick={() => skip(!mods?.skip, mods?.grow)}>Fällt aus</button>
              <span className="muted small">{lastOpen
                ? "Woche verdichten: Kernübungen und was für die Erhaltung fehlt (4 Sätze je Muskel und Woche) wandern auf die offenen Tage danach. Bestien und Module entfallen. Schwere Grundübungen nie im Superset, nie zwei Beintage hintereinander."
                : "Danach ist diese Woche nichts mehr offen: Die Einheit entfällt ohne Ausgleich. Eine Woche mit etwa einem Drittel des Volumens hält den Stand."}</span>
              {mods?.skip && lastOpen > 0 && (
                <label className="check small">
                  <input type="checkbox" checked={!!mods.grow} onChange={(e) => skip(true, e.target.checked)} />
                  <span>Andere Tage dürfen bis zu 15 Minuten länger werden</span>
                </label>
              )}
            </div>
          )}
          {(["short", "quiet", "tight"] as const).filter((k) => mods?.[k] || mem[k]).map((k) => (
            <label key={k} className="check small">
              <input type="checkbox" checked={mem[k]} onChange={(e) => remember(k, e.target.checked)} />
              <span>{FIX_LABEL[k]} für jeden {DAY_NAME[sel.day]} fixieren</span>
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
      {(hasRun || hasBeast) && (
        <div className="stack">
          <span className="field-label">Laufen ersetzen</span>
          <Seg value={runSub ?? ""} options={[{ value: "", label: "Laufen" }, ...(["row", "bike", "rope", "stair"] as const).filter((k) => k !== "rope" || profile0?.has.rope !== false).map((k) => ({ value: k, label: SUB_LABEL[k] })), ...(hasRun ? [{ value: "beast", label: "Bestie" }] : [])]}
            onChange={(v) => update((st) => {
              const rs = { ...(st.runSub ?? {}) };
              if (v) rs[sid] = v as NonNullable<typeof runSub>; else delete rs[sid];
              const nr = { ...(st.noRun ?? {}) }; delete nr[sid];
              return unpinBeasts({ ...st, runSub: rs, noRun: nr }, (s) => s.id === sid);
            })} />
          {runSub && runSub !== "beast" && <span className="muted small">Umgerechnet nach Belastungszeit, nicht 1:1: 400 m Laufen ≈ 500 m Rudern ≈ 1000 m Rad ≈ 2 Min Seil oder Stepper. Dauerläufe: gleiche Zeit im gleichen Tempo.</span>}
          {runSub === "beast" && <span className="muted small">Laufblöcke werden zu einer Bestie ähnlicher Dauer.</span>}
        </div>
      )}
    </div>
  ) : null;

  const doneCount = state.sessions.filter((s) => s.done).length;
  const backupAge = state.lastBackup ? daysBetween(state.lastBackup, today) : null;
  const needBackup = doneCount >= 3 && (backupAge == null || backupAge >= 14) && (state.autoBackup ?? "week") === "off";
  // Entlastungswoche: Vorschlag nach Rhythmus oder Signalen, nur für die laufende Woche und nie in Test- oder ohnehin leichten Wochen
  const advice = isCur && !test && !sysReduced && !entlastet ? deloadAdvice(state, block, week, today) : null;
  const ease = (v: "ja" | "nein") => update((st) => setDeload(st, block, week, v));
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
      {entlastet && isCur && (
        <div className="note small row between wrap">
          <span>Entlastungswoche: halbe Sätze, keine Bestien. Gewichte, Übungen und Tage bleiben, nächste Woche geht es normal weiter.</span>
          <button className="btn small" onClick={() => ease("nein")}>Weiter normal trainieren</button>
        </div>
      )}
      {advice && (
        <div className="note small row between wrap">
          <span>
            {advice.why === "signale"
              ? `In den letzten zwei Wochen ${advice.count === 3 ? "dreimal" : `${advice.count}-mal`} „zu schwer“ gemeldet. `
              : "Fünf Wochen am Stück — Zeit für eine Entlastungswoche. "}
            Vorschlag: halbe Sätze, keine Bestien, Gewichte und Übungen bleiben.
          </span>
          <span className="row">
            <button className="btn small primary" onClick={() => ease("ja")}>Diese Woche entlasten</button>
            <button className="btn small" onClick={() => ease("nein")}>Normal weiter</button>
          </span>
        </div>
      )}
      <div className="card hero">
        <div className="hero-top">
          <div>
            <div className="hero-name">
              <div className="hero-focus">{focusName(baseFocus.id)}</div>
              {ravenOn(state) && <RavenBadge key={`${block.id}:${today}`} state={state} update={update} block={block} today={today} />}
            </div>
            {baseFocus.medley && <div className="muted small">Diese Woche: {focusName(focus.id)}</div>}
            <div className="compass muted small">
              {compass.klammer && <span className="compass-item"><KlammerIcon id={compass.klammer} size={14} />{klammerName(compass.klammer)}</span>}
              {compass.kcal && <span className="compass-item" title={`Kalorien: ${KCAL_LABEL[compass.kcal]}`}><Sign kind={compass.kcal} size={13} />{KCAL_LABEL[compass.kcal]}</span>}
              {compass.load === "high" && <span className="compass-item warn" title="Diese Woche hohe Alltagslast: mehr geführte Übungen, Satzende-Techniken nur an Ergänzungen">Hohe Last</span>}
              {compass.load !== "high" && compass.dauer && <span className="compass-item warn" title="Mittlere Last schon seit Wochen: Dieser Orden läuft mit mehr geführten Übungen">Dauerlast</span>}
              {compass.next && <span className="compass-item">{compass.next.weeks === 0 ? "nächste Woche" : `in ${compass.next.weeks} Wo.`}: {compass.next.label}</span>}
              {!compass.klammer && !compass.kcal && !compass.next && (block.label || focus.tagline)}
            </div>
          </div>
          <div className="week-nav">
            <button onClick={() => go(week - 1)} disabled={week <= 1} aria-label="Vorige Woche">‹</button>
            <div className="hero-week" aria-label={`Woche ${Math.min(week, total)} von ${total}`}><span className="wk-word">Woche </span>{Math.min(week, total)}<span className="muted">/{total}</span></div>
            <button onClick={() => go(week + 1)} disabled={week >= (testBlock ? total + 1 : total)} aria-label="Nächste Woche">›</button>
          </div>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (100 * week) / total)}%` }} /></div>
        {(!isCur || ahead || test || deload || beforeTest || entlastet) && <div className="tags">
          {isCur && ahead && <span className="tag teal">Vorwoche geschafft · weiter ab {fmtDate(weekStart)}</span>}
          {!isCur && <span className="tag amber">{future ? "Vorschau" : "vergangen"} · ab {fmtDate(weekStart)}</span>}
          {test && <span className="tag teal">Testwoche</span>}
          {entlastet && <span className="tag teal">Entlastungswoche</span>}
          {deload && <span className="tag">Entlastung −1 Satz</span>}
          {!deload && beforeTest && <span className="tag">vor der Testwoche −1 Satz</span>}
        </div>}
        {comeback && <div className="note small">Willkommen zurück. Nach {pauseDays} Tagen Pause läuft diese Woche mit −1 Satz, und Gewichte starten etwas leichter. Ab nächster Woche geht es normal weiter.</div>}
        {!isCur && <button className="btn ghost small back-now" onClick={() => go(curWeek)}>Zur aktuellen Woche</button>}
      </div>


      {test && future && !showTraining ? (
        <>
          <TestWeek state={state} update={update} block={block} today={today} preview />
          <button className="btn ghost small" onClick={() => setShowTraining(true)}>Trainingswoche stattdessen ansehen</button>
        </>
      ) : test && !showTraining ? (
        <>
          <TestWeek state={state} update={update} block={block} today={today} onPlan={onOptimize} />
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
                  <span className="muted small">{r?.skipped ? "fällt aus" : `${p?.name ?? "?"}${r && weaponTag(r.blocks) ? ` · ${weaponTag(r.blocks)}` : ""}${done ? " · ✓" : ""}`}</span>
                </button>
              );
            })}
          </div>
          {sel && skipped ? (
            <div className="stack">
              <div className="card stack skip-card">
                <div className="row between wrap"><h2>{role0!.name} fällt aus</h2>{adjustButton}</div>
                {adjustPanel}
                {skipped.moved.length > 0 && <div className="stack"><span className="field-label">Wandert in die Woche</span><ul className="small">{skipped.moved.map((m) => <li key={m}>{m}</li>)}</ul></div>}
                {skipped.dropped.length > 0 && <div className="muted small">Entfällt: {skipped.dropped.join(", ")}</div>}
                {skipped.unresolved.length > 0 && <div className="note small">Reicht nicht ganz: {skipped.unresolved.join(" · ")}</div>}
                {!skipped.moved.length && <div className="muted small">Kein Ausgleich nötig oder möglich. Eine Woche mit weniger Volumen kostet nichts: Etwa ein Drittel des üblichen Volumens hält Kraft und Muskeln (Bickel et al., 2011).</div>}
                <button className="btn small" onClick={() => skip(false)}>Doch trainieren</button>
              </div>
            </div>
          ) : sel && profile && future ? (
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

import { type ReactNode, useEffect, useState } from "react";
import { IdeasWaiting } from "./Ideas";
import { BEAST_BY_ID, TESTWEEK } from "../data";
import { addDays, expandDrills, fmtDate, focusName, isTestBlock, mondayOf, scheduleFor, trainingDays } from "../engine/plan";
import { variantHint } from "../engine/norms";
import { parseClock } from "../engine/clock";
import type { AppState, Cup, PlanBlock, TestDef, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Collapse, Desc } from "./common";
import { allDrillsDone, DrillList } from "./session/Drills";
import { fmt } from "./Timer";
import { TestTimer } from "./TestTimer";
import { cupDone, closeTestWeek, saveTestResult, skipTestResult } from "../engine/testweek";
import { Evaluation } from "./Evaluation";
import { RavenCup, RavenLines, ravenOn } from "./Raven";
import { evaluateBlock, type TestEval } from "../engine/norms";
import { narratorOf, tournamentOf } from "../engine/saga";
import { Modal } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

function parseValue(raw: string, unit: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (unit === "mmss") return parseClock(raw);
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}
function show(v: number, unit: string): string {
  if (unit === "mmss") return `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, "0")}`;
  const u: Record<string, string> = { s: "s", cm: "cm", m: "m", reps: "Wdh", kg: "kg", bpm: "bpm", ml: "ml/kg/min" };
  return `${String(v).replace(".", ",")} ${u[unit] ?? ""}`;
}

/** Ein Test, ein Versuch (1.36). Gespeichert oder ausgelassen klappt die Zeile nach kurzer Zeit ein wie eine Übungskarte;
    antippen öffnet sie wieder, „Korrigieren“ ersetzt den Wert dieser Testwoche. Tests auf Zeit haben einen Timer.
    Exportiert für das Nachholen im Almanach (1.38). */
export function TestRow({ t, state, block, onSave, onSkip, preview = false }: { t: TestDef; state: AppState; block: PlanBlock; onSave: (value: number, raw: string, variant?: string) => void; onSkip?: (on: boolean) => void; preview?: boolean }) {
  const [val, setVal] = useState("");
  const all = state.tests[t.id] ?? [];
  const [variant, setVariant] = useState<string>(all[all.length - 1]?.variant ?? t.variants?.[0]?.id ?? "");
  const hist = t.variants ? all.filter((h) => (h.variant ?? "") === variant) : all;
  const thisBlock = hist.filter((h) => h.blockId === block.id);
  const prev = hist.filter((h) => h.blockId !== block.id);
  const best = (arr: { value: number }[]) => arr.length ? (t.better === "higher" ? Math.max(...arr.map((x) => x.value)) : Math.min(...arr.map((x) => x.value))) : null;
  const saved = thisBlock.length ? thisBlock[thisBlock.length - 1] : null;
  const skipped = !saved && !!state.testSkips?.[`${block.id}:${t.id}`];
  const done = !preview && (!!saved || skipped);
  const prevBest = best(prev);
  const parsed = parseValue(val, t.unit);
  const [folded, setFolded] = useState(done);
  const [was, setWas] = useState(done);
  useEffect(() => {
    if (done && !was) { const id = setTimeout(() => setFolded(true), 2500); setWas(true); return () => clearTimeout(id); }
    if (!done && was) { setWas(false); setFolded(false); }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (done && folded) {
    return (
      <button className="slot-done test-done" onClick={() => setFolded(false)} aria-label={`${t.name} erledigt, aufklappen`}>
        <span className="slot-done-check" aria-hidden>{skipped ? "–" : "✓"}</span>
        <span className="slot-name">{t.name}</span>
        <span className="muted small">{saved ? show(saved.value, t.unit) : "ausgelassen"}</span>
      </button>
    );
  }
  const save = () => { onSave(parsed!, val, t.variants ? variant : undefined); setVal(""); };
  return (
    <div className="test-row">
      <div className="slot-title"><span className="slot-name">{t.name}</span><Desc text={t.desc} /></div>
      {t.variants && (
        <select value={variant} onChange={preview ? undefined : (e) => setVariant(e.target.value)} disabled={preview} aria-label="Variante">
          {t.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      {t.variants && <div className="muted small">{variantHint(state, block, t.id)}</div>}
      {!preview && t.timer && !skipped && <TestTimer spec={t.timer} onResult={(sec) => { if (t.timer?.mode === "hold") setVal(String(sec).replace(".", ",")); }} />}
      {!preview && !skipped && (
        <div className="row wrap">
          <input type="text" inputMode="decimal" className="test-in" placeholder={saved ? `${show(saved.value, t.unit)} korrigieren` : t.unit === "mmss" ? "m.ss.z" : "Wert"}
            value={val} onChange={(e) => setVal(e.target.value)} />
          <button className="btn small" disabled={parsed == null} onClick={save}>{saved ? "Korrigieren" : "Speichern"}</button>
          {!saved && onSkip && <button className="btn ghost small" onClick={() => onSkip(true)}>Auslassen</button>}
        </div>
      )}
      {skipped && onSkip && <div className="row wrap"><span className="muted small">Ausgelassen (z. B. ohne Material).</span><button className="btn ghost small" onClick={() => onSkip(false)}>Doch testen</button></div>}
      <div className="muted small">
        {saved ? <>Gespeichert: <strong>{show(saved.value, t.unit)}</strong></> : skipped ? null : "Noch kein Wert"}
        {prevBest != null && <> · vorheriger Bestwert {show(prevBest, t.unit)}</>}
      </div>
    </div>
  );
}

/** Bestie auf Zeit als Benchmark eines Cups (1.36): ein Wert je Testwoche, erneutes Speichern korrigiert.
    `today` weitet das Fenster beim Nachholen (1.38): Eine Zeit nach dem Ende der Testwoche zählt zu ihr. */
export function Benchmark({ cup, state, update, block, today, preview = false }: { cup: Cup; state: AppState; update: Update; block: PlanBlock; today: string; preview?: boolean }) {
  const [manual, setManual] = useState("");
  if (!cup.benchmark) return null;
  const winEnd = today > block.end ? today : block.end;
  const withHist = cup.benchmark.pool.filter((id) => (state.beastTimes[id] ?? []).length);
  const id = (withHist.length ? withHist : cup.benchmark.pool)[0];
  const b = BEAST_BY_ID[id];
  const times = state.beastTimes[id] ?? [];
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  return (
    <div className="test-row">
      <div className="slot-name">{cup.benchmark.label}: {b.name}</div>
      <div className="muted small">{b.rounds} Runden · {b.work}</div>
      {!preview && (
        <div className="row">
          <input type="text" inputMode="decimal" className="time-in" placeholder="mm.ss" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="btn small" onClick={() => {
            const p = parseClock(manual);
            if (p == null) { alert(`„${manual}“ verstehe ich nicht. Bitte so: 12.34 oder 12:34.`); return; }
            const sec = Math.round(p);
            // Ein Wert je Testwoche: ein zweites Speichern korrigiert die Zeit dieser Woche (beim Nachholen zählt
            // auch eine spätere Zeit zur Testwoche, deshalb das Fenster bis heute geweitet)
            update((st) => ({ ...st, beastTimes: { ...st.beastTimes, [id]: [...(st.beastTimes[id] ?? []).filter((x) => !(x.date >= block.start && x.date <= winEnd)), { date: new Date().toISOString().slice(0, 10), seconds: sec }] } }));
            setManual("");
          }}>Speichern</button>
        </div>
      )}
      {(() => { const wk = times.filter((x) => x.date >= block.start && x.date <= winEnd).pop(); return wk ? <div className="muted small">Diese Testwoche: <strong>{fmt(wk.seconds)}</strong> · erneut speichern korrigiert</div> : null; })()}
      <div className="muted small">{pr ? `Bestzeit ${fmt(pr)}` : "Noch keine Zeit"}</div>
    </div>
  );
}

/** Testtage (1.3): Die drei Testtage auf deine Trainingstage verteilt — Studio zuerst, Zuhause in der Mitte,
    Park zuletzt (gern am Wochenende). Studio ist der Tag, dessen Ort eine Langhantel hat oder „Studio“ heißt. */
export function testDays(state: AppState, block: PlanBlock): { place: string; day: Weekday; date: string }[] {
  const days = trainingDays(state, block);
  const sch = scheduleFor(state, block);
  const prof = (d: Weekday) => state.equipment.find((p) => p.id === sch[d]);
  const isGym = (d: Weekday) => { const p = prof(d); return !!p && (!!p.barbell || /studio|gym/i.test(p.name)); };
  const pool: Weekday[] = days.length >= 3 ? days : (WEEKDAYS.filter((_, i) => i % 2 === 0) as Weekday[]);
  const studio = pool.find(isGym) ?? pool[0];
  const rest = pool.filter((d) => d !== studio);
  const park = [...rest].reverse().find((d) => d === "Sa" || d === "So") ?? rest[rest.length - 1];
  const home = rest.filter((d) => d !== park).find((d) => !isGym(d)) ?? rest.find((d) => d !== park) ?? rest[0];
  const at = (d: Weekday) => addDays(mondayOf(block.start), WEEKDAYS.indexOf(d));
  return [{ place: "Studio", day: studio, date: at(studio) }, { place: "Zuhause", day: home, date: at(home) }, { place: "Park", day: park, date: at(park) }]
    .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));
}

export function TestWeek({ state, update, block, today, preview = false, onPlan }: { state: AppState; update: Update; block: PlanBlock; today: string; preview?: boolean; onPlan?: () => void }) {
  // Ein Wert je Test und Testwoche: Speichern ersetzt (Korrektur), Auslassen hebt sich damit auf (Engine, 1.38)
  const saveTest = (t: TestDef, value: number, raw: string, variant?: string) =>
    update((st) => saveTestResult(st, block.id, t.id, value, raw, new Date().toISOString().slice(0, 10), variant));
  const skipTest = (t: TestDef, on: boolean) => update((st) => skipTestResult(st, block.id, t.id, on));
  const days = testDays(state, block);
  // Gewählter Testtag: angetippt, sonst heute, sonst der nächste offene, sonst der erste
  const [pick, setPick] = useState<string | null>(null);
  const openDay = days.find((t) => !TESTWEEK.cups.filter((c) => c.place === t.place).every((c) => cupDone(state, block, c)));
  const sel = days.find((t) => t.place === pick) ?? days.find((t) => t.date === today) ?? openDay ?? days[0];
  // Fertig: an jedem Testtag hat jeder Cup mindestens einen Wert (Tests ohne Material dürfen fehlen), oder die Woche ist vorbei
  const has = (id: string) => (state.tests[id] ?? []).some((r) => r.blockId === block.id);
  const allDone = !preview && (days.every((t) => TESTWEEK.cups.filter((c) => c.place === t.place).every((c) => cupDone(state, block, c))) || (today > block.end && TESTWEEK.cups.some((c) => c.tests.some((x) => has(x.id)))));
  return (
    <div className="stack">
      {/* Hinweise und Erzähler hinter Symbolen, wie bei jedem Orden */}
      <div className="row tw-head">
        <span className="muted small">Drei Testtage, jeder frisch</span>
        <Desc text={`Drei Testtage, jeder frisch; Erhaltungskalorien. Gleiche Bedingungen wie beim letzten Mal, Tests ohne Material auslassen. Die Woche davor spitzt zu: weniger Sätze, gleiche Gewichte.${preview ? " Vorschau: erst ansehen — eintragen kannst du ab dem Wochenende davor." : ""}`} />
        {ravenOn(state) && <RavenTournamentBadge state={state} block={block} today={today} />}
      </div>
      {!preview && <IdeasWaiting ideas={state.ideas} />}
      {allDone && <TestSummary state={state} block={block} today={today} onPlan={onPlan} />}
      {/* Wie jede andere Woche: Tage oben, der gewählte Tag zeigt seine Cups */}
      <div className="days wide">
        {days.map((t) => {
          const cups = TESTWEEK.cups.filter((c) => c.place === t.place);
          const done = cups.every((c) => cupDone(state, block, c));
          return (
            <button key={t.place} className={`day-btn ${sel?.place === t.place ? "on" : ""} ${done ? "done" : ""} ${t.date === today ? "today" : ""}`} onClick={() => setPick(t.place)}>
              <span className="day">{t.day}</span>
              <span className="day-role">{t.place}</span>
              <span className="muted small">{cups.map((c) => c.name.replace("-Cup", "")).join(" · ")}{done ? " · ✓" : ""}</span>
            </button>
          );
        })}
      </div>
      {sel && <TestDay state={state} update={update} block={block} today={today} place={sel.place} preview={preview} saveTest={saveTest} skipTest={skipTest} />}
      <Evaluation state={state} blockId={block.id} update={preview ? undefined : update} defaultOpen={false} />
      {!preview && today >= block.start && today <= block.end && <CloseWeek state={state} block={block} today={today} update={update} />}
      <div className="muted small">{preview ? "Vorschau der Testwoche. " : "Die Auswertung füllt sich, sobald du Werte speicherst. Alle Ergebnisse stehen auch im Log. "}Block {fmtDate(block.start)}–{fmtDate(block.end)}.</div>
    </div>
  );
}

/** Testwoche abschließen (1.39): Cups verdient oder ausgelassen, aber die Woche läuft noch — der Knopf beendet
    sie vorfristig. Der folgende Orden beginnt heute, als Anlaufwoche mit den Einheiten ab heute; offene Cups
    bleiben im Almanach nachholbar, das Urteil des Turniers bleibt der Testwoche selbst vorbehalten. */
function CloseWeek({ state, block, today, update }: { state: AppState; block: PlanBlock; today: string; update: Update }) {
  const next = state.plan.filter((b) => b.start > block.end && !isTestBlock(b)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const open = TESTWEEK.cups.filter((c) => !cupDone(state, block, c)).length;
  return (
    <section className="card">
      <div className="row between"><strong>Testwoche abschließen</strong><span className="muted small">{open ? `${open} von ${TESTWEEK.cups.length} Cups offen` : "Alle Cups verdient"}</span></div>
      <div className="muted small">
        {next
          ? `Beendet die Testwoche gestern und lässt ${focusName(next.focusId)} heute beginnen — als Anlaufwoche mit den Einheiten ab heute, der Orden endet wie geplant.`
          : "Beendet die Testwoche gestern. Einen folgenden Orden kannst du ab heute ansetzen."}
        {open > 0 && " Offene Cups lassen sich im Almanach unter „Cups“ nachholen; das Urteil des Turniers gibt es nur in der Testwoche."}
        {" Datumänderungen lassen sich im Phasenblatt jederzeit zurücknehmen."}
      </div>
      <button className="btn" onClick={() => update((st) => closeTestWeek(st, block, today))}>Testwoche abschließen</button>
    </section>
  );
}

/** Ein Testtag wie eine Einheit: ein Warm-up zum Abhaken mit Timer (der zweite Cup am Ort braucht keins),
    dann die Cups, am Ende des Tages das Cool-down. */
function TestDay({ state, update, block, today, place, preview, saveTest, skipTest }: {
  state: AppState; update: Update; block: PlanBlock; today: string; place: string; preview: boolean;
  saveTest: (t: TestDef, value: number, raw: string, variant?: string) => void;
  skipTest: (t: TestDef, on: boolean) => void;
}) {
  const cups = TESTWEEK.cups.filter((c) => c.place === place);
  // Warm-up einmal für den Tag: die Listen aller Cups am Ort, ohne Doppelte, in Reihenfolge des ersten Cups
  const warm = expandDrills([...new Set(cups.flatMap((c) => c.warmup))], state.user, 1);
  const coolLists = cups[cups.length - 1]?.cooldown ?? [];
  const cool = expandDrills(coolLists, state.user, 1);
  const key = `${block.id}:${place}`;
  const done = state.testDrills?.[key] ?? {};
  const toggle = (k: string, i: number) => {
    if (preview) return;
    update((st) => {
      const day = { ...(st.testDrills?.[key] ?? {}) };
      const arr = [...(day[k] ?? [])];
      arr[i] = !arr[i];
      day[k] = arr;
      return { ...st, testDrills: { ...(st.testDrills ?? {}), [key]: day } };
    });
  };
  return (
    <>
      <AutoCollapse title="Warm-up" meta={`${warm.length} Übungen · für den ganzen Tag`} tone="amber" done={allDrillsDone(warm, done, "wu")}>
        <DrillList drills={warm} done={done} prefix="wu" onToggle={toggle} />
      </AutoCollapse>
      {cups.map((cup) => (
        <AutoCollapse key={`${place}:${cup.id}`} title={cup.name} meta={cup.focus} tone="teal" defaultOpen
          done={!preview && cupDone(state, block, cup)}>
          {cup.tests.map((t) => <TestRow key={t.id} t={t} state={state} block={block} preview={preview} onSave={(v, raw, variant) => saveTest(t, v, raw, variant)} onSkip={(on) => skipTest(t, on)} />)}
          <Benchmark cup={cup} state={state} update={update} block={block} today={today} preview={preview} />
          {ravenOn(state) && <RavenCup state={state} block={block} today={today} cupId={cup.id} />}
        </AutoCollapse>
      ))}
      {!preview && cups.every((c) => cupDone(state, block, c)) && <div className="note ok small">Testtag geschafft ✓ {cool.length ? "– noch das Cool-down, dann ist der Tag durch." : "– der Tag ist durch."} Jeder Wert ist schon gespeichert; abschließen musst du nichts.</div>}
      {!preview && <DaySummary state={state} block={block} cups={cups} />}
      {cool.length > 0 && (
        <AutoCollapse title="Cool-down" meta={`${cool.length} Übungen`} tone="amber" done={allDrillsDone(cool, done, "cd")}>
          <DrillList drills={cool} done={done} prefix="cd" onToggle={toggle} />
        </AutoCollapse>
      )}
    </>
  );
}

const unitShow = (v: number, unit: string): string => show(v, unit);
const CHANGE: Record<string, string> = { better: "besser als letztes Mal", same: "gleich (im Messfehler)", worse: "unter letztem Mal" };

/** Eine Zeile je Test: Wert, Norm (Punkte ≈ Perzentil), Verlauf */
function TestLine({ t }: { t: TestEval }) {
  const sc = t.norm && !t.norm.noScore ? t.norm.score : null;
  return (
    <li className="tw-line">
      <span>{t.test.name}: <strong>{unitShow(t.result.value, t.test.unit)}</strong></span>
      {sc != null && <span className={`score ${sc < 40 ? "low" : sc >= 70 ? "high" : ""}`} title={t.norm!.label}>{sc}</span>}
      <span className="muted small">{t.norm ? `${t.norm.label}${t.norm.noScore ? " (nur Orientierung, ohne Punkte)" : t.norm.tier === "B" ? " (Orientierung)" : ""}` : t.why ?? ""}{t.change ? ` · ${CHANGE[t.change]}` : ""}</span>
    </li>
  );
}

/** Tagesbilanz: sobald ein Cup des Tages Werte hat, wie du abschneidest */
function DaySummary({ state, block, cups }: { state: AppState; block: PlanBlock; cups: Cup[] }) {
  const ids = new Set(cups.flatMap((c) => c.tests.map((t) => t.id)));
  const rows = evaluateBlock(state, block.id).domains.flatMap((d) => d.tests).filter((t) => ids.has(t.test.id));
  if (!rows.length) return null;
  const better = rows.filter((r) => r.change === "better").length;
  // Maximalkraft ohne belastbare Norm (Maschine): Schätzung aus Zuhause- und Park-Cup, sobald da
  const strength = evaluateBlock(state, block.id).domains.find((d) => d.id === "strength");
  const strengthHere = rows.some((r) => r.test.id.startsWith("t-5rm"));
  const estLine = strength && strength.score == null && (strengthHere || strength.estimate)
    ? strength.estimate ? `Maximalkraft geschätzt ~${strength.estimate.score} (aus ${strength.estimate.from.join(", ")}) — Rangfolge, kein Perzentil.` : "Maximalkraft: Maschinenwerte haben keine belastbare Norm. Eine Schätzung folgt mit Klimmzügen, Liegestützen (Zuhause) und Standweitsprung (Park)."
    : null;
  return (
    <section className="card tw-sum">
      <div className="row between"><strong>Tagesbilanz</strong><span className="muted small">{rows.length} Tests{better ? ` · ${better} besser` : ""}</span></div>
      <ul className="slot-list">{rows.map((t) => <TestLine key={t.test.id} t={t} />)}</ul>
      {estLine && <div className="muted small">{estLine}</div>}
    </section>
  );
}

/** Ergebnis der Testwoche: Bereiche gegen die Norm, was besser wurde, Ausgang des Turniers, dann der Weg in die Planung */
function TestSummary({ state, block, today, onPlan }: { state: AppState; block: PlanBlock; today: string; onPlan?: () => void }) {
  const ev = evaluateBlock(state, block.id);
  const doms = ev.domains.filter((d) => d.tests.length);
  const all = doms.flatMap((d) => d.tests);
  const better = all.filter((t) => t.change === "better").length;
  const scored = doms.filter((d) => d.score != null || d.estimate).map((d) => ({ ...d, v: d.score ?? d.estimate!.score, est: d.score == null })).sort((a, b) => b.v - a.v);
  const best = scored.find((d) => !d.est);
  const cups = ravenOn(state) ? tournamentOf(state, block, today).cups.filter((c) => c.text) : [];
  return (
    <section className="card hero tw-result">
      <div className="hero-focus">Ergebnis der Testwoche</div>
      <div className="muted small">{all.length} Tests{better ? ` · ${better} besser als letztes Mal` : ""}{best ? ` · stärkster Bereich ${best.name}` : ""}{ev.weakest ? ` · Baustelle ${ev.weakest.name}` : ""}</div>
      {scored.length > 0 && (
        <div className="stack tight">
          {scored.map((d) => (
            <div key={d.id} className="tw-dom">
              <div className="row between small"><span>{d.name}{d.est ? " (Schätzung)" : ""}</span><span className={`score ${d.est ? "est" : d.v < 40 ? "low" : d.v >= 70 ? "high" : ""}`} title={d.est ? `aus ${d.estimate!.from.join(", ")}` : undefined}>{d.est ? "~" : ""}{d.v}</span></div>
              <div className="bar-track"><div className={`bar-fill ${d.est ? "est" : ""}`} style={{ width: `${d.v}%` }} /></div>
            </div>
          ))}
          <div className="muted small">Punkte ≈ Perzentil der Altersnorm: 50 heißt, die Hälfte der Vergleichsgruppe ist besser.</div>
        </div>
      )}
      {ev.missingProfile && <div className="note small">Für Normwerte fehlen Geburtsjahr und Geschlecht (Setup › Profil).</div>}
      {cups.length > 0 && (
        <div className="raven">
          <h3 className="raven-head">{narratorOf(state).tournament}: Ausgang des Turniers</h3>
          <div className="raven-lines">{cups.map((c) => <p key={c.cupId}>{c.text}</p>)}</div>
        </div>
      )}
      {onPlan && <button className="btn primary" onClick={onPlan}>Orden nach Schwachstellen optimieren</button>}
    </section>
  );
}

/** Turnier der Klingen hinter einem Symbol: Einleitung und die Urteile der Cups, wie die Ausgabe eines Ordens */
function RavenTournamentBadge({ state, block, today }: { state: AppState; block: PlanBlock; today: string }) {
  const [open, setOpen] = useState(false);
  const t = tournamentOf(state, block, today);
  const nr = narratorOf(state);
  const title = `${nr.tournament}: Das Turnier der Klingen`;
  return (
    <>
      <button className="raven-badge" onClick={() => setOpen(true)} aria-label={title} title={nr.name}>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
          <path d="M20 3c-6 1-11 5-13 11l-2 6 2-1c1-3 3-6 6-8-2 3-3 5-4 8 6-1 10-7 11-16z" fill="currentColor" />
          <path d="M4 21h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="raven">
            <RavenLines lines={[{ kind: "text", text: t.intro }, ...t.cups.filter((c) => c.text).map((c) => ({ kind: "text" as const, text: c.text! }))]} aside={nr.aside} />
          </div>
        </Modal>
      )}
    </>
  );
}

/** Klappt ein, sobald alles erledigt ist — nach kurzer Zeit, wie Übungskarten und Warm-up in einer Einheit.
    Fertiges startet eingeklappt; wieder aufklappen geht jederzeit. */
function AutoCollapse({ done, defaultOpen = false, title, meta, tone, children }: { done: boolean; defaultOpen?: boolean; title: string; meta?: string; tone?: "amber" | "teal"; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen && !done);
  const [was, setWas] = useState(done);
  useEffect(() => {
    if (done && !was) { const id = setTimeout(() => setOpen(false), 2500); setWas(true); return () => clearTimeout(id); }
    if (!done && was) setWas(false);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Collapse title={done ? `${title} ✓` : title} meta={meta} tone={tone} open={open} onOpenChange={setOpen}>{children}</Collapse>;
}

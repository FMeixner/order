import { type ReactNode, useEffect, useState } from "react";
import { IdeasWaiting } from "./Ideas";
import { BEAST_BY_ID, TESTWEEK } from "../data";
import { addDays, expandDrills, fmtDate, mondayOf, scheduleFor, trainingDays } from "../engine/plan";
import { variantHint } from "../engine/norms";
import { parseClock } from "../engine/clock";
import type { AppState, Cup, PlanBlock, TestDef, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Collapse, Desc } from "./common";
import { allDrillsDone, DrillList } from "./session/Drills";
import { fmt } from "./Timer";
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

function TestRow({ t, state, block, onSave, preview = false }: { t: TestDef; state: AppState; block: PlanBlock; onSave: (value: number, raw: string, variant?: string) => void; preview?: boolean }) {
  const [vals, setVals] = useState<string[]>(Array(t.attempts).fill(""));
  const all = state.tests[t.id] ?? [];
  const [variant, setVariant] = useState<string>(all[all.length - 1]?.variant ?? t.variants?.[0]?.id ?? "");
  const hist = t.variants ? all.filter((h) => (h.variant ?? "") === variant) : all;
  const thisBlock = hist.filter((h) => h.blockId === block.id);
  const prev = hist.filter((h) => h.blockId !== block.id);
  const best = (arr: { value: number }[]) => arr.length ? (t.better === "higher" ? Math.max(...arr.map((x) => x.value)) : Math.min(...arr.map((x) => x.value))) : null;
  const parsed = vals.map((v) => parseValue(v, t.unit)).filter((x): x is number => x != null);
  const bestNow = best(parsed.map((value) => ({ value })));
  const prevBest = best(prev);
  return (
    <div className="test-row">
      <div className="slot-title"><span className="slot-name">{t.name}</span><Desc text={t.desc} /></div>
      {t.variants && (
        <select value={variant} onChange={preview ? undefined : (e) => setVariant(e.target.value)} disabled={preview} aria-label="Variante">
          {t.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      {t.variants && <div className="muted small">{variantHint(state, block, t.id)}</div>}
      {!preview && (
        <div className="row wrap">
          {vals.map((v, i) => (
            <input key={i} type="text" inputMode="decimal" className="test-in" placeholder={t.attempts > 1 ? `Versuch ${i + 1}` : t.unit === "mmss" ? "m.ss.z" : "Wert"}
              value={v} onChange={(e) => setVals(vals.map((x, k) => (k === i ? e.target.value : x)))} />
          ))}
          <button className="btn small" disabled={bestNow == null} onClick={() => { onSave(bestNow!, vals.filter(Boolean).join(" / "), t.variants ? variant : undefined); setVals(Array(t.attempts).fill("")); }}>Speichern</button>
        </div>
      )}
      <div className="muted small">
        {preview && t.attempts > 1 ? `${t.attempts} Versuche. ` : ""}
        {thisBlock.length ? <>Gespeichert: <strong>{show(best(thisBlock)!, t.unit)}</strong></> : "Noch kein Wert"}
        {prevBest != null && <> · vorheriger Bestwert {show(prevBest, t.unit)}</>}
      </div>
    </div>
  );
}

function Who5({ state, update, block }: { state: AppState; update: Update; block: PlanBlock }) {
  const [a, setA] = useState<(number | null)[]>([null, null, null, null, null]);
  const saved = state.who5.filter((w) => w.blockId === block.id).pop();
  const complete = a.every((x) => x != null);
  const score = complete ? (a as number[]).reduce((s, x) => s + x, 0) * 4 : null;
  return (
    <div className="test-row">
      <div className="slot-name">WHO-5 Wohlbefinden</div>
      <div className="muted small">{TESTWEEK.who5_intro} …</div>
      {TESTWEEK.who5.map((q, i) => (
        <div key={i} className="who5-q">
          <div className="small">{q}</div>
          <select value={a[i] ?? ""} onChange={(e) => setA(a.map((x, k) => (k === i ? (e.target.value === "" ? null : parseInt(e.target.value)) : x)))}>
            <option value="">–</option>
            {TESTWEEK.who5_scale.map((l, v) => <option key={v} value={v}>{v} · {l}</option>)}
          </select>
        </div>
      ))}
      <button className="btn small" disabled={!complete} onClick={() => update((st) => ({ ...st, who5: [...st.who5, { date: new Date().toISOString().slice(0, 10), blockId: block.id, score: score! }] }))}>Speichern</button>
      {saved && <div className="muted small">Gespeichert: {saved.score} von 100. Werte unter 52 gelten als Hinweis auf eingeschränktes Wohlbefinden; dann lohnt sich ein Gespräch mit der Hausärztin oder dem Hausarzt.</div>}
    </div>
  );
}

function Benchmark({ cup, state, update, preview = false }: { cup: Cup; state: AppState; update: Update; preview?: boolean }) {
  const [manual, setManual] = useState("");
  if (!cup.benchmark) return null;
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
            update((st) => ({ ...st, beastTimes: { ...st.beastTimes, [id]: [...(st.beastTimes[id] ?? []), { date: new Date().toISOString().slice(0, 10), seconds: sec }] } }));
            setManual("");
          }}>Speichern</button>
        </div>
      )}
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
  const saveTest = (t: TestDef, value: number, raw: string, variant?: string) =>
    update((st) => ({ ...st, tests: { ...st.tests, [t.id]: [...(st.tests[t.id] ?? []), { date: new Date().toISOString().slice(0, 10), blockId: block.id, value, raw, ...(variant ? { variant } : {}) }] } }));
  const days = testDays(state, block);
  // Gewählter Testtag: angetippt, sonst heute, sonst der nächste offene, sonst der erste
  const [pick, setPick] = useState<string | null>(null);
  const openDay = days.find((t) => !TESTWEEK.cups.filter((c) => c.place === t.place).every((c) => c.tests.every((x) => (state.tests[x.id] ?? []).some((r) => r.blockId === block.id))));
  const sel = days.find((t) => t.place === pick) ?? days.find((t) => t.date === today) ?? openDay ?? days[0];
  // Fertig: an jedem Testtag hat jeder Cup mindestens einen Wert (Tests ohne Material dürfen fehlen), oder die Woche ist vorbei
  const has = (id: string) => (state.tests[id] ?? []).some((r) => r.blockId === block.id);
  const allDone = !preview && (days.every((t) => TESTWEEK.cups.filter((c) => c.place === t.place).every((c) => c.tests.some((x) => has(x.id)))) || (today > block.end && TESTWEEK.cups.some((c) => c.tests.some((x) => has(x.id)))));
  return (
    <div className="stack">
      {/* Hinweise und Erzähler hinter Symbolen, wie bei jedem Orden */}
      <div className="row tw-head">
        <span className="muted small">Drei Testtage, jeder frisch</span>
        <Desc text={`Drei Testtage, jeder frisch; Erhaltungskalorien. Gleiche Bedingungen wie beim letzten Mal, Tests ohne Material auslassen. Die Woche davor läuft mit −1 Satz.${preview ? " Vorschau: erst ansehen — eintragen kannst du ab dem Wochenende davor." : ""}`} />
        {ravenOn(state) && <RavenTournamentBadge state={state} block={block} today={today} />}
      </div>
      {!preview && <IdeasWaiting ideas={state.ideas} />}
      {allDone && <TestSummary state={state} block={block} today={today} onPlan={onPlan} />}
      {/* Wie jede andere Woche: Tage oben, der gewählte Tag zeigt seine Cups */}
      <div className="days">
        {days.map((t) => {
          const cups = TESTWEEK.cups.filter((c) => c.place === t.place);
          const done = cups.every((c) => c.tests.every((x) => (state.tests[x.id] ?? []).some((r) => r.blockId === block.id)));
          return (
            <button key={t.place} className={`day-btn ${sel?.place === t.place ? "on" : ""} ${done ? "done" : ""} ${t.date === today ? "today" : ""}`} onClick={() => setPick(t.place)}>
              <span className="day">{t.day}</span>
              <span className="day-role">{t.place}</span>
              <span className="muted small">{cups.map((c) => c.name.replace("-Cup", "")).join(" · ")}{done ? " · ✓" : ""}</span>
            </button>
          );
        })}
      </div>
      {sel && <TestDay state={state} update={update} block={block} today={today} place={sel.place} preview={preview} saveTest={saveTest} />}
      <Evaluation state={state} blockId={block.id} update={preview ? undefined : update} defaultOpen={false} />
      <div className="muted small">{preview ? "Vorschau der Testwoche. " : "Die Auswertung füllt sich, sobald du Werte speicherst. Alle Ergebnisse stehen auch im Log. "}Block {fmtDate(block.start)}–{fmtDate(block.end)}.</div>
    </div>
  );
}

/** Ein Testtag wie eine Einheit: ein Warm-up zum Abhaken mit Timer (der zweite Cup am Ort braucht keins),
    dann die Cups, am Ende des Tages das Cool-down. */
function TestDay({ state, update, block, today, place, preview, saveTest }: {
  state: AppState; update: Update; block: PlanBlock; today: string; place: string; preview: boolean;
  saveTest: (t: TestDef, value: number, raw: string, variant?: string) => void;
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
          done={!preview && cup.tests.every((t) => (state.tests[t.id] ?? []).some((r) => r.blockId === block.id))}>
          {cup.who5 && !preview && <Who5 state={state} update={update} block={block} />}
          {cup.tests.map((t) => <TestRow key={t.id} t={t} state={state} block={block} preview={preview} onSave={(v, raw, variant) => saveTest(t, v, raw, variant)} />)}
          <Benchmark cup={cup} state={state} update={update} preview={preview} />
          {ravenOn(state) && <RavenCup state={state} block={block} today={today} cupId={cup.id} />}
        </AutoCollapse>
      ))}
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

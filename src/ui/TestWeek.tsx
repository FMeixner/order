import { useState } from "react";
import { BEAST_BY_ID, TESTWEEK } from "../data";
import { addDays, expandDrills, fmtDate, mondayOf, scheduleFor, trainingDays } from "../engine/plan";
import { variantHint } from "../engine/norms";
import { parseClock } from "../engine/clock";
import type { AppState, Cup, PlanBlock, TestDef, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Collapse, Desc } from "./common";
import { Evaluation } from "./Evaluation";
import { fmt } from "./Timer";
import { RavenCup, RavenTournament, ravenOn } from "./Raven";

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

export function TestWeek({ state, update, block, today, preview = false }: { state: AppState; update: Update; block: PlanBlock; today: string; preview?: boolean }) {
  const saveTest = (t: TestDef, value: number, raw: string, variant?: string) =>
    update((st) => ({ ...st, tests: { ...st.tests, [t.id]: [...(st.tests[t.id] ?? []), { date: new Date().toISOString().slice(0, 10), blockId: block.id, value, raw, ...(variant ? { variant } : {}) }] } }));
  const days = testDays(state, block);
  // Gewählter Testtag: angetippt, sonst heute, sonst der nächste offene, sonst der erste
  const [pick, setPick] = useState<string | null>(null);
  const openDay = days.find((t) => !TESTWEEK.cups.filter((c) => c.place === t.place).every((c) => c.tests.every((x) => (state.tests[x.id] ?? []).some((r) => r.blockId === block.id))));
  const sel = days.find((t) => t.place === pick) ?? days.find((t) => t.date === today) ?? openDay ?? days[0];
  return (
    <div className="stack">
      {ravenOn(state) && <RavenTournament state={state} block={block} today={today} />}
      <div className="card note">
        <strong>Testwoche.</strong> Drei Testtage, jeder frisch; Erhaltungskalorien. Gleiche Bedingungen wie beim letzten Mal, Tests ohne Material auslassen.{preview ? " Vorschau: erst ansehen — eintragen kannst du ab dem Wochenende davor." : ""}
      </div>
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
      {TESTWEEK.cups.filter((cup) => cup.place === sel?.place).map((cup) => (
        <Collapse key={cup.id} title={cup.name} meta={cup.focus} tone="teal" defaultOpen>
          <Collapse title="Warm-up" meta={`${expandDrills(cup.warmup, state.user, 1).length} Übungen`}>
            <ul className="slot-list">{expandDrills(cup.warmup, state.user, 1).map((d) => <li key={d.id}>{d.name} · {d.groups.map((g) => `${g.label ? g.label + " " : ""}${d.mode === "reps" ? g.value + "×" : fmt(g.value)}`).join(", ")}</li>)}</ul>
          </Collapse>
          {cup.who5 && !preview && <Who5 state={state} update={update} block={block} />}
          {cup.tests.map((t) => <TestRow key={t.id} t={t} state={state} block={block} preview={preview} onSave={(v, raw, variant) => saveTest(t, v, raw, variant)} />)}
          <Benchmark cup={cup} state={state} update={update} preview={preview} />
          {ravenOn(state) && <RavenCup state={state} block={block} today={today} cupId={cup.id} />}
        </Collapse>
      ))}
      <Evaluation state={state} blockId={block.id} update={preview ? undefined : update} />
      <div className="muted small">{preview ? "Vorschau der Testwoche. " : "Die Auswertung füllt sich, sobald du Werte speicherst. Alle Ergebnisse stehen auch im Log. "}Block {fmtDate(block.start)}–{fmtDate(block.end)}.</div>
    </div>
  );
}

/* Bestie: Stoppuhr mit Schrittfolge, Lastfeld und Karte. */
import { useEffect, useRef, useState } from "react";
import { TONES, unlockAudio, vibrate } from "../../audio";
import { type BeastStep, beastSteps } from "../../engine/beaststeps";
import { type CardioSub, SUB_LABEL, swapRunBeast } from "../../engine/cardio";
import type { Beast, BeastResult, BeastRun, Session } from "../../types";
import { parseClock } from "../../engine/clock";
import { capOf, isLoadBeast, loadKind, loadRecord, pctLift, suggestLoad } from "../../engine/loadbeast";
import { beastById, beastMinutes, COMBO_REST } from "../../engine/plan";
import { fmt, useTimer } from "../Timer";
import { kg, Seg } from "../common";
import type { BeastCtx } from "./ctx";

/** Stoppuhr mit Schrittfolge für eine Bestie.
    Nach dem Start zeigt eine feste Leiste unten, was gerade dran ist und was danach kommt. Wiederholungen tippt man mit „Fertig“ ab,
    Zeitstationen (Halten, Pausen, Seil, Stepper) laufen mit Countdown und gehen von selbst weiter. Der letzte Schritt stoppt und speichert die Zeit.
    „Wieder aufnehmen“ lässt die Uhr ab dem ersten Start weiterlaufen, gespeichert wird dann nur die neue Zeit.
    Der Stand überlebt Reiterwechsel (lokal je Bestie und Einheit). */
interface Watch { startedAt: number | null; done: number; last: number | null; /** Beginn der laufenden Zeitstation */ stepAt?: number | null }
const WATCH_KEY = (k: string) => `order:watch:${k}`;
function readWatch(k?: string): Watch {
  try { const v = k ? localStorage.getItem(WATCH_KEY(k)) : null; if (v) return JSON.parse(v) as Watch; } catch { /* egal */ }
  return { startedAt: null, done: 0, last: null };
}
function BeastTimer({ times, label, saved, steps, rounds, watchKey, title, onSave, onStart }: { times: { seconds: number }[]; label?: string; saved: number | null; steps: BeastStep[]; rounds: number; watchKey?: string; title: string; onSave: (sec: number) => void; onStart?: () => void }) {
  const t = useTimer();
  const [w, setW] = useState<Watch>(() => readWatch(watchKey));
  const put = (nw: Watch) => {
    setW(nw);
    try { if (watchKey) { if (nw.startedAt == null && nw.last == null) localStorage.removeItem(WATCH_KEY(watchKey)); else localStorage.setItem(WATCH_KEY(watchKey), JSON.stringify(nw)); } } catch { /* egal */ }
  };
  const [, tick] = useState(0);
  const [manual, setManual] = useState("");
  const [bad, setBad] = useState(false);
  const lastBeep = useRef<number | null>(null);
  const commit = () => {
    if (!manual.trim()) { setBad(false); return; }
    const sec = parseClock(manual);
    if (sec == null) { setBad(true); return; }
    onSave(Math.round(sec)); setManual(""); setBad(false);
    put({ startedAt: null, done: 0, last: null });
  };
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  const running = w.startedAt != null;
  const elapsed = running ? (Date.now() - w.startedAt!) / 1000 : 0;
  const n = steps.length;
  const cur = running && w.done < n ? steps[w.done] : null;
  const next = running && w.done + 1 < n ? steps[w.done + 1] : null;
  const stepLeft = cur?.seconds != null && w.stepAt != null ? cur.seconds - (Date.now() - w.stepAt) / 1000 : null;
  const stop = (done: number) => { onSave(Math.round(elapsed)); put({ startedAt: null, done, last: w.startedAt, stepAt: null }); };
  /** Zum Schritt i springen; über das Ende hinaus stoppt die Uhr */
  const go = (i: number, base: Watch = w) => {
    if (i >= n) { onSave(Math.round((Date.now() - base.startedAt!) / 1000)); put({ startedAt: null, done: n, last: base.startedAt, stepAt: null }); TONES.done(); vibrate([200, 100, 200]); return; }
    const timed = steps[i].seconds != null;
    if (timed) TONES.go();
    lastBeep.current = null;
    put({ ...base, done: Math.max(0, i), stepAt: timed ? Date.now() : null });
  };
  useEffect(() => {
    if (w.startedAt == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(iv);
  }, [w.startedAt]);
  // Zeitstation: letzte 5 s piepen, bei 0 von selbst weiter
  useEffect(() => {
    if (stepLeft == null) return;
    const sec = Math.ceil(stepLeft);
    if (sec <= 0) { go(w.done + 1); return; }
    if (sec <= 5 && lastBeep.current !== sec) { lastBeep.current = sec; TONES.last5(); }
  });
  const start = () => {
    if (t.running) t.stop(); // eine laufende Pause endet mit dem Start der Bestie
    unlockAudio();
    onStart?.();
    const base: Watch = { startedAt: Date.now(), done: 0, last: null };
    if (n) go(0, base); else put(base);
  };
  const resume = () => {
    if (t.running) t.stop();
    const i = Math.min(w.done, Math.max(0, n - 1));
    put({ startedAt: w.last, done: i, last: null, stepAt: steps[i]?.seconds != null ? Date.now() : null });
  };
  const roundLabel = (x: BeastStep) => (x.round === 0 ? "Buy-in" : x.round > rounds ? "Buy-out" : rounds > 1 ? `Runde ${x.round} von ${rounds}` : "");
  return (
    <div className="stack beast-timer">
      {label && <div className="small muted">{label}</div>}
      <div className="row wrap">
        {!running
          ? <button className="btn primary" onClick={start}>▶ Start</button>
          : <button className="btn primary" onClick={() => stop(w.done)}>■ Stopp {fmt(elapsed)}</button>}
        {!running && w.last != null && Date.now() - w.last < 3 * 3600e3 && <button className="btn ghost" onClick={resume}>↺ Wieder aufnehmen</button>}
        {!running && <input type="text" inputMode="decimal" placeholder="oder mm.ss" value={manual} onChange={(e) => setManual(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} className="time-in" aria-invalid={bad} />}
      </div>
      {running && n > 0 && <div className="small muted">Schritt {Math.min(w.done + 1, n)} von {n}. Die Leiste unten zeigt, was dran ist.</div>}
      {cur && (
        <div className={`beast-now ${cur.rest ? "rest" : ""}`} role="status" aria-live="polite">
          {stepLeft != null && cur.seconds ? <div className="beast-now-progress" style={{ width: `${100 * (1 - Math.max(0, stepLeft) / cur.seconds)}%` }} /> : null}
          <div className="beast-now-head small"><span>{title}{roundLabel(cur) ? ` · ${roundLabel(cur)}` : ""}</span><span className="mono">{fmt(elapsed)}</span></div>
          <div className="beast-now-main">
            <div className="beast-now-text">{cur.text}</div>
            {stepLeft != null && <div className="beast-now-time mono">{fmt(Math.max(0, stepLeft))}</div>}
          </div>
          <div className="beast-now-next small muted">{next ? <>Danach: {next.text}{next.round !== cur.round && roundLabel(next) ? ` (${roundLabel(next)})` : ""}</> : "Letzter Schritt"}</div>
          <div className="row">
            <button className="btn ghost small" onClick={() => go(w.done - 1)} disabled={w.done === 0} aria-label="Zurück">‹</button>
            {stepLeft != null
              ? <button className="btn ghost small grow" onClick={() => go(w.done + 1)}>Weiter</button>
              : <button className="btn primary grow" onClick={() => go(w.done + 1)}>{next ? "Fertig ›" : "Fertig, Zeit stoppen"}</button>}
          </div>
        </div>
      )}
      {bad && <div className="small warn">„{manual}“ verstehe ich nicht. Bitte so: 12.34 oder 12:34.</div>}
      <div className="small">
        {saved ? <>Heute: <strong>{fmt(saved)}</strong>{pr && saved < pr ? " · neue Bestzeit" : ""}</> : null}
        {pr ? <span className="muted">{saved ? " · " : ""}Bestzeit {fmt(pr)}</span> : !saved ? <span className="muted">Noch keine Zeit</span> : null}
      </div>
    </div>
  );
}

/** Lastbestie: ein Gewicht (je Hantel) oder ein Band für alle Lastübungen, dazu Rekord und Timecap */
function LoadField({ beast, ctx, cur, onChange }: { beast: Beast; ctx: BeastCtx; cur?: BeastResult; onChange: (l: Partial<BeastResult>) => void }) {
  const kind = loadKind(beast);
  if (!kind) return null;
  const sug = suggestLoad(ctx.state, beast, ctx.profile);
  const rec = loadRecord(beast, ctx.state.beastTimes[beast.id]);
  const cap = capOf(beast)!;
  const over = cur?.seconds != null && cur.seconds > cap * 60;
  const pl = pctLift(beast);
  return (
    <div className="stack small">
      {kind === "band" ? (
        <Seg value={cur?.band ?? sug?.band ?? ""} options={ctx.profile.bands.map((b) => ({ value: b, label: b }))} onChange={(band) => onChange({ band })} />
      ) : (
        <div className="row">
          <input type="number" inputMode="decimal" className="kg-in" placeholder={sug?.kg != null ? String(sug.kg) : "kg"} value={cur?.kg ?? ""}
            onChange={(e) => onChange({ kg: e.target.value === "" ? undefined : parseFloat(e.target.value.replace(",", ".")) })} />
          <span className="muted">kg {kind === "barbell" ? "Langhantel" : kind === "kettlebell" ? "Kettlebell" : kind === "sandbag" ? "Sandsack" : "je Kurzhantel"}, für alle Lastübungen</span>
        </div>
      )}
      {pl && !sug && <div className="muted">1RM {pl.exercise} noch unbekannt: Gewicht selbst festlegen.</div>}
      {sug && cur?.kg == null && !cur?.band && <div className="muted">Vorschlag: {sug.kg != null ? kg(sug.kg) : sug.band} ({sug.why})</div>}
      {rec && <div className="muted">Rekord: {rec.kg != null ? kg(rec.kg) : rec.band}</div>}
      {over && <div className="warn">Über dem Timecap: zählt nicht als Rekord, nächstes Mal eine Stufe leichter.</div>}
      {cur?.seconds != null && !over && (
        <div className="row wrap">
          <span>Technik:</span>
          <Seg value={cur.tech ?? ""} options={[{ value: "gut", label: "sauber" }, { value: "schlecht", label: "unsauber" }]} onChange={(tech) => onChange({ tech: tech as "gut" | "schlecht" })} />
          <span className="muted">{cur.tech === "gut" ? "nächstes Mal eine Stufe höher" : cur.tech === "schlecht" ? "nächstes Mal eine Stufe leichter" : ""}</span>
        </div>
      )}
    </div>
  );
}

export function BeastCard({ blockId, beast: beast0, ctx, session, mut, note, easy, nextBeast, watchBase, cardio }: { blockId: string; beast: Beast | null; ctx: BeastCtx; watchBase: string; session?: Session; mut: (fn: (s: Session) => Session) => void; note?: string; easy?: boolean; nextBeast?: string; /** Laufen ersetzt durch dieses Gerät (nur die Anzeige; Id und Bestzeit bleiben) */ cardio?: CardioSub }) {
  const t = useTimer();
  const beast = beast0 && cardio ? swapRunBeast(beast0, cardio) : beast0;
  // Ergebnis dieses Bestien-Blocks (alte Einheiten: beast/beastParts) — vor dem Null-Fall, damit die Hooks immer laufen
  const runOf = (s?: Session): BeastRun => s?.beastRuns?.[blockId] ?? (!s?.beastRuns && (s?.beast?.id === beast?.id || s?.beastParts?.length) ? { beast: s?.beast, parts: s?.beastParts } : {});
  const run = runOf(session);
  // Fertig: die Zeit steht — dann klappt die Karte nach kurzer Zeit ein wie eine Übungskarte
  const done = !!beast && (beast.parts
    ? beast.parts.every((pt, u) => (run.parts?.[u]?.id === pt.id ? run.parts[u] : undefined)?.seconds != null)
    : (run.beast?.id === beast.id ? run.beast : undefined)?.seconds != null);
  const [folded, setFolded] = useState<boolean>(done);
  useEffect(() => {
    if (!done) { setFolded(false); return; }
    if (folded) return;
    const id = setTimeout(() => setFolded(true), 2500);
    return () => clearTimeout(id);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!beast) return <section className="card"><div className="muted">Keine passende Bestie für dieses Equipment gefunden.</div></section>;
  // Dauer: bei Serien aus den Teilen, mit gemessenen Zeiten, wo vorhanden
  const effMin = beast.parts
    ? beast.parts.reduce((m, pt) => m + beastMinutes(beastById(pt.id)!, ctx.state.beastTimes[pt.id]).min, 0) + ((beast.parts.length - 1) * COMBO_REST) / 60
    : beastMinutes(beast, ctx.state.beastTimes[beast.id]).min;
  const measured = beast.parts ? beast.parts.every((pt) => (ctx.state.beastTimes[pt.id] ?? []).length) : (ctx.state.beastTimes[beast.id] ?? []).length > 0;
  // Zeit nachgetragen, Einheit schon abgeschlossen: gleich in die Bestzeiten, alte Zeit dieses Tages ersetzen
  const lateTime = (id: string, sec: number, old: number | null | undefined, load?: Partial<BeastResult>) => {
    if (!session?.done || easy) return;
    ctx.update((st) => {
      const list = (st.beastTimes[id] ?? []).filter((x) => !(x.date === session.date && x.seconds === old));
      const { kg: k, band, tech } = load ?? {};
      return { ...st, beastTimes: { ...st.beastTimes, [id]: [...list, { date: session.date, seconds: sec, ...(k != null ? { kg: k } : {}), ...(band ? { band } : {}), ...(tech ? { tech } : {}) }] } };
    });
  };
  // Ergebnis dieses Bestien-Blocks (alte Einheiten: beast/beastParts)
  const mutRun = (fn: (r: BeastRun) => BeastRun) => mut((s) => ({ ...s, beastRuns: { ...(s.beastRuns ?? {}), [blockId]: fn(runOf(s)) } }));
  const cur = run.beast?.id === beast.id ? run.beast : undefined;
  // Lastbestie: ohne eigene Eingabe gilt der Vorschlag
  const loadOf = (b: Beast, r?: BeastResult) => {
    if (!isLoadBeast(b)) return {};
    const sg = suggestLoad(ctx.state, b, ctx.profile);
    return { kg: r?.kg ?? sg?.kg, band: r?.band ?? sg?.band, tech: r?.tech };
  };
  // Technik oder Gewicht nachträglich geändert, Einheit schon abgeschlossen: Eintrag in den Bestzeiten mitziehen
  const syncTime = (id: string, sec: number | null | undefined, patch: Partial<BeastResult>) => {
    if (!session?.done || sec == null) return;
    const { kg: k, band, tech } = patch;
    const p2 = { ...(k !== undefined ? { kg: k } : {}), ...(band !== undefined ? { band } : {}), ...(tech !== undefined ? { tech } : {}) };
    ctx.update((st) => ({ ...st, beastTimes: { ...st.beastTimes, [id]: (st.beastTimes[id] ?? []).map((x) => (x.date === session.date && x.seconds === sec ? { ...x, ...p2 } : x)) } }));
  };
  const saveSingle = (sec: number) => {
    const l = loadOf(beast, cur);
    lateTime(beast.id, sec, cur?.seconds, l);
    mutRun((r) => ({ ...r, beast: { ...(r.beast?.id === beast.id ? r.beast : {}), ...l, id: beast.id, seconds: sec, ...(easy ? { easy } : {}) } }));
    // Zwei Bestien in der Einheit: Pause bis zur nächsten
    if (nextBeast) t.rest(`Pause, dann ${nextBeast}`, COMBO_REST);
  };
  const setLoadSingle = (load: Partial<BeastResult>) => {
    syncTime(beast.id, cur?.seconds, load);
    mutRun((r) => ({ ...r, beast: { ...(r.beast?.id === beast.id ? r.beast : { seconds: null }), id: beast.id, ...load } }));
  };
  // Serie: jeder Teil einzeln, jede Zeit zählt für ihre Bestie (ein Doppel/Triple ist ein Teil mit eigener Bestzeit)
  const parts = beast.parts ?? [];
  const curPart = (u: number) => (run.parts?.[u]?.id === parts[u].id ? run.parts[u] : undefined);
  const patchUnit = (u: number, patch: Partial<BeastResult>) => mutRun((r) => {
    const arr = parts.map((x, i) => (r.parts?.[i]?.id === x.id ? r.parts[i] : { id: x.id, seconds: null }));
    arr[u] = { ...arr[u], ...patch, id: parts[u].id };
    return { ...r, parts: arr };
  });
  const saveUnit = (u: number, sec: number) => {
    const c = curPart(u);
    const l = loadOf(beastById(parts[u].id)!, c);
    lateTime(parts[u].id, sec, c?.seconds, l);
    patchUnit(u, { ...l, seconds: sec, ...(easy ? { easy } : {}) });
    if (u < parts.length - 1) t.rest(`Pause, dann ${parts[u + 1].name}`, COMBO_REST);
    else if (nextBeast) t.rest(`Pause, dann ${nextBeast}`, COMBO_REST);
  };
  const work = (b: { id?: string; work: string; rounds: number; times?: number; repeat?: number; name?: string }) => {
    const k = b.times ?? b.repeat ?? 1;
    return (
      <>
        <div className="muted small">{k > 1 ? `${k} × ${b.rounds / k} Runden am Stück` : `${b.rounds} ${b.rounds === 1 ? "Durchgang" : "Runden"}`}</div>
        <ul className="beast-work">{b.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
      </>
    );
  };
  if (folded && done) {
    const times = beast.parts
      ? beast.parts.map((pt, u) => { const sec = run.parts?.[u]?.id === pt.id ? run.parts[u].seconds : null; return sec != null ? fmt(sec) : "–"; }).join(" · ")
      : run.beast?.seconds != null ? fmt(run.beast.seconds) : "";
    return (
      <button className="slot slot-done" onClick={() => setFolded(false)} aria-label={`${beast.name} erledigt, aufklappen`}>
        <span className="slot-done-check" aria-hidden>✓</span>
        <span className="slot-name">{beast.name}</span>
        <span className="muted small">{times}</span>
      </button>
    );
  }
  return (
    <section className="card beast">
      <div className="block-label amber">{capOf(beast) != null ? `Lastbestie · Timecap ${capOf(beast)} Min` : `Bestie · ${measured ? "" : "~"}${Math.round(effMin)} Min`}</div>
      <div className="beast-name">{beast.name}</div>
      {easy && <div className="muted small">Grundlagentempo, zählt nicht für die Bestzeit.</div>}
      {parts.length ? (
        <>
          {parts.map((pt, u) => (
            <div key={u} className="stack">
              <div className="small"><strong>{u + 1}. {pt.name}</strong></div>
              {work(pt)}
              {isLoadBeast(beastById(pt.id)!) && <LoadField beast={beastById(pt.id)!} ctx={ctx} cur={curPart(u)} onChange={(l) => { syncTime(pt.id, curPart(u)?.seconds, l); patchUnit(u, l); }} />}
              <BeastTimer times={isLoadBeast(beastById(pt.id)!) ? [] : ctx.state.beastTimes[pt.id] ?? []} saved={curPart(u)?.seconds ?? null} steps={beastSteps(pt)} rounds={pt.rounds} title={pt.name} watchKey={`${watchBase}:${blockId}:${u}:${pt.id}`} onSave={(sec) => saveUnit(u, sec)} onStart={() => mut((s) => s)} />
            </div>
          ))}
        </>
      ) : (
        <>
          {work(beast)}
          {isLoadBeast(beast) && <LoadField beast={beast} ctx={ctx} cur={cur} onChange={setLoadSingle} />}
          <BeastTimer times={isLoadBeast(beast) ? [] : ctx.state.beastTimes[beast.id] ?? []} saved={cur?.seconds ?? null} steps={beastSteps(beast)} rounds={beast.rounds} title={beast.name} watchKey={`${watchBase}:${blockId}:${beast.id}`} onSave={saveSingle} onStart={() => mut((s) => s)} />
        </>
      )}
      {cardio && beast !== beast0 && <div className="muted small">Laufen ersetzt durch {SUB_LABEL[cardio]}, umgerechnet nach Belastungszeit.</div>}
      {note && <div className="muted small">{note}</div>}
    </section>
  );
}

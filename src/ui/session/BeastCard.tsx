/* Bestie: Stoppuhr, Rundentracker, Lastfeld und Karte. */
import { useEffect, useState } from "react";
import type { Beast, BeastResult, BeastRun, Session } from "../../types";
import { parseClock } from "../../engine/clock";
import { capOf, isLoadBeast, loadKind, loadRecord, pctLift, suggestLoad } from "../../engine/loadbeast";
import { beastById, beastMinutes, COMBO_REST } from "../../engine/plan";
import { fmt, useTimer } from "../Timer";
import { kg, Seg } from "../common";
import type { BeastCtx } from "./ctx";

/** Stoppuhr, Rundentracker und Zeiteingabe für eine Bestie.
    Das letzte Rundenhäkchen stoppt und speichert die Zeit. „Wieder aufnehmen“ lässt die Uhr ab dem ersten Start weiterlaufen,
    gespeichert wird dann nur die neue Zeit. Der Stand überlebt Reiterwechsel (lokal je Bestie und Einheit). */
/** Abhakbare Schritte: Runden, bei nur einem Durchgang die einzelnen Übungen */
const stepsOf = (b: { rounds: number; work: string }): string[] =>
  b.rounds > 1 ? Array.from({ length: b.rounds }, (_, i) => String(i + 1)) : b.work.split(" · ");
interface Watch { startedAt: number | null; done: number; last: number | null }
const WATCH_KEY = (k: string) => `order:watch:${k}`;
function readWatch(k?: string): Watch {
  try { const v = k ? localStorage.getItem(WATCH_KEY(k)) : null; if (v) return JSON.parse(v) as Watch; } catch { /* egal */ }
  return { startedAt: null, done: 0, last: null };
}
function BeastTimer({ times, label, saved, steps, watchKey, onSave, onStart }: { times: { seconds: number }[]; label?: string; saved: number | null; steps?: string[]; watchKey?: string; onSave: (sec: number) => void; onStart?: () => void }) {
  const t = useTimer();
  const [w, setW] = useState<Watch>(() => readWatch(watchKey));
  const put = (nw: Watch) => {
    setW(nw);
    try { if (watchKey) { if (nw.startedAt == null && nw.last == null) localStorage.removeItem(WATCH_KEY(watchKey)); else localStorage.setItem(WATCH_KEY(watchKey), JSON.stringify(nw)); } } catch { /* egal */ }
  };
  const [, tick] = useState(0);
  const [manual, setManual] = useState("");
  const [bad, setBad] = useState(false);
  const commit = () => {
    if (!manual.trim()) { setBad(false); return; }
    const sec = parseClock(manual);
    if (sec == null) { setBad(true); return; }
    onSave(Math.round(sec)); setManual(""); setBad(false);
    put({ startedAt: null, done: 0, last: null });
  };
  useEffect(() => {
    if (w.startedAt == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(iv);
  }, [w.startedAt]);
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  const running = w.startedAt != null;
  const elapsed = running ? (Date.now() - w.startedAt!) / 1000 : 0;
  const n = steps?.length ?? 0;
  const byLine = n > 0 && !/^\d+$/.test(steps![0]);
  const stop = (done: number) => { onSave(Math.round(elapsed)); put({ startedAt: null, done, last: w.startedAt }); };
  const tapRound = (i: number) => {
    if (!running) return;
    const done = i < w.done ? i : i + 1;
    if (done >= n) stop(n);
    else put({ ...w, done });
  };
  const resume = () => {
    if (t.running) t.stop(); // Pause nach der Bestie hinfällig
    put({ startedAt: w.last, done: Math.min(w.done, Math.max(0, n - 1)), last: null });
  };
  return (
    <div className="stack beast-timer">
      {label && <div className="small muted">{label}</div>}
      <div className="row wrap">
        {!running
          ? <button className="btn primary" onClick={() => { onStart?.(); put({ startedAt: Date.now(), done: 0, last: null }); }}>▶ Stoppuhr</button>
          : <button className="btn primary" onClick={() => stop(w.done)}>■ Stopp {fmt(elapsed)}</button>}
        {!running && w.last != null && Date.now() - w.last < 3 * 3600e3 && <button className="btn ghost" onClick={resume}>↺ Wieder aufnehmen</button>}
        {!running && <input type="text" inputMode="decimal" placeholder="oder mm.ss" value={manual} onChange={(e) => setManual(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} className="time-in" aria-invalid={bad} />}
      </div>
      {running && n > 0 && (
        <div className="stack">
          <div className="small muted">{byLine ? "Übung für Übung abhaken" : `Runde ${Math.min(w.done + 1, n)} von ${n}: nach jeder Runde abhaken`}, das letzte Häkchen stoppt die Uhr.</div>
          {byLine ? (
            <div className="stack rounds">
              {steps!.map((x, i) => (
                <button key={i} className={`step-btn ${i < w.done ? "done" : ""}`} onClick={() => tapRound(i)} aria-label={x}><span className="set-btn">{i < w.done ? "✓" : "○"}</span><span>{x}</span></button>
              ))}
            </div>
          ) : (
            <div className="drill-group rounds">
              {steps!.map((x, i) => (
                <button key={i} className={`set-btn ${i < w.done ? "done" : ""}`} onClick={() => tapRound(i)} aria-label={`Runde ${x}`}>{i < w.done ? "✓" : x}</button>
              ))}
            </div>
          )}
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
          <span className="muted">kg {kind === "barbell" ? "Langhantel" : kind === "kettlebell" ? "Kettlebell" : "je Kurzhantel"}, für alle Lastübungen</span>
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

export function BeastCard({ blockId, beast, ctx, session, mut, note, easy, nextBeast, watchBase }: { blockId: string; beast: Beast | null; ctx: BeastCtx; watchBase: string; session?: Session; mut: (fn: (s: Session) => Session) => void; note?: string; easy?: boolean; nextBeast?: string }) {
  const t = useTimer();
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
  const runOf = (s?: Session): BeastRun => s?.beastRuns?.[blockId] ?? (!s?.beastRuns && (s?.beast?.id === beast.id || s?.beastParts?.length) ? { beast: s?.beast, parts: s?.beastParts } : {});
  const run = runOf(session);
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
              <BeastTimer times={isLoadBeast(beastById(pt.id)!) ? [] : ctx.state.beastTimes[pt.id] ?? []} saved={curPart(u)?.seconds ?? null} steps={stepsOf(pt)} watchKey={`${watchBase}:${blockId}:${u}:${pt.id}`} onSave={(sec) => saveUnit(u, sec)} onStart={() => mut((s) => s)} />
            </div>
          ))}
        </>
      ) : (
        <>
          {work(beast)}
          {isLoadBeast(beast) && <LoadField beast={beast} ctx={ctx} cur={cur} onChange={setLoadSingle} />}
          <BeastTimer times={isLoadBeast(beast) ? [] : ctx.state.beastTimes[beast.id] ?? []} saved={cur?.seconds ?? null} steps={stepsOf(beast)} watchKey={`${watchBase}:${blockId}:${beast.id}`} onSave={saveSingle} onStart={() => mut((s) => s)} />
        </>
      )}
      {note && <div className="muted small">{note}</div>}
    </section>
  );
}

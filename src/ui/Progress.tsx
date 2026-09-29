import { useMemo, useState } from "react";
import { EXERCISES } from "../data";
import { beastById, fmtDate } from "../engine/plan";
import { isLoadable } from "../engine/loads";
import { MUSCLES, volumeRange, weeklyVolume } from "../engine/volume";
import type { AppState } from "../types";
import { Collapse } from "./common";
import { fmt } from "./Timer";

type Point = { date: string; value: number; label: string };

/** Verlauf einer Übung oder Bestie als Linie. Eine Reihe, daher keine Legende; Werte zusätzlich als Tabelle. */
function LineChart({ points, unit, lowerBetter }: { points: Point[]; unit: string; lowerBetter?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 340, H = 150, L = 40, R = 12, T = 12, B = 24;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const h = hover != null ? points[hover] : null;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verlauf, ${points.length} Einheiten, zuletzt ${points[points.length - 1].label}`}
        onMouseLeave={() => setHover(null)}>
        {[lo + pad, hi - pad].map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={L - 6} y={y(v) + 4} className="chart-tick" textAnchor="end">{unit === "s" ? fmt(v) : Math.round(v * 10) / 10}</text>
          </g>
        ))}
        <text x={L} y={H - 6} className="chart-tick">{fmtDate(points[0].date)}</text>
        {points.length > 1 && <text x={W - R} y={H - 6} className="chart-tick" textAnchor="end">{fmtDate(points[points.length - 1].date)}</text>}
        <path d={d} className="chart-line" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} className="chart-dot" />
            <rect x={x(i) - 14} y={T} width={28} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          </g>
        ))}
        {h && hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="chart-cross" />}
      </svg>
      <div className="small muted chart-readout">{h ? <>{fmtDate(h.date)}: <strong>{h.label}</strong></> : `Tippen für Werte${lowerBetter ? " · niedriger ist besser" : ""}`}</div>
      <details className="small muted"><summary>Als Tabelle</summary>
        <table className="chart-table"><tbody>{points.map((p, i) => <tr key={i}><td>{fmtDate(p.date)}</td><td>{p.label}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

/** Verlauf: je Übung der beste Satz einer Einheit (geschätztes 1RM, Wiederholungen oder Sekunden), je Bestie die Zeit */
export function ProgressView({ state }: { state: AppState }) {
  const series = useMemo(() => {
    const ex: Record<string, Point[]> = {};
    const kind: Record<string, "e1rm" | "reps" | "hold"> = {};
    for (const s of [...state.sessions].filter((x) => x.done).sort((a, b) => a.date.localeCompare(b.date))) {
      for (const e of Object.values(s.entries)) {
        const done = e.sets.filter((x) => x.done);
        if (!done.length || e.prog === "none") continue;
        const loaded = isLoadable(EXERCISES[e.name]?.equip ?? "bodyweight") && done.some((x) => x.weight != null);
        let value = 0, label = "";
        if (loaded) {
          const best = done.reduce((b, x) => { const v = (x.weight ?? 0) * (1 + (x.reps ?? 0) / 30); return v > b.v ? { v, x } : b; }, { v: 0, x: done[0] });
          value = Math.round(best.v * 10) / 10; label = `${best.x.reps ?? "?"} × ${String(best.x.weight).replace(".", ",")} kg (≈ ${String(value).replace(".", ",")} kg 1RM)`; kind[e.name] = "e1rm";
        } else if (done.some((x) => x.seconds)) {
          value = Math.max(...done.map((x) => x.seconds ?? 0)); label = `${value} s`; kind[e.name] ??= "hold";
        } else {
          value = Math.max(...done.map((x) => x.reps ?? 0)); label = `${value} Wdh`; kind[e.name] ??= "reps";
        }
        if (value > 0) (ex[e.name] ??= []).push({ date: s.date, value, label });
      }
    }
    const beasts = Object.entries(state.beastTimes).filter(([, t]) => t.length).map(([id, t]) => ({ id, name: beastById(id)?.name ?? id, points: t.map((x) => ({ date: x.date, value: x.seconds, label: fmt(x.seconds) })) }));
    return { ex, kind, beasts };
  }, [state.sessions, state.beastTimes]);
  const names = Object.keys(series.ex).filter((n) => series.ex[n].length >= 2).sort();
  const [sel, setSel] = useState<string>("");
  if (!names.length && !series.beasts.some((b) => b.points.length >= 2)) return null;
  const pick = sel || names[0] || `beast:${series.beasts.find((b) => b.points.length >= 2)?.id}`;
  const isBeast = pick.startsWith("beast:");
  const b = isBeast ? series.beasts.find((x) => `beast:${x.id}` === pick) : null;
  const pts = isBeast ? b?.points ?? [] : series.ex[pick] ?? [];
  const k = series.kind[pick];
  return (
    <Collapse title="Verlauf" meta={`${names.length} Übungen`}>
      <div className="stack">
        <select value={pick} onChange={(e) => setSel(e.target.value)} aria-label="Übung oder Bestie">
          {names.length > 0 && <optgroup label="Übungen">{names.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>}
          {series.beasts.some((x) => x.points.length >= 2) && <optgroup label="Bestien">{series.beasts.filter((x) => x.points.length >= 2).map((x) => <option key={x.id} value={`beast:${x.id}`}>{x.name}</option>)}</optgroup>}
        </select>
        {pts.length >= 1 && <LineChart points={pts} unit={isBeast ? "s" : k === "hold" ? "" : ""} lowerBetter={isBeast} />}
        <div className="muted small">{isBeast ? "Zeit pro Durchgang." : k === "e1rm" ? "Bester Satz der Einheit als geschätztes Maximalgewicht (Epley). So werden Einheiten mit unterschiedlichen Wiederholungen vergleichbar." : k === "hold" ? "Längste Haltezeit der Einheit." : "Meiste Wiederholungen in einem Satz."}</div>
      </div>
    </Collapse>
  );
}

/** Sätze pro Muskel je Woche. Wertneutral: Richtwert als Orientierung, ohne Ampel. */
export function VolumeView({ state, today }: { state: AppState; today: string }) {
  const weeks = weeklyVolume(state, today);
  // Standard: die letzte abgeschlossene Woche; die laufende ist einen Klick entfernt
  const [i, setI] = useState(weeks[0]?.running && weeks.length > 1 ? 1 : 0);
  if (!weeks.length) return null;
  const w = weeks[Math.min(i, weeks.length - 1)];
  const [lo, hi] = volumeRange(state.user);
  const max = Math.max(hi + 4, ...Object.values(w.sets));
  const shown = MUSCLES.filter((m) => (w.sets[m] ?? 0) > 0 || !["Unterarme", "Nacken"].includes(m));
  return (
    <Collapse title="Wochenüberblick" meta={w.running ? "Woche läuft" : `${w.sessions} Einheiten`}>
      <div className="stack">
        <div className="row between">
          <button className="btn ghost small" disabled={i >= weeks.length - 1} onClick={() => setI(i + 1)} aria-label="Frühere Woche">‹</button>
          <span className="small">Woche ab {fmtDate(w.monday)}{w.running ? " (läuft noch)" : ""} · {w.sessions} {w.sessions === 1 ? "Einheit" : "Einheiten"}</span>
          <button className="btn ghost small" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Spätere Woche">›</button>
        </div>
        <div className="vol-list">
          {shown.map((m) => {
            const v = Math.round((w.sets[m] ?? 0) * 2) / 2;
            return (
              <div key={m} className="vol-row">
                <span className="small">{m}</span>
                <div className="vol-track" aria-hidden>
                  <div className="vol-band" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
                  <div className="vol-fill" style={{ width: `${(v / max) * 100}%` }} />
                </div>
                <span className="small mono">{String(v).replace(".", ",")}</span>
              </div>
            );
          })}
        </div>
        <p className="muted small">Harte Sätze pro Muskel, mitbeteiligte Muskeln zählen halb. Das helle Feld ist ein Richtwert ({lo}–{hi}), kein Soll: Wie viele Tage in eine Woche passen, entscheidet der Alltag, und jede Woche, die stattfindet, bringt dich weiter. Den Richtwert kannst du unter Setup › Profil anpassen.</p>
      </div>
    </Collapse>
  );
}

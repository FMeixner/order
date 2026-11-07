import { useState } from "react";
import { AXES, balanceOf, balanceWindows } from "../engine/balance";
import { fmtDate } from "../engine/plan";
import type { PlanBlock } from "../types";

/** Jahresbalance im Jahresblick: Skala von spezialisiert bis allround, dazu die Verteilung auf die acht Bereiche. */
export function YearBalance({ plan }: { plan: PlanBlock[] }) {
  const windows = balanceWindows(plan);
  const [sel, setSel] = useState("plan");
  if (!windows.length) return null;
  const w = windows.find((x) => x.id === sel) ?? windows[0];
  const b = balanceOf(plan, w.from, w.to);
  const sorted = [...AXES].sort((x, y) => b.share[y.id] - b.share[x.id]);
  const missing = AXES.filter((a) => b.share[a.id] < 0.02).map((a) => a.name);
  return (
    <div className="stack">
      <div className="label teal"><span className="bar" />Jahresbalance</div>
      {windows.length > 1 && (
        <div className="chips">
          {windows.map((x) => <button key={x.id} className={x.id === w.id ? "on" : ""} onClick={() => setSel(x.id)}>{x.label}</button>)}
        </div>
      )}
      <div className="muted small">{fmtDate(w.from)} – {fmtDate(w.to)} · {b.weeks} Wochen geplant</div>
      {b.score != null && (
        <>
          <div className="balance-scale" role="img" aria-label={`Balance ${Math.round(b.score * 100)} von 100: ${b.label}`}>
            <div className="balance-track"><div className="balance-marker" style={{ left: `${b.score * 100}%` }} /></div>
            <div className="row between small muted"><span>Spezialist</span><span>Allrounder</span></div>
          </div>
          <div className="balance-bars">
            {sorted.map((a) => (
              <div key={a.id} className={`balance-row ${b.share[a.id] < 0.02 ? "dim" : ""}`}>
                <span className="small">{a.name}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, b.share[a.id] * 100 / Math.max(0.01, b.share[sorted[0].id]))}%` }} /></div>
                <span className="small mono">{Math.round(b.share[a.id] * 100)} %</span>
              </div>
            ))}
          </div>
          {missing.length > 0 && <div className="muted small">Kaum vertreten: {missing.join(", ")}.</div>}
        </>
      )}
    </div>
  );
}

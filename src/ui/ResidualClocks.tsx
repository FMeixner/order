/* Residual-Uhren im Jahresblick: Tage seit dem letzten wirksamen Reiz je Bereich, aus
   erledigten Einheiten abgeleitet. Rot ist Lenkhilfe, kein Planer — die Zählregeln stehen
   in der Anleitung. Die Uhren fließen als Gewichte in Blockfolge und Meso-Wizard ein. */
import { useMemo } from "react";
import { fmtDate } from "../engine/plan";
import { residualClocks } from "../engine/residual";
import { opportunities } from "../engine/steer";
import type { AppState } from "../types";

export function ResidualClocks({ state, today }: { state: AppState; today: string }) {
  const clocks = useMemo(() => residualClocks(state, today), [state, today]);
  if (!state.sessions.some((s) => s.done)) return null;
  const over = clocks.filter((c) => c.over);
  const sorted = [...clocks].sort((a, b) => {
    const fill = (c: typeof a) => (c.days ?? 99) / c.budget;
    return Number(b.over) - Number(a.over) || fill(b) - fill(a);
  });
  return (
    <div className="stack">
      <div className="label teal"><span className="bar" />Residual-Uhren</div>
      <div className="balance-bars">
        {sorted.map((c) => (
          <div key={c.id} className={`balance-row ${c.over ? "" : c.days === null ? "dim" : ""}`}
            title={c.last ? `Letzter Reiz: ${fmtDate(c.last)}` : "Noch kein Reiz im Log"}>
            <span className="small">{c.name}</span>
            <div className="bar-track" aria-hidden>
              <div className="bar-fill" style={{ width: `${Math.min(100, ((c.days ?? 0) / c.budget) * 100)}%`, ...(c.over ? { background: "var(--amber)" } : {}) }} />
            </div>
            <span className="small mono">{c.days === null ? "noch nie" : `${c.days}/${c.budget}`}</span>
          </div>
        ))}
      </div>
      {over.length > 0 && (
        <ul className="slot-list small muted">
          {opportunities(clocks).map((o) => <li key={o.clock}>{o.text}</li>)}
        </ul>
      )}
    </div>
  );
}

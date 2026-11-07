/* Residual-Uhren im Plan-Tab: Tage seit dem letzten wirksamen Reiz je Bereich, aus erledigten
   Einheiten abgeleitet. Bewusst nicht auf der Tageskarte — die Uhren sind Jahresblick, keine
   Tagespflicht. Rot ist Lenkhilfe, kein Planer: Nichts wird automatisch eingeplant. */
import { useMemo } from "react";
import { fmtDate } from "../engine/plan";
import { residualClocks } from "../engine/residual";
import { opportunities } from "../engine/steer";
import type { AppState } from "../types";
import { Collapse } from "./common";

export function ResidualClocks({ state, today }: { state: AppState; today: string }) {
  const clocks = useMemo(() => residualClocks(state, today), [state, today]);
  if (!state.sessions.some((s) => s.done)) return null;
  const over = clocks.filter((c) => c.over);
  const sorted = [...clocks].sort((a, b) => {
    const fill = (c: typeof a) => (c.days ?? 99) / c.budget;
    return Number(b.over) - Number(a.over) || fill(b) - fill(a);
  });
  return (
    <Collapse title="Residual-Uhren" meta={over.length ? `${over.length} über Budget` : "alles im Budget"} tone="teal">
      <div className="stack">
        {over.length > 0 && (
          <div className="note warn">
            {over.map((c) => c.name).join(", ")} {over.length === 1 ? "ist" : "sind"} über Budget — ein Orden mit diesem Bereich als Ziel,
            ein Schwerpunkt-Slot oder eine passende Bestie hält {over.length === 1 ? "ihn" : "sie"} frisch.
          </div>
        )}
        {over.length > 0 && (
          <ul className="slot-list small">
            <li><strong>Gelegenheiten aus dem Bestand:</strong></li>
            {opportunities(clocks).map((o) => <li key={o.clock}>{o.text}</li>)}
          </ul>
        )}
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
        <details className="small muted">
          <summary>Wie wird gezählt?</summary>
          <p>Jede Uhr zählt die Tage seit dem letzten wirksamen Reiz ihres Bereichs, abgeleitet aus deinen erledigten Einheiten — ohne neue Eingaben. Bestien zählen für Kraftausdauer und Anaerob, ihre Sprint- und Sprunganteile für Sprungkraft und Schnelligkeit. Kontrastpaare: Der Explosivteil zählt für Sprungkraft. Kraft-Sätze setzen die Kraft-Uhr (Masse läuft mit), Halteübungen die Sehnen-Uhr, Lauf- und Ruderblöcke die Ausdauer, Intervalle die anaerobe. Schwerpunkt-Module setzen die Uhr ihres Bereichs, Flows die der Beweglichkeit. Warm-up und Cool-down sind Vorbereitung und zählen nicht. Die freie Jagd zählt wie jede Bestie.</p>
        </details>
      </div>
    </Collapse>
  );
}

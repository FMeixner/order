/* Deine Verhältnisse (1.33): Wo du zwei verwandte Übungen selbst trainierst, rechnet die App mit deinem Verhältnis statt
   mit dem hinterlegten — automatisch, ohne Bestätigung. Hier steht nur, was sie gelernt hat. */
import { useMemo } from "react";
import { bodyweightOf, ownBridges, ownRatios } from "../engine/progression";
import { isoDate } from "../engine/plan";
import type { AppState } from "../types";
import { Collapse } from "./common";

const n2 = (x: number) => String(x).replace(".", ",");

export function RatioList({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const today = isoDate(new Date());
  const bw = bodyweightOf(state);
  const fams = useMemo(() => ownRatios(state.slots, today), [state.slots, today]);
  const bridges = useMemo(() => ownBridges(state.slots, { bodyweight: bw, today }), [state.slots, bw, today]);
  const n = fams.reduce((k, f) => k + Object.keys(f.ratios).length - 1, 0) + bridges.length;
  const testBw = (state.tests["t-bodyweight"] ?? []).slice(-1)[0]?.value;
  return (
    <Collapse title="Deine Verhältnisse" meta={n ? `${n} gemessen` : "noch keine"}>
      <p className="muted small">Hat eine Übung noch kein Gewicht, schätzt die App es aus einer verwandten. Trainierst du zwei Übungen einer Familie selbst (letzte 12 Wochen), gilt dein Verhältnis statt des hinterlegten — die Schätzung setzt dann 10 % tiefer an statt 15 %. Entfernte Überträge (Rudern → Curls, Dips → Trizeps, Bankdrücken → Seitheben) greifen nur, wenn die Familie selbst nichts hat, mit 25 % Abschlag.</p>
      {fams.length === 0 && bridges.length === 0 && <div className="muted small">Noch nichts gemessen.</div>}
      {fams.map((f) => (
        <div key={f.family} className="stack tight">
          <div className="block-label">{f.family} · Bezug {f.ref}</div>
          <div className="packet-list">
            {Object.entries(f.ratios).filter(([name]) => name !== f.ref).map(([name, r]) => (
              <div key={name} className="ratio-row"><span>{name}</span><span className="mono small">{n2(r.stored)} → <b>{n2(r.measured)}</b></span></div>
            ))}
          </div>
        </div>
      ))}
      {bridges.length > 0 && (
        <div className="stack tight">
          <div className="block-label">Entfernte Überträge</div>
          <div className="packet-list">
            {bridges.map((b) => <div key={`${b.from}>${b.to}`} className="ratio-row"><span>{b.from} → {b.to}</span><span className="mono small">{n2(b.stored)} → <b>{n2(b.measured)}</b></span></div>)}
          </div>
        </div>
      )}
      <label className="packet-row">
        <span>Körpergewicht (kg) <span className="muted small">für Schätzungen aus Dips, Klimmzügen, Push-ups</span></span>
        <input type="number" inputMode="decimal" min={30} max={250} placeholder={testBw ? String(testBw) : "–"} value={state.user.bodyweight ?? ""} aria-label="Körpergewicht"
          onChange={(e) => { const v = Number(e.target.value.replace(",", ".")); update((s) => ({ ...s, user: { ...s.user, bodyweight: e.target.value && v > 0 ? v : null } })); }} />
      </label>
    </Collapse>
  );
}

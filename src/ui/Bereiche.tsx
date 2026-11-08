/* Bereiche (1.3): eine Liste statt Uhren, Domänen-Bilanz und Jahresbalance. Je Bereich zwei Punkte:
   Frische (wie lange der letzte Reiz her ist, Rückblick aus dem Log) und Im Plan (wie viele Wochen das
   nächste halbe Jahr den Bereich trägt). Darunter: was du für fällige Bereiche tun kannst, eine Zeile zur
   Abwechslung und die Waage Spezialist ↔ Allrounder. Die Zählregeln stehen in der Anleitung. */
import { useMemo } from "react";
import { balanceOf } from "../engine/balance";
import { bereiche, type BereichRow, type Fresh, type Watch } from "../engine/bereiche";
import { mesoBalance } from "../engine/bilanz";
import { addDays } from "../engine/plan";
import type { ResidualClock } from "../engine/residual";
import { opportunities } from "../engine/steer";
import type { AppState, PlanBlock } from "../types";
import { GOAL_LABEL } from "./PlanEditor";

const WATCH: Record<Watch, string> = { gut: "ok", bald: "soon", fehlt: "due" };
/** Details auf Antippen/Überfahren: beide Messungen hinter dem einen Zustand */
const detail = (r: BereichRow) => `${FRESH[r.fresh].title(r)} · ${r.def.required ? `${fmtW(r.weeks)} Wochen im nächsten halben Jahr (Richtwert 4)` : `${fmtW(r.weeks)} Wochen im Plan (ohne Richtwert)`}`;
const FRESH: Record<Fresh, { cls: string; text: (r: BereichRow) => string; title: (r: BereichRow) => string }> = {
  fresh: { cls: "ok", text: (r) => `vor ${r.days} T.`, title: (r) => `Letzter Reiz vor ${r.days} Tagen — hält etwa ${r.budget} Tage` },
  soon: { cls: "soon", text: (r) => `vor ${r.days} T.`, title: (r) => `Bald fällig: vor ${r.days} Tagen, hält etwa ${r.budget} Tage` },
  due: { cls: "due", text: () => "fällig", title: (r) => `Fällig: letzter Reiz vor ${r.days} Tagen, hält etwa ${r.budget} Tage` },
  never: { cls: "due", text: () => "noch nie", title: () => "Noch kein Reiz im Log" },
  none: { cls: "none", text: () => "–", title: (r) => (r.def.clock ? "Noch keine Einheiten im Log" : "Ohne Uhr: wird in der Testwoche gemessen") },
};
const fmtW = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

export function Bereiche({ state, plan, today, clocks }: { state: AppState; plan: PlanBlock[]; today: string; clocks: ResidualClock[] }) {
  const rows = useMemo(() => bereiche(state, today, plan, clocks), [state, today, plan, clocks]);
  const tips = opportunities(clocks);
  const streaks = mesoBalance(plan).streaks;
  const bal = balanceOf(plan, today, addDays(today, 26 * 7 - 1));
  return (
    <div className="stack bereiche">
      <div className="ber-grid" role="table" aria-label="Bereiche">
        {rows.map((r) => (
          <div key={r.def.id} className="ber-row" role="row" title={detail(r)}>
            <span role="cell"><span className="ber-name">{r.def.name}</span><span className="ber-hint">{r.def.hint}</span></span>
            <span role="cell" className={`ber-pill ${WATCH[r.watch]}`}><i />{r.watch === "gut" ? "gut" : r.why}</span>
          </div>
        ))}
      </div>
      {tips.length > 0 && (
        <ul className="slot-list small">
          {tips.slice(0, 3).map((o) => <li key={o.clock}><strong>{rows.find((r) => r.def.clock === o.clock)?.def.name}:</strong> {o.text}</li>)}
        </ul>
      )}
      {streaks.length > 0 && <div className="note warn small">{streaks.map((s) => `${GOAL_LABEL[s.goal]} ${s.labels.length}-mal in Folge`).join("; ")} — Abwechslung fehlt.</div>}
      {bal.score != null && (
        <div className="balance-scale" role="img" aria-label={`Nächstes halbes Jahr: ${bal.label}`}>
          <div className="balance-track"><div className="balance-marker" style={{ left: `${bal.score * 100}%` }} /></div>
          <div className="row between small muted"><span>Spezialist</span><span>{bal.label}</span><span>Allrounder</span></div>
        </div>
      )}
    </div>
  );
}

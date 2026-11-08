/* Bereiche (1.3): eine Liste statt Uhren, Domänen-Bilanz und Jahresbalance. Je Bereich zwei Punkte:
   Frische (wie lange der letzte Reiz her ist, Rückblick aus dem Log) und Im Plan (wie viele Wochen das
   nächste halbe Jahr den Bereich trägt). Darunter: was du für fällige Bereiche tun kannst, eine Zeile zur
   Abwechslung und die Waage Spezialist ↔ Allrounder. Die Zählregeln stehen in der Anleitung. */
import { useMemo } from "react";
import { balanceOf } from "../engine/balance";
import { bereiche, type BereichRow, type Cover, type Fresh } from "../engine/bereiche";
import { mesoBalance } from "../engine/bilanz";
import { addDays } from "../engine/plan";
import type { ResidualClock } from "../engine/residual";
import { opportunities } from "../engine/steer";
import type { AppState, PlanBlock } from "../types";
import { GOAL_LABEL } from "./PlanEditor";

const FRESH: Record<Fresh, { cls: string; text: (r: BereichRow) => string; title: (r: BereichRow) => string }> = {
  fresh: { cls: "ok", text: (r) => `vor ${r.days} T.`, title: (r) => `Letzter Reiz vor ${r.days} Tagen — hält etwa ${r.budget} Tage` },
  soon: { cls: "soon", text: (r) => `vor ${r.days} T.`, title: (r) => `Bald fällig: vor ${r.days} Tagen, hält etwa ${r.budget} Tage` },
  due: { cls: "due", text: () => "fällig", title: (r) => `Fällig: letzter Reiz vor ${r.days} Tagen, hält etwa ${r.budget} Tage` },
  never: { cls: "due", text: () => "noch nie", title: () => "Noch kein Reiz im Log" },
  none: { cls: "none", text: () => "–", title: (r) => (r.def.clock ? "Noch keine Einheiten im Log" : "Ohne Uhr: wird in der Testwoche gemessen") },
};
const COVER: Record<Cover, { cls: string; text: (r: BereichRow) => string }> = {
  ok: { cls: "ok", text: (r) => `${fmtW(r.weeks)} Wo.` },
  thin: { cls: "soon", text: (r) => `knapp · ${fmtW(r.weeks)}` },
  missing: { cls: "due", text: () => "fehlt" },
  free: { cls: "none", text: (r) => (r.weeks ? `${fmtW(r.weeks)} Wo.` : "–") },
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
        <div className="ber-head" role="row"><span role="columnheader">Bereich</span><span role="columnheader">Frische</span><span role="columnheader">Im Plan · ½ Jahr</span></div>
        {rows.map((r) => {
          const f = FRESH[r.fresh], c = COVER[r.cover];
          return (
            <div key={r.def.id} className="ber-row" role="row">
              <span role="cell"><span className="ber-name">{r.def.name}</span><span className="ber-hint">{r.def.hint}</span></span>
              <span role="cell" className={`ber-pill ${f.cls}`} title={f.title(r)}><i />{f.text(r)}</span>
              <span role="cell" className={`ber-pill ${c.cls}`} title={r.def.required ? "Effektive Wochen im nächsten halben Jahr (Hauptziel voll, Nebenziel halb); Richtwert 4" : "Ohne Richtwert, nur angezeigt"}><i />{c.text(r)}</span>
            </div>
          );
        })}
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

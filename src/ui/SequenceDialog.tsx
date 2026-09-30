import { useMemo, useState } from "react";
import { fmtDate, focusName, isTestBlock } from "../engine/plan";
import { AIM_OPTIONS, suggestSequence, type Aim, type DeficitWeights } from "../engine/sequence";
import type { PlanBlock } from "../types";
import { Modal } from "./common";

const LABEL = (s: number | null) => (s == null ? "–" : s < 0.62 ? "spezialisiert" : s < 0.8 ? "mit Schwerpunkt" : "allround");

/** Vorschlag einer Blockfolge für alle künftigen Phasen, mit Ziel Allround oder einem Schwerpunkt. */
export function SequenceDialog({ plan, today, deficits = [], deficitNames = [], onApply, onClose }: { plan: PlanBlock[]; today: string; deficits?: DeficitWeights; deficitNames?: string[]; onApply: (p: PlanBlock[]) => void; onClose: () => void }) {
  const [aim, setAim] = useState<Aim>(deficits.length ? "deficits" : "allround");
  const res = useMemo(() => suggestSequence(plan, today, aim, deficits), [plan, today, aim, deficits]);
  const byId = Object.fromEntries(plan.map((b) => [b.id, b]));
  const changes = res.items.filter((x) => !x.locked && x.focusId !== byId[x.id].focusId).length;
  return (
    <Modal title="Blockfolge vorschlagen" onClose={onClose} wide>
      <div className="stack">
        <p className="muted small">Die App wählt für jede künftige Phase einen Orden: passend zur Alltagslast und Länge, mit guten Übergängen und ohne denselben Orden zweimal hintereinander. Laufende und vergangene Phasen bleiben.</p>
        <div className="small muted">Richtung für das Jahr</div>
        <div className="chips">
          {AIM_OPTIONS.filter((o) => o.value !== "deficits" || deficits.length).map((o) => <button key={o.value} className={aim === o.value ? "on" : ""} onClick={() => setAim(o.value)}>{o.label}</button>)}
        </div>
        {aim === "deficits" && <p className="muted small">Schwache Bereiche aus der letzten Testwoche zuerst: {deficitNames.join(", ")}. Die Breite übers Jahr zählt weiter mit.</p>}
        <div className="seq-list">
          {res.items.map((x) => {
            const b = byId[x.id];
            const cur = b.focusId ? { name: focusName(b.focusId) } : null;
            const next = { name: focusName(x.focusId) };
            const changed = !x.locked && x.focusId !== b.focusId;
            return (
              <div key={x.id} className={`seq-row ${x.locked ? "locked" : ""} ${changed ? "changed" : ""}`}>
                <div className="block-dates">{fmtDate(b.start)} – {fmtDate(b.end)}</div>
                <div>
                  {changed && cur ? <><s className="muted">{cur.name}</s> → </> : null}
                  <strong>{next?.name ?? "–"}</strong>
                  {x.reasons.length > 0 && !x.locked && <span className="muted small"> · {x.reasons.join(", ")}</span>}
                  {x.locked && <span className="muted small"> · {isTestBlock(b) ? "bleibt" : "läuft oder vorbei"}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="small">Jahresbalance: {res.before.score != null ? `${res.before.score.toFixed(2)} (${LABEL(res.before.score)})` : "–"} → <strong>{res.balance.score?.toFixed(2)} ({LABEL(res.balance.score)})</strong></div>
        <div className="row">
          <button className="btn primary" disabled={!changes} onClick={() => { onApply(plan.map((b) => ({ ...b, focusId: res.items.find((x) => x.id === b.id)?.focusId ?? b.focusId }))); onClose(); }}>
            {changes ? `Übernehmen (${changes} ${changes === 1 ? "Phase" : "Phasen"})` : "Nichts zu ändern"}
          </button>
          <button className="btn ghost" onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </Modal>
  );
}

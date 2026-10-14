import { useMemo, useState } from "react";
import { fmtDate, focusName, isTestBlock } from "../engine/plan";
import { AIM_OPTIONS, suggestSequence, type Aim, type DeficitWeights } from "../engine/sequence";
import type { PlanBlock } from "../types";
import { AXES, type Balance } from "../engine/balance";
import { Modal } from "./common";

/** Gleichmäßigkeit (0–1) als „effektiv gleich stark trainierte Bereiche“: Anzahl hoch Wert, gerundet */
const spread = (score: number) => Math.max(1, Math.round(AXES.length ** score));
/** Satz zur Wirkung: welche Bereiche gewinnen und verlieren (ab 3 Prozentpunkten, je höchstens zwei), wie breit das Jahr wird */
function summary(before: Balance, after: Balance, changes: number): string {
  if (!changes) return "Die Blockfolge passt schon zu dieser Richtung.";
  const d = AXES.map((a) => ({ name: a.name, x: (after.share[a.id] ?? 0) - (before.share[a.id] ?? 0) })).filter((v) => Math.abs(v.x) >= 0.03);
  const up = d.filter((v) => v.x > 0).sort((a, b) => b.x - a.x).slice(0, 2).map((v) => v.name);
  const down = d.filter((v) => v.x < 0).sort((a, b) => a.x - b.x).slice(0, 2).map((v) => v.name);
  const what = [up.length && `mehr ${up.join(" und ")}`, down.length && `weniger ${down.join(" und ")}`].filter(Boolean).join(", aber ");
  const b0 = before.score != null ? spread(before.score) : null, b1 = after.score != null ? spread(after.score) : null;
  const width = b0 == null || b1 == null ? "" : b1 > b0 ? ` Dein Jahr wird breiter: etwa ${b1} statt ${b0} von ${AXES.length} Bereichen.` : b1 < b0 ? ` Dein Jahr wird schmaler: etwa ${b1} statt ${b0} von ${AXES.length} Bereichen.` : ` Die Breite bleibt bei etwa ${b1} von ${AXES.length} Bereichen.`;
  return `${what ? `Diese Änderung der Blockfolge führt zu ${what}.` : "Diese Änderung der Blockfolge verschiebt die Bereiche kaum."}${width}`;
}

/** Vorschlag einer Blockfolge für alle künftigen Phasen, mit Ziel Allround oder einem Schwerpunkt. */
export function SequenceDialog({ plan, today, deficits = [], deficitNames = [], onApply, onClose, initialAim }: { plan: PlanBlock[]; today: string; deficits?: DeficitWeights; deficitNames?: string[]; onApply: (p: PlanBlock[]) => void; onClose: () => void; initialAim?: Aim }) {
  const [aim, setAim] = useState<Aim>(initialAim ?? (deficits.length ? "deficits" : "allround"));
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
        <p className="small">{summary(res.before, res.balance, changes)}</p>
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

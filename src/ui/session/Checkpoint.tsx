/* Checkpoint (1.47): Ist Schnelligkeit oder Sprungkraft der Schwerpunkt, steht frühestens alle vier Wochen ein Versuch
   frisch am Anfang der Schwerpunkt-Karte — Standweitsprung oder 30-m-Sprint. Zwei bessere Checkpoints in Folge geben den
   Schwerpunkt frei (sharpen.ts). Auslassen ist jederzeit möglich: der Checkpoint kommt dann beim nächsten Mal wieder. */
import { useState } from "react";
import { checkpointDue, checkpointTest, saveCheckpoint } from "../../engine/fitness";
import { parseClock } from "../../engine/clock";
import type { SessionCtx } from "./ctx";

export function Checkpoint({ ctx, domain }: { ctx: SessionCtx; domain: string }) {
  const t = checkpointTest(domain);
  const [val, setVal] = useState("");
  const [later, setLater] = useState(false);
  if (!t) return null;
  const saved = (ctx.state.checkpoints?.[t.id] ?? []).find((r) => r.date === ctx.date);
  if (!saved && (later || !checkpointDue(ctx.state, ctx.block.start, domain, ctx.date))) return null;
  const all = [...(ctx.state.checkpoints?.[t.id] ?? []), ...(ctx.state.tests[t.id] ?? [])].filter((r) => r.date < ctx.date).sort((a, b) => a.date.localeCompare(b.date));
  const last = all[all.length - 1];
  const v = t.unit === "mmss" ? parseClock(val) : parseFloat(val.replace(",", "."));
  const unit = t.unit === "cm" ? "cm" : t.unit === "s" ? "s" : "";
  return (
    <div className="test-row">
      <div className="slot-name">Checkpoint: {t.name}</div>
      <div className="muted small">Ein Versuch, frisch nach dem Warm-up. Alle vier Wochen; zweimal in Folge besser, dann ist der Schwerpunkt frei für den nächsten Bereich.</div>
      {saved ? <div className="muted small">Heute: <strong>{String(saved.value).replace(".", ",")} {unit}</strong>{last ? ` · davor ${String(last.value).replace(".", ",")} ${unit}` : ""}</div> : (
        <div className="row wrap">
          <input type="text" inputMode="decimal" className="test-in" placeholder="Wert" value={val} onChange={(e) => setVal(e.target.value)} aria-label={`Checkpoint ${t.name}`} />
          <button className="btn small" disabled={v == null || isNaN(v)} onClick={() => { ctx.update((st) => saveCheckpoint(st, t.id, ctx.block.id, v!, val, ctx.date)); setVal(""); }}>Speichern</button>
          <button className="btn ghost small" onClick={() => setLater(true)}>Nicht heute</button>
          {last && <span className="muted small">zuletzt {String(last.value).replace(".", ",")} {unit}</span>}
        </div>
      )}
    </div>
  );
}

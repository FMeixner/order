/* Volumen Soll-Ist (1.25): je Muskel die geplanten Sätze der laufenden Woche als Umriss, die erledigten gefüllt, dahinter
   das Zielband und die Erhaltungsmarke. Wertneutral: unter Erhaltung bernstein, sonst grün; über dem Band keine Warnung —
   Überschießen verhindert schon die Planung. Darunter die Konditionsminuten. */
import { useMemo } from "react";
import { addDays, blockFocus } from "../engine/plan";
import { slippingCore } from "../engine/progression";
import { MUSCLES, volumeNow } from "../engine/volume";
import type { AppState } from "../types";

const n05 = (x: number) => String(Math.round(x * 2) / 2).replace(".", ",");

export function VolumeCard({ state, today }: { state: AppState; today: string }) {
  const v = useMemo(() => volumeNow(state, today), [state, today]);
  const slips = useMemo(() => { const f = v?.deficit ? blockFocus(v.block) : undefined; return f ? slippingCore(state, f, addDays(today, -14)) : []; }, [state, today, v]);
  if (!v) return null;
  if (v.skip) {
    return (
      <section className="card stack" aria-label="Volumen diese Woche">
        <h2>Volumen diese Woche</h2>
        <div className="muted small">{v.skip === "deload" ? "Entlastungswoche: Volumen zählt nicht." : "Testwoche: Volumen zählt nicht."}</div>
      </section>
    );
  }
  const [lo, hi] = v.band;
  const rows = MUSCLES.filter((m) => (v.planned[m] ?? 0) + (v.done[m] ?? 0) > 0 || !["Unterarme", "Nacken"].includes(m));
  const max = Math.max(20, hi, ...rows.map((m) => Math.max(v.planned[m] ?? 0, v.done[m] ?? 0)));
  const at = (x: number) => `${(x / max) * 100}%`;
  const c = v.cardio;
  const cmax = Math.max(c.range[1], c.planned, c.done, 1);
  return (
    <section className="card stack" aria-label="Volumen diese Woche">
      <div className="row between wrap"><h2>Volumen diese Woche</h2><span className="muted small">Woche {v.week} · erledigt / geplant</span></div>
      {v.deficit && <div className="small held-line">Defizit-Phase: Halten ist das Ziel.</div>}
      <div className="vol-list">
        {rows.map((m) => {
          const d = v.done[m] ?? 0, p = v.planned[m] ?? 0;
          return (
            <div key={m} className="vol-row vol-plan">
              <span className="small">{m}</span>
              <div className="vol-track" aria-hidden>
                <div className="vol-band" style={{ left: at(lo), width: at(hi - lo) }} />
                {p > 0 && <div className="vol-planned" style={{ width: at(p) }} />}
                <div className={`vol-fill ${d < v.maint ? "under" : ""}`} style={{ width: at(d) }} />
                <div className="vol-maint" style={{ left: at(v.maint) }} />
              </div>
              <span className="small mono">{n05(d)}<span className="muted"> / {n05(p)}</span></span>
            </div>
          );
        })}
      </div>
      <div className="vol-row vol-plan vol-cardio">
        <span className="small">Kondition</span>
        <div className="vol-track" aria-hidden>
          <div className="vol-band" style={{ left: `${(c.range[0] / cmax) * 100}%`, width: `${((c.range[1] - c.range[0]) / cmax) * 100}%` }} />
          {c.planned > 0 && <div className="vol-planned" style={{ width: `${(c.planned / cmax) * 100}%` }} />}
          <div className="vol-fill" style={{ width: `${(c.done / cmax) * 100}%` }} />
        </div>
        <span className="small mono">{Math.round(c.done)}<span className="muted"> / {Math.round(c.planned)}′</span></span>
      </div>
      {v.deficit && <div className="note small">Im Defizit hält weniger Volumen den Stand.</div>}
      {slips.map((n) => <div key={n} className="note small">{n} gibt nach. Bei ausreichend Eiweiß und Schlaf fängt sich das meist; sonst Defizit eine Woche pausieren.</div>)}
      <p className="muted small">Harte Sätze je Muskel, mitbeteiligte Muskeln halb, Bestien nach Päckchen. Umriss: geplant diese Woche, gefüllt: erledigt. Das helle Feld ist {v.deficit ? "der Bereich von Erhaltung bis zum unteren Richtwert" : `dein Richtwert (${lo}–${hi})`}, die Linie bei {n05(v.maint)} die Erhaltung. Kondition in Minuten, Feld: {c.range[0]}–{c.range[1]}.</p>
    </section>
  );
}

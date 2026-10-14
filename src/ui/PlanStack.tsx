/* Jahresplan als Stapel: Band als Überblick, darunter je Phase eine Karte mit − / + (wochenweise, alles danach rückt mit),
   Testwoche am Ende als Schalter, Orden mit Empfehlung und zwei Alternativen. Feinheiten hinter „Phase bearbeiten“. */
import { useState } from "react";
import { FOCUS_BY_ID, TESTWEEK } from "../data";
import { blockWeeks, fmtDate, focusName, isTestBlock, newerFocus, refreeze } from "../engine/plan";
import { rankFor, type Aim, type DeficitWeights } from "../engine/sequence";
import { canShrink, isPast, resizeBlock, testAfter } from "../engine/stack";
import type { Load, PlanBlock } from "../types";
import { OrderMark } from "./OrderIcon";
import { Modal } from "./common";

const LOAD_TXT: Record<Load, string> = { low: "Last niedrig", medium: "Last mittel", high: "Last hoch" };
/** Kleine Symbole statt Text: Status der Phase und Alltagslast */
function StatusIcon({ kind }: { kind: "läuft" | "empfohlen" | "gewählt" }) {
  const label = { läuft: "läuft gerade", empfohlen: "empfohlen", gewählt: "selbst gewählt" }[kind];
  return (
    <span className={`sc-ico st-${kind === "läuft" ? "run" : kind === "empfohlen" ? "rec" : "own"}`} role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
        {kind === "läuft" && <path d="M5 3.5v9l7-4.5z" fill="currentColor" />}
        {kind === "empfohlen" && <path d="M8 2l1.8 3.8 4.1.5-3 2.8.8 4.1L8 11.2 4.3 13.2l.8-4.1-3-2.8 4.1-.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
        {kind === "gewählt" && <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </span>
  );
}
function LoadIcon({ load, travel }: { load: Load; travel: boolean }) {
  const n = { low: 1, medium: 2, high: 3 }[load];
  const label = `${LOAD_TXT[load]}${travel ? ", viel unterwegs" : ""}`;
  return (
    <span className="sc-ico load" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
        {[0, 1, 2].map((i) => <rect key={i} x={2 + i * 4.5} y={11 - i * 3.5} width="3" height={3 + i * 3.5} rx="0.8" fill="currentColor" opacity={i < n ? 1 : 0.25} />)}
      </svg>
      {travel && (
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
          <rect x="2" y="5" width="12" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 5V3.5h4V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </span>
  );
}
/** Farbe je Hauptziel (Band und Kartenrand) */
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

export function PlanStack({ plan, today, aim, deficits, onChange, onView, onEdit }: {
  plan: PlanBlock[]; today: string; aim: Aim; deficits: DeficitWeights;
  onChange: (p: PlanBlock[]) => void; onView: (b: PlanBlock) => void; onEdit: (b: PlanBlock) => void;
}) {
  const [testView, setTestView] = useState<PlanBlock | null>(null);
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const total = sorted.reduce((s, b) => s + blockWeeks(b), 0);
  const first = sorted[0]?.start, last = sorted[sorted.length - 1]?.end;
  const span = first && last ? Math.max(1, (new Date(`${last}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / 864e5 + 1) : 1;
  const nowPct = first ? Math.min(100, Math.max(0, ((new Date(`${today}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / 864e5 / span) * 100)) : 0;
  let n = 0;

  return (
    <div className="stack plan-stack">
      {sorted.length > 0 && (
        <div className="year-band-wrap" aria-label="Jahr im Überblick">
          <div className="year-band">
            {sorted.map((b) => (
              <div key={b.id} className={`yb-seg ${isTestBlock(b) ? "test" : ""}`} style={{ flex: blockWeeks(b), ["--c" as string]: isTestBlock(b) ? "var(--amber)" : goalColor(b.focusId) }} title={`${focusName(b.focusId)} · ${blockWeeks(b)} Wochen`}>
                {!isTestBlock(b) && blockWeeks(b) >= 4 && <OrderMark id={b.focusId} />}
              </div>
            ))}
            <span className="yb-now" style={{ left: `${nowPct}%` }} aria-hidden />
          </div>
          <div className="muted small">{fmtDate(first!)} – {fmtDate(last!)} · {total} Wochen · {((k) => (k === 1 ? "1 Testwoche" : `${k} Testwochen`))(sorted.filter(isTestBlock).length)}</div>
        </div>
      )}

      {testView && (
        <Modal title="Testwoche" onClose={() => setTestView(null)}>
          <div className="stack">
            <div className="block-dates">{fmtDate(testView.start)} – {fmtDate(testView.end)}</div>
            <p className="muted small">Fünf Cups, jeder frisch. Die Woche davor läuft mit −1 Satz, danach schlägt die Auswertung einen Schwerpunkt vor.</p>
            <ul className="slot-list">{TESTWEEK.cups.map((c) => <li key={c.id}><strong>{c.name}</strong> <span className="muted">· {c.focus}</span></li>)}</ul>
            <button className="btn ghost small" onClick={() => { onEdit(testView); setTestView(null); }}>Zeitraum ändern oder löschen</button>
          </div>
        </Modal>
      )}
      {sorted.map((b) => {
        const past = isPast(b, today), now = b.start <= today && today <= b.end, future = b.start > today;
        if (isTestBlock(b)) return (
          <button key={b.id} className={`stack-card test ${past ? "past" : ""}`} style={{ ["--c" as string]: "var(--amber)" }} onClick={() => setTestView(b)}>
            <OrderMark id="test" />
            <div className="sc-text">
              <div className="sc-name">Testwoche</div>
              <div className="block-dates">{fmtDate(b.start)} – {fmtDate(b.end)}</div>
            </div>
          </button>
        );
        n++;
        const t = testAfter(sorted, b);
        const top = future ? rankFor(plan, b.id, aim, deficits)[0]?.f.id : undefined;
        const tag = now ? "läuft" : past ? null : top === b.focusId ? "empfohlen" : "gewählt";
        return (
          <div key={b.id} className={`stack-card ${now ? "now" : ""} ${past ? "past" : ""}`} style={{ ["--c" as string]: goalColor(b.focusId) }}>
            <OrderMark id={b.focusId} />
            <div className="sc-text">
              <div className="sc-phase">{b.label || `Phase ${n}`}<LoadIcon load={b.load} travel={b.travel} /></div>
              <div className="sc-order">
                <button className="sc-name" onClick={() => onView(b)}>{focusName(b.focusId)}</button>
                {tag && <StatusIcon kind={tag} />}
              </div>
              <div className="block-dates">{fmtDate(b.start)} – {fmtDate(t?.end ?? b.end)}</div>
            </div>
            {!past && (
              <div className="sc-actions">
                <div className="sc-step">
                  <button className="btn ghost small" disabled={!canShrink(b, today)} onClick={() => onChange(resizeBlock(plan, b.id, -1, today))} aria-label="Eine Woche kürzer">−</button>
                  <span className="sc-weeks">{blockWeeks(b) + (t ? 1 : 0)} Wo.</span>
                  <button className="btn ghost small" onClick={() => onChange(resizeBlock(plan, b.id, 1, today))} aria-label="Eine Woche länger">+</button>
                </div>
                {t && <span className="sc-ico test" role="img" aria-label="mit Testwoche am Ende" title="mit Testwoche am Ende"><OrderMark id="test" /></span>}
                <button className="pen-btn sc-edit" onClick={() => onEdit(b)} aria-label="Phase bearbeiten" title="Phase bearbeiten">✎</button>
              </div>
            )}
            {newerFocus(b) && (
              <div className="row wrap small">
                <span className="muted">Neue Fassung des Ordens verfügbar. Diese Phase läuft mit dem Stand vom {fmtDate(b.frozen!.at)}.</span>
                <button className="btn ghost small" onClick={() => { if (confirm("Neue Fassung des Ordens für diese Phase übernehmen? Übungen und Tage können sich ändern, Einträge im Log bleiben.")) onChange(plan.map((x) => (x.id === b.id ? refreeze(x, today) : x))); }}>Übernehmen</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

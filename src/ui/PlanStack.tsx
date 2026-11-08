/* Jahresplan als Stapel: Band als Überblick, darunter je Phase eine Karte mit − / + (wochenweise, alles danach rückt mit),
   Testwoche am Ende als Schalter, Orden mit Empfehlung und zwei Alternativen. Feinheiten hinter „Phase bearbeiten“. */
import { FOCUS_BY_ID, TESTWEEK } from "../data";
import { flagsOf, klammerName } from "../engine/klammer";
import { FlagSign, KlammerIcon, Sign } from "./Signs";
import { blockWeeks, fmtDate, focusName, isTestBlock, newerFocus, refreeze } from "../engine/plan";
import { rankFor, type Aim, type DeficitWeights } from "../engine/sequence";
import { canShrink, isPast, resizeBlock, testAfter } from "../engine/stack";
import type { Load, PlanBlock, Section } from "../types";
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
function LoadIcon({ load }: { load: Load }) {
  const n = { low: 1, medium: 2, high: 3 }[load];
  const label = LOAD_TXT[load];
  return (
    <span className="sc-ico load" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
        {[0, 1, 2].map((i) => <rect key={i} x={2 + i * 4.5} y={11 - i * 3.5} width="3" height={3 + i * 3.5} rx="0.8" fill="currentColor" opacity={i < n ? 1 : 0.25} />)}
      </svg>
    </span>
  );
}
/** Farbe je Hauptziel (Band und Kartenrand) */
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

export function PlanStack({ plan, today, aim, deficits, steer, sections, onChange, onView, onEdit, testView, setTestView }: {
  plan: PlanBlock[]; today: string; aim: Aim; deficits: DeficitWeights; steer?: DeficitWeights; sections?: Section[];
  onChange: (p: PlanBlock[]) => void; onView: (b: PlanBlock) => void; onEdit: (b: PlanBlock) => void;
  testView: PlanBlock | null; setTestView: (b: PlanBlock | null) => void;
}) {
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  let n = 0;

  return (
    <div className="stack plan-stack">
      {testView && (
        <Modal title="Testwoche" onClose={() => setTestView(null)}>
          <div className="stack">
            <div className="block-dates">{fmtDate(testView.start)} – {fmtDate(testView.end)}</div>
            <p className="muted small">Fünf Cups an drei Tagen, jeder frisch. Die Woche davor läuft mit −1 Satz, danach schlägt die Auswertung einen Schwerpunkt vor.</p>
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
        const top = future ? rankFor(plan, b.id, aim, deficits, steer)[0]?.f.id : undefined;
        const tag = now ? "läuft" : past ? null : top === b.focusId ? "empfohlen" : "gewählt";
        return (
          <div key={b.id} className={`stack-card ${now ? "now" : ""} ${past ? "past" : ""}`} style={{ ["--c" as string]: goalColor(b.focusId) }}>
            <OrderMark id={b.focusId} />
            <div className="sc-text">
              <div className="sc-phase row">{b.klammer && <span className={`kl-${b.klammer}`} style={{ color: "var(--k)", display: "inline-flex" }} title={klammerName(b.klammer)}><KlammerIcon id={b.klammer} size={14} /></span>}{b.label || (b.klammer ? klammerName(b.klammer) : `Phase ${n}`)}<LoadIcon load={b.load} />{b.kcal && <Sign kind={b.kcal} />}<FlagSign flags={flagsOf(b, sections)} /></div>
              <div className="sc-order">
                <button className="sc-name" onClick={() => onView(b)}>{focusName(b.focusId)}</button>
                {tag && <StatusIcon kind={tag} />}
                {b.pin?.focus && <Sign kind="pin" />}
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

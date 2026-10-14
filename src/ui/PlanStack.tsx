/* Jahresplan als Stapel: Band als Überblick, darunter je Phase eine Karte mit − / + (wochenweise, alles danach rückt mit),
   Testwoche am Ende als Schalter, Orden mit Empfehlung und zwei Alternativen. Feinheiten hinter „Phase bearbeiten“. */
import { FOCUS_BY_ID } from "../data";
import { blockWeeks, fmtDate, focusName, isTestBlock, newerFocus, refreeze } from "../engine/plan";
import { rankFor, type Aim, type DeficitWeights } from "../engine/sequence";
import { canShrink, isPast, resizeBlock, setTestWeek, testAfter } from "../engine/stack";
import { uid } from "../store";
import type { Load, PlanBlock } from "../types";
import { OrderMark } from "./OrderIcon";

const LOAD_TXT: Record<Load, string> = { low: "Last niedrig", medium: "Last mittel", high: "Last hoch" };
/** Farbe je Hauptziel (Band und Kartenrand) */
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

export function PlanStack({ plan, today, aim, deficits, onChange, onView, onEdit }: {
  plan: PlanBlock[]; today: string; aim: Aim; deficits: DeficitWeights;
  onChange: (p: PlanBlock[]) => void; onView: (b: PlanBlock) => void; onEdit: (b: PlanBlock) => void;
}) {
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

      {sorted.map((b) => {
        const past = isPast(b, today), now = b.start <= today && today <= b.end, future = b.start > today;
        if (isTestBlock(b)) return (
          <div key={b.id} className={`stack-card test ${past ? "past" : ""}`} style={{ ["--c" as string]: "var(--amber)" }}>
            <OrderMark id="test" />
            <div className="sc-text">
              <div className="sc-phase">Testwoche</div>
              <div className="sc-order muted">fünf Cups, Auswertung danach</div>
              <div className="block-dates">{fmtDate(b.start)} – {fmtDate(b.end)}</div>
            </div>
          </div>
        );
        n++;
        const t = testAfter(sorted, b);
        const top = future ? rankFor(plan, b.id, aim, deficits)[0]?.f.id : undefined;
        const tag = now ? "läuft" : past ? "" : top === b.focusId ? "empfohlen" : "gewählt";
        return (
          <div key={b.id} className={`stack-card ${now ? "now" : ""} ${past ? "past" : ""}`} style={{ ["--c" as string]: goalColor(b.focusId) }}>
            <OrderMark id={b.focusId} />
            <div className="sc-text">
              <div className="sc-phase">{b.label || `Phase ${n}`}<span className="muted small"> · {LOAD_TXT[b.load]}{b.travel ? " · unterwegs" : ""}</span></div>
              <div className="sc-order">
                <button className="sc-name" onClick={() => onView(b)}>{focusName(b.focusId)}</button>
                {tag && <span className={`tag ${tag === "empfohlen" || tag === "läuft" ? "rec" : ""}`}>{tag}</span>}
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
                <button className={`pill ${t ? "on-amber" : ""}`} aria-pressed={!!t} disabled={!t && blockWeeks(b) < 3}
                  onClick={() => onChange(setTestWeek(plan, b.id, !t, uid("b")))}>{t ? "Test am Ende" : "ohne Test"}</button>
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

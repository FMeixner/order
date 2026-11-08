/* Jahresplan als Stapel: Band als Überblick, darunter je Phase eine Karte mit − / + (wochenweise, alles danach rückt mit),
   Testwoche am Ende als Schalter, Orden mit Empfehlung und zwei Alternativen. Feinheiten hinter „Phase bearbeiten“. */
import { FOCUS_BY_ID, TESTWEEK } from "../data";
import { Fragment, useState } from "react";
import { flagsOf, klammerName, klammernOf, type KlammerView } from "../engine/klammer";
import { FlagSign, KlammerIcon, Sign } from "./Signs";
import { blockWeeks, fmtDate, focusName, isTestBlock, newerFocus, refreeze } from "../engine/plan";
import { canShrink, isPast, resizeBlock, testAfter } from "../engine/stack";
import type { PlanBlock, Section } from "../types";
import { OrderMark } from "./OrderIcon";
import { Modal } from "./common";

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
/** Farbe je Hauptziel (Band und Kartenrand) */
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

export function PlanStack({ plan, today, sections, onChange, onView, onEdit, onKlammer, testView, setTestView }: {
  plan: PlanBlock[]; today: string; sections?: Section[];
  onChange: (p: PlanBlock[]) => void; onView: (b: PlanBlock) => void; onEdit: (b: PlanBlock) => void;
  onKlammer?: (k: KlammerView) => void; testView: PlanBlock | null; setTestView: (b: PlanBlock | null) => void;
}) {
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  // Weit weg Liegendes klappt ein: sichtbar bis zum Ende des übernächsten Zeichens, den Rest zeigt das Jahresbild
  const [all, setAll] = useState(false);
  const ahead = klammernOf(plan).filter((k) => k.end >= today);
  const cutoff = ahead.length > 2 ? ahead[1].end : null;
  const later = cutoff ? sorted.filter((b) => b.start > cutoff && !isTestBlock(b)).length : 0;

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
        const past = isPast(b, today), now = b.start <= today && today <= b.end;
        // Testwochen stehen nicht als eigene Karte im Stapel: das Testwochen-Symbol am Orden davor öffnet sie
        if (isTestBlock(b)) return null;
        if (!all && cutoff && b.start > cutoff) return null;
        const t = testAfter(sorted, b);
        // Zeichen-Kopf vor dem ersten Orden eines Zeichens: Tier, Stichwort, Kalorien, Zeitraum — einmal statt je Orden
        const k = b.klammer && b.meso ? klammernOf(plan).find((x) => x.meso === b.meso) : undefined;
        const head = k && k.parts[0].id === b.id ? k : undefined;
        const flags = flagsOf(b, sections);
        return (
          <Fragment key={b.id}>
            {head && (
              <button className={`sc-group kl-${head.kind}`} onClick={() => onKlammer?.(head)} aria-label={`Zeichen ${klammerName(head.kind)} bearbeiten`}>
                <KlammerIcon id={head.kind} size={15} /><span>{klammerName(head.kind)}</span>
                {head.kcal && <Sign kind={head.kcal} />}
                {head.parts[0].pin?.klammer && <Sign kind="pin" />}
                <span className="block-dates">{fmtDate(head.start)} – {fmtDate(head.end)}</span>
              </button>
            )}
            <div className={`stack-card ${now ? "now" : ""} ${past ? "past" : ""} ${k ? "in-kl" : ""}`} style={{ ["--c" as string]: goalColor(b.focusId) }}>
              <OrderMark id={b.focusId} />
              <div className="sc-text">
                {(b.label || (!k && b.kcal) || flags.length > 0) && (
                  <div className="sc-phase row">{b.label}{!k && b.kcal && <Sign kind={b.kcal} />}<FlagSign flags={flags} /></div>
                )}
                <div className="sc-order">
                  <button className="sc-name" onClick={() => onView(b)}>{focusName(b.focusId)}</button>
                  {now && <StatusIcon kind="läuft" />}
                  {b.pin?.focus && <Sign kind="pin" />}
                  {t && <button className="sc-ico test" onClick={() => setTestView(t)} aria-label={`Testwoche ${fmtDate(t.start)}`} title={`Testwoche ab ${fmtDate(t.start)}`}><OrderMark id="test" /></button>}
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
          </Fragment>
        );
      })}
      {later > 0 && <button className="btn ghost small" onClick={() => setAll((x) => !x)} aria-expanded={all}>{all ? "Weniger" : `Später · ${later} Orden`}</button>}
    </div>
  );
}

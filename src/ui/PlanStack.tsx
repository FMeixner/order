/* Jahresplan als Stapel: Band als Überblick, darunter je Phase eine Karte mit − / + (wochenweise, alles danach rückt mit),
   Testwoche am Ende als Schalter, Orden mit Empfehlung und zwei Alternativen. Feinheiten hinter „Phase bearbeiten“. */
import { useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { blockFocus, blockWeeks, fmtDate, focusName, isTestBlock, newerFocus, refreeze } from "../engine/plan";
import { rankFor, type Aim, type DeficitWeights } from "../engine/sequence";
import { canShrink, isPast, mergeNext, nextOf, resizeBlock, setTestWeek, splitBlock, testAfter } from "../engine/stack";
import { uid } from "../store";
import type { Load, PlanBlock } from "../types";
import { OrderMark } from "./OrderIcon";

const LOADS: Load[] = ["low", "medium", "high"];
const LOAD_TXT: Record<Load, string> = { low: "Last niedrig", medium: "Last mittel", high: "Last hoch" };
/** Farbe je Hauptziel (Band und Kartenrand) */
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

export function PlanStack({ plan, today, aim, deficits, onChange, onView, onEdit, onPickAll }: {
  plan: PlanBlock[]; today: string; aim: Aim; deficits: DeficitWeights;
  onChange: (p: PlanBlock[]) => void; onView: (b: PlanBlock) => void; onEdit: (b: PlanBlock) => void; onPickAll: (b: PlanBlock) => void;
}) {
  const [open, setOpen] = useState<{ id: string; what: "orden" | "mehr" } | null>(null);
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const total = sorted.reduce((s, b) => s + blockWeeks(b), 0);
  const first = sorted[0]?.start, last = sorted[sorted.length - 1]?.end;
  const span = first && last ? Math.max(1, (new Date(`${last}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / 864e5 + 1) : 1;
  const nowPct = first ? Math.min(100, Math.max(0, ((new Date(`${today}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / 864e5 / span) * 100)) : 0;
  const toggle = (id: string, what: "orden" | "mehr") => setOpen((o) => (o?.id === id && o.what === what ? null : { id, what }));

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
          <div className="muted small">{fmtDate(first!)} – {fmtDate(last!)} · {total} Wochen · {((n) => (n === 1 ? "1 Testwoche" : `${n} Testwochen`))(sorted.filter(isTestBlock).length)}</div>
        </div>
      )}

      {sorted.map((b) => {
        if (isTestBlock(b)) return (
          <div key={b.id} className={`stack-test ${isPast(b, today) ? "past" : ""}`}>
            <OrderMark id="test" />
            <span><strong>Testwoche</strong> <span className="muted small">· {fmtDate(b.start)} – {fmtDate(b.end)} · fünf Cups</span></span>
          </div>
        );
        const past = isPast(b, today), now = b.start <= today && today <= b.end, future = b.start > today;
        const t = testAfter(sorted, b);
        const ranked = future && open?.id === b.id && open.what === "orden" ? rankFor(plan, b.id, aim, deficits) : [];
        const top = future ? rankFor(plan, b.id, aim, deficits)[0]?.f.id : undefined;
        const nx = nextOf(sorted, b);
        return (
          <div key={b.id} className={`stack-card ${now ? "now" : ""} ${past ? "past" : ""}`} style={{ ["--c" as string]: goalColor(b.focusId) }}>
            <OrderMark id={b.focusId} />
            <div className="sc-top">
              <div className="sc-title">
                <button className="sc-name" onClick={() => (future ? toggle(b.id, "orden") : onView(b))} aria-expanded={open?.id === b.id && open.what === "orden"}>
                  {focusName(b.focusId)}
                </button>
                {now && <span className="tag teal">jetzt</span>}
                {future && top === b.focusId && <span className="tag rec">Empfehlung</span>}
                <div className="block-dates">{fmtDate(b.start)} – {fmtDate(t?.end ?? b.end)}</div>
                {b.label && <div className="muted small">{b.label}</div>}
              </div>
              {!past && (
                <div className="sc-step">
                  <button className="btn ghost small" disabled={!canShrink(b, today)} onClick={() => onChange(resizeBlock(plan, b.id, -1, today))} aria-label="Eine Woche kürzer">−</button>
                  <span className="sc-weeks">{blockWeeks(b) + (t ? 1 : 0)} Wo.</span>
                  <button className="btn ghost small" onClick={() => onChange(resizeBlock(plan, b.id, 1, today))} aria-label="Eine Woche länger">+</button>
                </div>
              )}
            </div>
            <div className="sc-meta">
              <button className="pill" disabled={past || now} onClick={() => onChange(plan.map((x) => (x.id === b.id ? { ...x, load: LOADS[(LOADS.indexOf(x.load) + 1) % 3] } : x)))}>{LOAD_TXT[b.load]}</button>
              {!past && (
                <button className={`pill ${t ? "on-amber" : ""}`} aria-pressed={!!t} disabled={!t && blockWeeks(b) < 3}
                  onClick={() => onChange(setTestWeek(plan, b.id, !t, uid("b")))}>{t ? "Testwoche am Ende" : "ohne Test"}</button>
              )}
              <button className="pill" aria-expanded={open?.id === b.id && open.what === "mehr"} onClick={() => toggle(b.id, "mehr")} aria-label="Mehr">⋯</button>
            </div>
            {ranked.length > 0 && (
              <div className="sc-alts">
                {ranked.slice(0, 3).map((r, i) => (
                  <button key={r.f.id} className={`sc-alt ${r.f.id === b.focusId ? "on" : ""}`} onClick={() => { onChange(plan.map((x) => (x.id === b.id ? { ...x, focusId: r.f.id } : x))); setOpen(null); }}>
                    <span><strong>{focusName(r.f.id)}</strong>{i === 0 && <span className="tag rec">Empfehlung</span>}</span>
                    <span className="muted small">{r.f.tagline}{r.reasons.length ? ` · ${r.reasons.slice(0, 2).join(", ")}` : ""}</span>
                  </button>
                ))}
                <button className="sc-alt muted" onClick={() => { onPickAll(b); setOpen(null); }}>Alle Orden …</button>
              </div>
            )}
            {open?.id === b.id && open.what === "mehr" && (
              <div className="sc-more">
                {blockFocus(b) && <button className="btn ghost small" onClick={() => onView(b)}>Details</button>}
                <button className="btn ghost small" onClick={() => onEdit(b)}>Phase bearbeiten</button>
                {!past && blockWeeks(b) >= 2 && <button className="btn ghost small" onClick={() => { onChange(splitBlock(plan, b.id, uid("b"), today)); setOpen(null); }}>Teilen</button>}
                {!past && nx && nx.start > today && <button className="btn ghost small" onClick={() => { onChange(mergeNext(plan, b.id, today)); setOpen(null); }}>Mit {focusName(nx.focusId)} verbinden</button>}
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

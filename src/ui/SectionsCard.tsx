import { useState } from "react";
/* Lebensabschnitte (Name frei, − / + Wochen, Alltagslast) und Richtung des Jahres — Bausteine für den
   Jahres-Assistenten und das Onboarding. Geplant wird über planYear (engine/klammer.ts). */
import { AXES, type AxisId } from "../engine/balance";
import type { AimPrio } from "../engine/klammer";
import { fmtDate } from "../engine/plan";
import { addSection, removeSection, resizeSection, sectionWeeks, semesterTemplate } from "../engine/sections";
import type { Aim, DeficitWeights } from "../engine/sequence";
import type { AppState, Load, Section } from "../types";
import { Seg } from "./common";

const LOADS: { value: Load; label: string }[] = [{ value: "low", label: "niedrig" }, { value: "medium", label: "mittel" }, { value: "high", label: "hoch" }];

export const yearAimOf = (state: AppState, deficits: DeficitWeights): Aim => (state.yearAim as Aim | undefined) ?? (deficits.length ? "deficits" : "allround");

/** Richtung des Jahres als Auswahl (auch im Onboarding) */
export function AimPicker({ value, deficits, onChange }: { value: Aim; deficits: DeficitWeights; onChange: (a: Aim) => void }) {
  const opts: { value: Aim; label: string }[] = [{ value: "allround", label: "Allround" }, ...(deficits.length ? [{ value: "deficits" as Aim, label: "Defizite zuerst" }] : []), ...AXES.map((a) => ({ value: a.id as Aim, label: a.name }))];
  return (
    <div className="chips" role="radiogroup" aria-label="Richtung des Jahres">
      {opts.map((o) => <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

/** Mehrere Ziele mit Priorität (1.3): Antippen vergibt die nächste Nummer (1, 2, 3), noch einmal antippen nimmt das Ziel
    heraus und rückt die übrigen auf. Ohne Ziel gilt der Modus: Allround oder Defizite zuerst. */
export function AimsPicker({ aims, mode, deficits, onChange }: { aims: AimPrio[]; mode: "allround" | "deficits"; deficits: DeficitWeights; onChange: (aims: AimPrio[], mode: "allround" | "deficits") => void }) {
  const toggle = (id: AxisId) => {
    const has = aims.find((a) => a.aim === id);
    const rest = aims.filter((a) => a.aim !== id).sort((a, b) => a.prio - b.prio).map((a, i) => ({ ...a, prio: (i + 1) as 1 | 2 | 3 }));
    if (has) onChange(rest, mode);
    else if (aims.length < 3) onChange([...rest, { aim: id, prio: (rest.length + 1) as 1 | 2 | 3 }], mode);
  };
  return (
    <div className="stack">
      <div className="chips" role="radiogroup" aria-label="Modus ohne Ziel">
        <button role="radio" aria-checked={!aims.length && mode === "allround"} className={!aims.length && mode === "allround" ? "on" : ""} onClick={() => onChange([], "allround")}>Allround</button>
        {deficits.length > 0 && <button role="radio" aria-checked={!aims.length && mode === "deficits"} className={!aims.length && mode === "deficits" ? "on" : ""} onClick={() => onChange([], "deficits")}>Defizite zuerst</button>}
      </div>
      <div className="chips" role="group" aria-label="Ziele mit Priorität">
        {AXES.map((a) => {
          const p = aims.find((x) => x.aim === a.id)?.prio;
          return <button key={a.id} role="checkbox" aria-checked={!!p} aria-label={p ? `${a.name}, Priorität ${p}` : a.name} className={p ? "on" : ""} onClick={() => toggle(a.id)} disabled={!p && aims.length >= 3}>{p && <span className="prio">{p}</span>}{a.name}</button>;
        })}
      </div>
    </div>
  );
}

/** Abschnitte bearbeiten (Liste mit Name, Wochen, Last) */
export function SectionList({ sections, onChange, start, compact }: { sections: Section[]; onChange: (s: Section[]) => void; start: string; compact?: boolean }) {
  // Kompakt (Jahr planen): eine Zeile je Abschnitt, Antippen öffnet die Bearbeitung
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...sections].sort((a, b) => a.start.localeCompare(b.start));
  const total = sorted.reduce((s, x) => s + sectionWeeks(x), 0);
  return (
    <div className="stack sec-list">
      {sorted.map((s) => compact && open !== s.id ? (
        <button key={s.id} className={`sec-row sec-line load-${s.load}`} onClick={() => setOpen(s.id)} aria-label={`${s.name} bearbeiten`}>
          <span className="sec-line-name">{s.name}</span>
          <span className="block-dates">{fmtDate(s.start)} – {fmtDate(s.end)}</span>
          <span className="sec-line-meta">{sectionWeeks(s)} Wo. · {LOADS.find((l) => l.value === s.load)?.label}</span>
        </button>
      ) : (
        <div key={s.id} className={`sec-row load-${s.load}`}>
          <div className="sec-top">
            <input type="text" value={s.name} aria-label="Name des Abschnitts" onChange={(e) => onChange(sections.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} />
            {sections.length > 1 && <button className="pen-btn" onClick={() => onChange(removeSection(sections, s.id))} aria-label={`${s.name} entfernen`}>✕</button>}
          </div>
          <span className="block-dates">{fmtDate(s.start)} – {fmtDate(s.end)}</span>
          <div className="sec-bottom">
            <Seg value={s.load} options={LOADS} onChange={(load) => onChange(sections.map((x) => (x.id === s.id ? { ...x, load } : x)))} />
            <div className="sc-step">
              <button className="btn ghost small" disabled={sectionWeeks(s) <= 1} onClick={() => onChange(resizeSection(sections, s.id, -1))} aria-label={`${s.name}: eine Woche kürzer`}>−</button>
              <span className="sc-weeks">{sectionWeeks(s)} Wo.</span>
              <button className="btn ghost small" onClick={() => onChange(resizeSection(sections, s.id, 1))} aria-label={`${s.name}: eine Woche länger`}>+</button>
            </div>
          </div>
        </div>
      ))}
      <div className="row between wrap">
        <span className={`muted small ${total > 53 ? "warn" : ""}`}>{total} Wochen{total < 52 ? ` · noch ${52 - total} frei` : ""}</span>
        <div className="row wrap">
          <button className="btn ghost small" onClick={() => onChange(addSection(sections, start))}>+ Abschnitt</button>
          <button className="btn ghost small" onClick={() => { if (!sections.length || confirm("Abschnitte durch die Vorlage Semester-Rhythmus ersetzen?")) onChange(semesterTemplate(sorted[0]?.start ?? start)); }}>Vorlage Semester-Rhythmus</button>
        </div>
      </div>
    </div>
  );
}

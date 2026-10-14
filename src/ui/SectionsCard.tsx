/* Lebensabschnitte im Plan: Name frei, − / + Wochen, Alltagslast; dazu Richtung des Jahres und Testwochen.
   „Künftige Phasen neu vorschlagen“ baut die Phasen ab heute aus den Abschnitten; Laufendes bleibt. */
import { AXES } from "../engine/balance";
import { fmtDate } from "../engine/plan";
import { addSection, proposePhases, removeSection, resizeSection, sectionsFromPlan, sectionWeeks, semesterTemplate } from "../engine/sections";
import type { Aim, DeficitWeights } from "../engine/sequence";
import type { AppState, Load, Section } from "../types";
import { Collapse, Seg } from "./common";
import { unpinBeasts } from "./session/items";

type Update = (fn: (s: AppState) => AppState) => void;
const LOADS: { value: Load; label: string }[] = [{ value: "low", label: "niedrig" }, { value: "medium", label: "mittel" }, { value: "high", label: "hoch" }];
const POLICY: { value: "each" | "twice" | "none"; label: string }[] = [{ value: "each", label: "nach jeder Phase" }, { value: "twice", label: "zweimal im Jahr" }, { value: "none", label: "keine" }];

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

/** Abschnitte bearbeiten (Liste mit Name, Wochen, Last) */
export function SectionList({ sections, onChange, start }: { sections: Section[]; onChange: (s: Section[]) => void; start: string }) {
  const sorted = [...sections].sort((a, b) => a.start.localeCompare(b.start));
  const total = sorted.reduce((s, x) => s + sectionWeeks(x), 0);
  return (
    <div className="stack sec-list">
      {sorted.map((s) => (
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

export function SectionsCard({ state, update, today, deficits }: { state: AppState; update: Update; today: string; deficits: DeficitWeights }) {
  const sections = state.sections ?? sectionsFromPlan(state.plan);
  const aim = yearAimOf(state, deficits);
  const policy = state.testPolicy ?? "none";
  const set = (s: Section[]) => update((st) => ({ ...st, sections: s, sectionsChanged: true }));
  const propose = () => {
    if (!confirm("Künftige Phasen aus den Abschnitten neu vorschlagen? Laufende und vergangene Phasen bleiben, alles danach wird ersetzt.")) return;
    update((st) => unpinBeasts({ ...st, sections, sectionsChanged: false, plan: proposePhases(st.plan, sections, today, aim, deficits, policy) }, (s) => s.date >= today));
  };
  return (
    <Collapse title="Lebensabschnitte" meta={`${sections.length} · ${AXES.find((a) => a.id === aim)?.name ?? (aim === "deficits" ? "Defizite zuerst" : "Allround")}`} open={state.sectionsChanged || undefined}>
      <div className="stack">
        <p className="muted small">Beschreibe dein Jahr: Abschnitte mit eigenem Namen und Alltagslast. Daraus schlägt die App Phasen und Orden vor; kurze Abschnitte gehen in der Nachbarphase auf.</p>
        <SectionList sections={sections} onChange={set} start={today} />
        <div className="field-label">Richtung des Jahres</div>
        <AimPicker value={aim} deficits={deficits} onChange={(a) => update((st) => ({ ...st, yearAim: a, sectionsChanged: true }))} />
        <div className="field-label">Testwochen</div>
        <Seg value={policy} options={POLICY} onChange={(testPolicy) => update((st) => ({ ...st, testPolicy, sectionsChanged: true }))} />
        <button className={`btn ${state.sectionsChanged ? "primary" : "ghost"}`} onClick={propose}>Künftige Phasen neu vorschlagen</button>
        {state.sectionsChanged && <p className="muted small">Geändert: Die Phasen folgen den Abschnitten erst, wenn du neu vorschlagen lässt.</p>}
      </div>
    </Collapse>
  );
}

/* Onboarding „Dein Jahr“: Start und Abschnitte → Richtung → Testwochen → fertiger Stapel zum Feinschliff.
   Die App schlägt Phasen und Orden aus den Abschnitten vor; wer lieber selbst plant, legt Phasen direkt an. */
import { useState } from "react";
import { AXES } from "../engine/balance";
import { addDays, mondayOf, trainingDays } from "../engine/plan";
import { proposePhases } from "../engine/sections";
import type { Aim } from "../engine/sequence";
import type { AppState, Section } from "../types";
import { Seg } from "./common";
import { PlanList } from "./PlanEditor";
import { SectionList } from "./SectionsCard";

type Update = (fn: (s: AppState) => AppState) => void;
type Dir = "allround" | "focus" | "unsure";
const DIRS: { value: Dir; label: string }[] = [{ value: "allround", label: "Allround" }, { value: "focus", label: "Schwerpunkt" }, { value: "unsure", label: "Weiß nicht" }];
const POLICY: { value: "each" | "twice" | "none"; label: string }[] = [{ value: "each", label: "nach jeder Phase" }, { value: "twice", label: "zweimal im Jahr" }, { value: "none", label: "keine" }];

const days = (a: string, b: string) => Math.round((new Date(`${b}T12:00`).getTime() - new Date(`${a}T12:00`).getTime()) / 864e5);

export function YearSetup({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const sections = state.sections ?? [];
  const sorted = [...sections].sort((a, b) => a.start.localeCompare(b.start));
  const start = sorted[0]?.start ?? mondayOf(today);
  const aim = (state.yearAim as Aim | undefined) ?? "allround";
  const [dir, setDir] = useState<Dir>(aim === "allround" ? (state.yearAim ? "allround" : "unsure") : "focus");
  const [manual, setManual] = useState(false);
  const policy = state.testPolicy ?? "each";
  const proposed = state.plan.length > 0;

  const setSections = (s: Section[]) => update((st) => ({ ...st, sections: s, sectionsChanged: st.plan.length > 0 }));
  const setStart = (v: string) => {
    if (!v) return;
    const d = days(start, mondayOf(v));
    if (!sections.length || !d) return;
    setSections(sections.map((x) => ({ ...x, start: addDays(x.start, d), end: addDays(x.end, d) })));
  };
  const setAim = (a: Aim) => update((st) => ({ ...st, yearAim: a, sectionsChanged: st.plan.length > 0 }));
  const propose = () => update((st) => ({ ...st, sections, yearAim: aim, testPolicy: policy, sectionsChanged: false, plan: proposePhases([], sections, today, aim, [], policy) }));

  return (
    <div className="stack">
      <h2>Dein Jahr</h2>
      <p className="muted">Beschreibe dein Jahr in Abschnitten, so wie dein Alltag läuft: Semester, Projektzeiten, Ferien, Saison. Die App schlägt daraus Phasen und Orden vor. Alles lässt sich danach im Plan ändern.</p>

      <div className="field-label">1 · Abschnitte</div>
      {sections.length > 0 && (
        <label className="field">
          <span className="field-label">Start</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
      )}
      <SectionList sections={sections} onChange={setSections} start={today} />

      <div className="field-label">2 · Richtung des Jahres</div>
      <Seg value={dir} options={DIRS} onChange={(d) => { setDir(d); if (d !== "focus") setAim("allround"); else if (aim === "allround") setAim(AXES[0].id as Aim); }} />
      {dir === "focus" && (
        <div className="chips" role="radiogroup" aria-label="Schwerpunkt">
          {AXES.map((a) => <button key={a.id} role="radio" aria-checked={aim === a.id} className={aim === a.id ? "on" : ""} onClick={() => setAim(a.id as Aim)}>{a.name}</button>)}
        </div>
      )}
      {dir === "unsure" && <p className="muted small">Dann Allround: alle Bereiche im Wechsel. Nach der ersten Testwoche weiß die App, was dir fehlt.</p>}

      <div className="field-label">3 · Testwochen</div>
      <Seg value={policy} options={POLICY} onChange={(testPolicy) => update((st) => ({ ...st, testPolicy, sectionsChanged: st.plan.length > 0 }))} />
      <p className="muted small">Eine Testwoche ist die letzte Woche einer Phase: fünf Tests statt Training.</p>

      <button className={`btn ${!proposed || state.sectionsChanged ? "primary" : "ghost"}`} disabled={!sections.length} onClick={() => { if (!proposed || confirm("Phasen neu vorschlagen? Deine Änderungen im Plan gehen verloren.")) propose(); }}>
        {proposed ? "Neu vorschlagen" : "Vorschlag erstellen"}
      </button>
      {!sections.length && <p className="muted small">Leg zuerst einen Abschnitt an oder nimm die Vorlage.</p>}

      {(proposed || manual) && (
        <>
          <div className="field-label">Dein Plan</div>
          <p className="muted small">Fein abstimmen: − / + ändert die Länge, der Stift öffnet Ordenswahl, Teilen und Verbinden.</p>
          <PlanList plan={state.plan} profiles={state.equipment} days={trainingDays(state).length} user={state.user} today={today} aim={aim} onChange={(plan) => update((s) => ({ ...s, plan }))} />
        </>
      )}
      {!proposed && !manual && <button className="btn ghost small" onClick={() => setManual(true)}>Lieber Phasen selbst anlegen</button>}
    </div>
  );
}

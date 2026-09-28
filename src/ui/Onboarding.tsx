import { useRef, useState } from "react";
import { EQUIPMENT_PRESETS, migrate } from "../store";
import type { AppState } from "../types";
import { WEEKDAYS } from "../types";
import { Field } from "./common";
import { EquipmentEditor } from "./EquipmentEditor";
import { PlanList, WeekEditor } from "./PlanEditor";
import { AsymEditor, NormFields } from "./Setup";

type Update = (fn: (s: AppState) => AppState) => void;

const STEPS = ["Start", "Equipment", "Woche", "Jahr", "Fertig"];

export function Onboarding({ state, update, replace, today }: { state: AppState; update: Update; replace: (s: AppState) => void; today: string }) {
  const [step, setStep] = useState(0);
  const file = useRef<HTMLInputElement>(null);
  const days = WEEKDAYS.filter((d) => state.schedule[d]).length;
  const canNext = [
    true,
    state.equipment.length >= 1,
    days >= 3,
    state.plan.length >= 1 && state.plan.every((b) => b.focusId),
    true,
  ][step];

  return (
    <div className="onboarding">
      <div className="steps">{STEPS.map((s, i) => <span key={s} className={i === step ? "on" : i < step ? "done" : ""}>{s}</span>)}</div>

      {step === 0 && (
        <div className="stack">
          <h1>Order</h1>
          <p>Dein Trainingsjahr in Blöcken. Du legst fest, womit du trainierst, an welchen Tagen und welchem Orden du dich in welcher Phase anschließt. Den Rest rechnet die App: welche Übung heute passt, welches Gewicht als Nächstes kommt, wann eine Pause fällig ist.</p>
          <Field label="Wie heißt du?"><input type="text" value={state.user.name} onChange={(e) => update((s) => ({ ...s, user: { ...s.user, name: e.target.value } }))} /></Field>
          <NormFields user={state.user} onChange={(user) => update((s) => ({ ...s, user }))} />
          <details className="card">
            <summary>Asymmetrien angeben (optional)</summary>
            <AsymEditor user={state.user} onChange={(user) => update((s) => ({ ...s, user }))} />
          </details>
          <div className="card stack">
            <div className="small muted">Schon mal eingerichtet?</div>
            <div className="row wrap">
              <button className="btn ghost small" onClick={() => file.current?.click()}>Sicherung laden</button>
            </div>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { const s = migrate(JSON.parse(await f.text())); replace({ ...s, onboarded: true }); } catch { alert("Die Datei konnte nicht gelesen werden."); }
            }} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <h2>Womit trainierst du?</h2>
          <p className="muted">Lege mindestens ein Equipment-Profil an, zum Beispiel „Studio“ oder „Zuhause“. Trag die Hanteln ein, die du wirklich hast: Die App steigert nur auf Gewichte, die es bei dir gibt. Bereiche gehen auch, z. B. <code>2-24/2</code>.</p>
          {state.equipment.length === 0 && (
            <div className="stack">
              {EQUIPMENT_PRESETS.map((p) => <button key={p.label} className="btn" onClick={() => update((s) => ({ ...s, equipment: [...s.equipment, p.make()] }))}>+ {p.label}</button>)}
            </div>
          )}
          {state.equipment.length > 0 && <EquipmentEditor list={state.equipment} onChange={(equipment) => update((s) => ({ ...s, equipment }))} />}
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <h2>Deine Woche</h2>
          <p className="muted">An welchen Tagen trainierst du, und wo? Drei oder vier Tage sind der Standard. Einzelne Phasen können später einen eigenen Wochenplan bekommen.</p>
          <WeekEditor schedule={state.schedule} profiles={state.equipment} onChange={(schedule) => update((s) => ({ ...s, schedule }))} />
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <h2>Dein Jahr</h2>
          <p className="muted">Teile dein Jahr in Phasen, so wie dein Alltag läuft: Semester, Projektzeiten, Urlaub, Saison. Gib für jede Phase an, wie viel los ist, und wähle einen Orden. Die App zeigt, welche Orden zur Phase passen.</p>
          <PlanList plan={state.plan} profiles={state.equipment} today={today} onChange={(plan) => update((s) => ({ ...s, plan }))} />
        </div>
      )}

      {step === 4 && (
        <div className="stack">
          <h2>Bereit</h2>
          <p>Unter <strong>Heute</strong> findest du die Einheit des Tages. Trag nach jedem Satz Wiederholungen und Gewicht ein und gib nach der Übung kurz Feedback. Daraus berechnet die App das nächste Gewicht.</p>
          <p className="muted">Deine Daten bleiben auf diesem Gerät. Unter Setup kannst du sie sichern.</p>
        </div>
      )}

      <div className="sticky-actions">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Zurück</button>}
        {step < STEPS.length - 1
          ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Weiter</button>
          : <button className="btn primary" onClick={() => update((s) => ({ ...s, onboarded: true }))}>Los geht's</button>}
      </div>
    </div>
  );
}

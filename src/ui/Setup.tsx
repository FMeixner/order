import { useRef, useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { blockAt, rolesFor, trainingDays } from "../engine/plan";
import { exportState, migrate } from "../store";
import type { AppState, UserProfile } from "../types";
import { Check, Collapse, Field, Seg } from "./common";
import { EquipmentEditor } from "./EquipmentEditor";
import { WeekEditor } from "./PlanEditor";

type Update = (fn: (s: AppState) => AppState) => void;

const ASYM: { k: keyof UserProfile["asym"]; l: string }[] = [
  { k: "hip", l: "Hüfte weniger beweglich" },
  { k: "neck", l: "Nacken seitlich verkürzt" },
  { k: "shoulder_ir", l: "Schulter-Innenrotation eingeschränkt" },
  { k: "shoulder_er", l: "Schulter-Außenrotation schwächer" },
];

export function AsymEditor({ user, onChange }: { user: UserProfile; onChange: (u: UserProfile) => void }) {
  return (
    <div className="stack">
      <p className="muted small">Die schwächere Seite bekommt im Warm-up und Cool-down mehr Zeit oder einen Satz mehr. Wenn du nichts weißt: alles auf „keine“ lassen.</p>
      {ASYM.map(({ k, l }) => (
        <Field key={k} label={l}>
          <Seg value={(user.asym[k] ?? "-") as "L" | "R" | "-"} options={[{ value: "-", label: "keine" }, { value: "L", label: "links" }, { value: "R", label: "rechts" }]}
            onChange={(v) => onChange({ ...user, asym: { ...user.asym, [k]: v === "-" ? null : v } })} />
        </Field>
      ))}
    </div>
  );
}

export function Setup({ state, update, replace, today, restartOnboarding }: { state: AppState; update: Update; replace: (s: AppState) => void; today: string; restartOnboarding: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const block = blockAt(state.plan, today);
  const focus = block ? FOCUS_BY_ID[block.focusId] : null;
  const roles = block ? rolesFor(state, block) : [];
  const days = block ? trainingDays(state, block) : [];
  const move = (i: number, d: number) => {
    if (!block) return;
    const r = [...roles];
    const j = i + d;
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
    update((st) => ({ ...st, roleOrder: { ...st.roleOrder, [block.id]: r } }));
  };
  const swapRole = (i: number, role: string) => {
    if (!block) return;
    const r = [...roles];
    r[i] = role;
    update((st) => ({ ...st, roleOrder: { ...st.roleOrder, [block.id]: r } }));
  };
  return (
    <div className="stack">
      <Collapse title="Profil" meta={state.user.name || "ohne Namen"} defaultOpen>
        <Field label="Name"><input type="text" value={state.user.name} onChange={(e) => update((st) => ({ ...st, user: { ...st.user, name: e.target.value } }))} /></Field>
        <Check checked={state.user.doppelmesser} onChange={(v) => update((st) => ({ ...st, user: { ...st.user, doppelmesser: v } }))} label="Doppelmesser-Modul (Schwerttraining) einschalten" />
      </Collapse>
      <Collapse title="Equipment-Profile" meta={`${state.equipment.length}`}>
        <EquipmentEditor list={state.equipment} onChange={(equipment) => update((st) => ({ ...st, equipment }))} />
      </Collapse>
      <Collapse title="Wochenplan" meta={`${trainingDays(state).length} Tage`}>
        <WeekEditor schedule={state.schedule} profiles={state.equipment} onChange={(schedule) => update((st) => ({ ...st, schedule }))} />
      </Collapse>
      {block && focus && (
        <Collapse title="Einheiten auf Tage verteilen" meta={focus.name}>
          <p className="muted small">Gilt für die aktuelle Phase. Mit den Pfeilen tauschst du die Reihenfolge, im Menü wählst du eine andere Einheit.</p>
          {roles.map((r, i) => (
            <div key={i} className="week-row">
              <span className="day">{days[i]}</span>
              <select value={r} onChange={(e) => swapRole(i, e.target.value)}>
                {Object.entries(focus.roles).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
              <button className="btn ghost small" onClick={() => move(i, -1)} aria-label="nach oben">↑</button>
              <button className="btn ghost small" onClick={() => move(i, 1)} aria-label="nach unten">↓</button>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => update((st) => { const ro = { ...st.roleOrder }; delete ro[block.id]; return { ...st, roleOrder: ro }; })}>Standard wiederherstellen</button>
        </Collapse>
      )}
      <Collapse title="Asymmetrien" meta="optional">
        <AsymEditor user={state.user} onChange={(user) => update((st) => ({ ...st, user }))} />
      </Collapse>
      <Collapse title="Sichern und Wiederherstellen">
        <p className="muted small">Alle Daten liegen nur auf diesem Gerät, im Browser. Sichere regelmäßig, vor allem vor einem Gerätewechsel.</p>
        <div className="row wrap">
          <button className="btn" onClick={() => exportState(state)}>Sichern (.json)</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Sicherung laden</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { replace(migrate(JSON.parse(await f.text()))); setMsg("Sicherung geladen."); } catch { setMsg("Die Datei konnte nicht gelesen werden."); }
          }} />
        </div>
        {msg && <div className="note">{msg}</div>}
      </Collapse>
      <Collapse title="Neu einrichten">
        <p className="muted small">Startet die Einrichtung erneut. Deine Daten bleiben erhalten, bis du sie überschreibst.</p>
        <button className="btn ghost" onClick={restartOnboarding}>Einrichtung öffnen</button>
      </Collapse>
      <p className="muted small center">Order {__APP_VERSION__}{__REPO_URL__ && <> · <a href={__REPO_URL__} target="_blank" rel="noreferrer">Quellcode</a></>}</p>
    </div>
  );
}

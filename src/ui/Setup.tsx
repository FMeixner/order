import { useRef, useState, useEffect } from "react";
import { FOCI, SKILLS } from "../data";
import { blockAt, rolesFor, trainingDays, weekInBlock } from "../engine/plan";
import { focusFor } from "../engine/weekplan";
import { exportState, migrate } from "../store";
import { AUTO_FILE, backupFile, canPickFile, chooseBackupFile, forgetBackupFile } from "../backup";
import type { AppState, UserProfile } from "../types";
import { Collapse, Field, Seg } from "./common";
import { NarrativeSettings } from "./Raven";
import { EquipmentEditor } from "./EquipmentEditor";
import { WeekEditor } from "./PlanEditor";

type Update = (fn: (s: AppState) => AppState) => void;

export function SkillEditor({ user, onChange }: { user: UserProfile; onChange: (u: UserProfile) => void }) {
  const have = new Set(user.skills ?? []);
  const toggle = (id: string, on: boolean) => {
    const next = new Set(have);
    if (on) next.add(id); else next.delete(id);
    onChange({ ...user, skills: SKILLS.skills.map((x) => x.id).filter((x) => next.has(x)) });
  };
  return (
    <div className="stack">
      <p className="muted small">Hake ab, was du heute sauber schaffst. Übungen mit fehlendem Skill ersetzt die App durch leichtere Varianten, Bestien mit fehlendem Skill kommen nicht dran. Übungsleitern, etwa zum Pistol Squat, bleiben als Lernweg drin und starten mit abgehaktem Skill weiter oben. Jederzeit änderbar.</p>
      {SKILLS.groups.map((g) => (
        <div key={g.id} className="stack skill-group">
          <div className="block-label teal">{g.name}</div>
          {SKILLS.skills.filter((x) => x.group === g.id).map((x) => (
            <label key={x.id} className="check skill-row">
              <input type="checkbox" checked={have.has(x.id)} onChange={(e) => toggle(x.id, e.target.checked)} />
              <span><strong>{x.name}</strong><span className="muted small"> · {x.test}</span></span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export const LEVELS = [
  { value: "einsteiger", label: "Einsteiger", hint: "unter einem Jahr regelmäßig", range: [6, 10] },
  { value: "fortgeschritten", label: "Fortgeschritten", hint: "1–3 Jahre", range: [10, 16] },
  { value: "erfahren", label: "Erfahren", hint: "über 3 Jahre", range: [12, 20] },
] as const;

/** Trainingserfahrung und eigener Richtwert für Sätze pro Muskel */
export function LevelFields({ user, onChange, withRange }: { user: UserProfile; onChange: (u: UserProfile) => void; withRange?: boolean }) {
  const lv = LEVELS.find((l) => l.value === user.level);
  return (
    <div className="stack">
      <Field label="Trainingserfahrung" hint={lv ? `${lv.hint}. Einsteiger sehen weniger Fachliches, etwa keine Normvergleiche.` : "Steuert Richtwerte und wie viel Fachliches die App zeigt."}>
        <Seg value={(user.level ?? "fortgeschritten") as NonNullable<UserProfile["level"]>} options={LEVELS.map((l) => ({ value: l.value, label: l.label }))} onChange={(level) => onChange({ ...user, level })} />
      </Field>
      {withRange && (
        <Field label="Richtwert Sätze pro Muskel und Woche" hint={`Leer lassen für den Wert nach Erfahrung (${(lv ?? LEVELS[1]).range.join("–")}).`}>
          <div className="row">
            <input type="number" inputMode="numeric" className="reps-in" placeholder={String((lv ?? LEVELS[1]).range[0])} value={user.volumeRange?.[0] ?? ""}
              onChange={(e) => { const a = parseInt(e.target.value); onChange({ ...user, volumeRange: isNaN(a) ? null : [a, user.volumeRange?.[1] ?? Math.max(a, (lv ?? LEVELS[1]).range[1])] }); }} aria-label="Richtwert von" />
            <span className="muted">bis</span>
            <input type="number" inputMode="numeric" className="reps-in" placeholder={String((lv ?? LEVELS[1]).range[1])} value={user.volumeRange?.[1] ?? ""}
              onChange={(e) => { const b = parseInt(e.target.value); onChange({ ...user, volumeRange: isNaN(b) ? null : [user.volumeRange?.[0] ?? Math.min(b, (lv ?? LEVELS[1]).range[0]), b] }); }} aria-label="Richtwert bis" />
          </div>
        </Field>
      )}
    </div>
  );
}

/** Geburtsjahr und Geschlecht: nur für die Einordnung der Testwoche. */
export function NormFields({ user, onChange }: { user: UserProfile; onChange: (u: UserProfile) => void }) {
  return (
    <div className="row two">
      <Field label="Geburtsjahr" hint="Für den Vergleich mit Altersnormen">
        <input type="number" inputMode="numeric" placeholder="z. B. 1990" value={user.birthYear ?? ""}
          onChange={(e) => { const v = parseInt(e.target.value); onChange({ ...user, birthYear: isNaN(v) ? null : v }); }} />
      </Field>
      <Field label="Geschlecht" hint="Normen gibt es getrennt">
        <Seg value={(user.sex ?? "-") as "m" | "w" | "-"} options={[{ value: "-", label: "–" }, { value: "w", label: "weiblich" }, { value: "m", label: "männlich" }]}
          onChange={(v) => onChange({ ...user, sex: v === "-" ? null : v })} />
      </Field>
    </div>
  );
}

export function Setup({ state, update, replace, today, restartOnboarding }: { state: AppState; update: Update; replace: (s: AppState) => void; today: string; restartOnboarding: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const block = blockAt(state.plan, today);
  const focus = block ? focusFor(state, block, weekInBlock(block, today)) : null;
  const roles = block && focus ? rolesFor(state, block, focus) : [];
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
        <LevelFields user={state.user} onChange={(user) => update((st) => ({ ...st, user }))} withRange />
        <NormFields user={state.user} onChange={(user) => update((st) => ({ ...st, user }))} />
      </Collapse>
      <Collapse title="Darstellung" meta={{ auto: "automatisch", light: "hell", dark: "dunkel" }[state.theme ?? "auto"]}>
        <Seg value={state.theme ?? "auto"} options={[{ value: "auto", label: "automatisch" }, { value: "light", label: "hell" }, { value: "dark", label: "dunkel" }]} onChange={(theme) => update((st) => ({ ...st, theme }))} />
        <p className="muted small">Hell ist draußen in der Sonne besser lesbar. Automatisch folgt der Einstellung des Handys.</p>
      </Collapse>
      <Collapse title="Allrounder oder Spezialist" meta={state.user.focusMode === "special" ? "Spezialist" : "Allrounder"}>
        <Seg value={state.user.focusMode ?? "allround"} options={[{ value: "allround", label: "Allrounder" }, { value: "special", label: "Spezialist" }]} onChange={(focusMode) => update((st) => ({ ...st, user: { ...st.user, focusMode } }))} />
        <p className="muted small">{state.user.focusMode === "special"
          ? "Spezialist: Die Orden bekommen ihre volle Zeit, kein Schwerpunkt-Slot. Die Blockfolge bleibt, wie du sie planst."
          : "Allrounder: Nach jeder Testwoche bekommt die nächste Phase einen kleinen Schwerpunkt-Slot für deinen schwächsten Bereich (etwa 10–15 Min. pro Woche, zum Erhalten). Die Blockfolge schlägt schwache Bereiche zuerst vor. Du kannst beides je Phase im Plan ändern."}</p>
      </Collapse>
      <NarrativeSettings state={state} update={update} />
      <Collapse title="Können" meta={state.user.skills == null ? "kein Skillcheck" : `${state.user.skills.length} von ${SKILLS.skills.length}`}>
        {state.user.skills == null
          ? <div className="stack"><p className="muted small">Noch kein Skillcheck: Alle Übungen und Bestien sind offen, auch Muscle-Ups und Pistol Squats.</p><button className="btn" onClick={() => update((st) => ({ ...st, user: { ...st.user, skills: [] } }))}>Skillcheck machen</button></div>
          : <SkillEditor user={state.user} onChange={(user) => update((st) => ({ ...st, user }))} />}
      </Collapse>
      <SwapList state={state} update={update} />
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
      <Collapse title="Sichern und Wiederherstellen">
        <p className="muted small">Alle Daten liegen nur auf diesem Gerät, im Browser. Sichere regelmäßig, vor allem vor einem Gerätewechsel.</p>
        <div className="row wrap">
          <button className="btn" onClick={() => { exportState(state); update((st) => ({ ...st, lastBackup: new Date().toISOString().slice(0, 10) })); }}>Sichern (.json)</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Sicherung laden</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { replace(migrate(JSON.parse(await f.text()))); setMsg("Sicherung geladen."); } catch { setMsg("Die Datei konnte nicht gelesen werden."); }
          }} />
        </div>
        {msg && <div className="note">{msg}</div>}
        <AutoBackupFields state={state} update={update} />
      </Collapse>
      <Collapse title="Neu einrichten">
        <p className="muted small">Startet die Einrichtung erneut. Deine Daten bleiben erhalten, bis du sie überschreibst.</p>
        <button className="btn ghost" onClick={restartOnboarding}>Einrichtung öffnen</button>
      </Collapse>
      <p className="muted small center">Order {__APP_VERSION__}{__REPO_URL__ && <> · <a href={__REPO_URL__} target="_blank" rel="noreferrer">Quellcode</a></>}</p>
    </div>
  );
}

/** Automatische Sicherung: wie oft, und wenn der Browser es kann, in eine feste Datei */
function AutoBackupFields({ state, update }: { state: AppState; update: Update }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => { backupFile().then((h) => setFileName(h?.name ?? null)); }, []);
  const mode = state.autoBackup ?? "week";
  return (
    <div className="stack">
      <span className="field-label">Automatisch sichern</span>
      <Seg value={mode} options={[{ value: "off", label: "aus" }, { value: "week", label: "wöchentlich" }, { value: "session", label: "nach jeder Einheit" }]} onChange={(autoBackup) => update((st) => ({ ...st, autoBackup }))} />
      {canPickFile() ? (
        <div className="stack">
          {fileName
            ? <p className="muted small">Sicherungsdatei: <strong>{fileName}</strong>. Wird nach jeder abgeschlossenen Einheit überschrieben.</p>
            : <p className="muted small">Wähle einmal eine Datei, etwa in einem Cloud-Ordner. Die App überschreibt sie dann nach jeder abgeschlossenen Einheit, ganz ohne Downloads.</p>}
          <div className="row wrap">
            <button className="btn ghost small" onClick={async () => { const n = await chooseBackupFile(state); if (n) { setFileName(n); setInfo("Gesichert."); update((st) => ({ ...st, lastBackup: new Date().toISOString().slice(0, 10) })); } }}>{fileName ? "Andere Datei wählen" : "Datei wählen"}</button>
            {fileName && <button className="btn ghost small" onClick={async () => { await forgetBackupFile(); setFileName(null); }}>Datei vergessen</button>}
          </div>
        </div>
      ) : (
        <p className="muted small">Die Sicherung landet als <strong>{AUTO_FILE}</strong> im Download-Ordner. Überschreiben kann der Browser dort nicht, er hängt eine Nummer an. Zum Wiederherstellen die neueste Datei nehmen.</p>
      )}
      {info && <div className="note small">{info}</div>}
      <p className="muted small">Wiederherstellen nach dem Löschen der Browserdaten: Einrichtung › „Schon mal eingerichtet?“ › Sicherung laden, dann diese Datei wählen.</p>
    </div>
  );
}

const TIER_LABEL = { gym: "Studio", home: "Zuhause", reise: "Unterwegs" } as const;

/** Übersicht der eigenen Übungswahl, mit Zurücksetzen */
function SwapList({ state, update }: { state: AppState; update: Update }) {
  const entries = Object.entries(state.swaps ?? {});
  if (!entries.length) return null;
  const where = (slotId: string) => {
    for (const f of FOCI) for (const r of Object.values(f.roles)) {
      const hit = JSON.stringify(r.blocks).includes(`"id":"${slotId}"`);
      if (hit) return { focus: f.name, role: r.name, orig: findSlotName(r.blocks, slotId) };
    }
    return null;
  };
  return (
    <Collapse title="Getauschte Übungen" meta={`${entries.length}`}>
      <p className="muted small">Deine eigene Wahl statt der Übung aus dem Orden. Gilt je Stelle und je Ort (Studio, Zuhause, Unterwegs). Gewichte werden je Übung getrennt geführt.</p>
      <ul className="slot-list">
        {entries.map(([k, name]) => {
          const [slotId, tier] = k.split(":");
          const w = where(slotId);
          return (
            <li key={k} className="row between">
              <span>{w ? `${w.focus} · ${w.role}: ` : ""}{w?.orig ? <><s>{w.orig}</s> → </> : null}<strong>{name}</strong> <span className="muted">({TIER_LABEL[tier as keyof typeof TIER_LABEL] ?? tier})</span></span>
              <button className="btn ghost small" onClick={() => update((st) => { const sw = { ...st.swaps }; delete sw[k]; return { ...st, swaps: sw }; })}>Zurück</button>
            </li>
          );
        })}
      </ul>
    </Collapse>
  );
}

function findSlotName(x: unknown, id: string): string | null {
  if (Array.isArray(x)) { for (const y of x) { const r = findSlotName(y, id); if (r) return r; } return null; }
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (o.id === id && typeof o.name === "string") return o.name;
    for (const v of Object.values(o)) { const r = findSlotName(v, id); if (r) return r; }
  }
  return null;
}

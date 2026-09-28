import { useState } from "react";
import { FOCI, FOCUS_BY_ID } from "../data";
import { addDays, blockWeeks, fitScore, fmtDate, isoDate, mondayOf } from "../engine/plan";
import { uid } from "../store";
import type { EquipmentProfile, Focus, Load, PlanBlock, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Check, Field, Modal, Seg } from "./common";
import { FocusDetail } from "./FociBrowser";

export const LOAD_LABEL: Record<Load, string> = { high: "hoch", medium: "mittel", low: "niedrig" };
export const GOAL_LABEL: Record<string, string> = {
  hypertrophy: "Muskelaufbau", strength: "Kraft", power: "Sprungkraft", speed: "Schnelligkeit", conditioning: "Kondition",
  endurance: "Ausdauer", fatloss: "Fett verlieren", skill: "Skill", mobility: "Beweglichkeit", wellbeing: "Wohlbefinden", test: "Testen",
};

export function WeekEditor({ schedule, profiles, onChange, allowEmpty }: { schedule: Partial<Record<Weekday, string | null>>; profiles: EquipmentProfile[]; onChange: (s: Partial<Record<Weekday, string | null>>) => void; allowEmpty?: boolean }) {
  const count = WEEKDAYS.filter((d) => schedule[d]).length;
  return (
    <div className="stack">
      {WEEKDAYS.map((d) => (
        <div key={d} className="week-row">
          <span className="day">{d}</span>
          <select value={schedule[d] ?? ""} onChange={(e) => onChange({ ...schedule, [d]: e.target.value || null })}>
            <option value="">kein Training</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ))}
      <div className={`muted small ${!allowEmpty && count < 3 ? "warn" : ""}`}>
        {count === 0 && allowEmpty ? "Kein eigener Wochenplan: Es gilt der allgemeine." : `${count} Trainingstage. ${count < 3 ? "Die Orden brauchen mindestens 3." : count > 4 ? "Ab dem fünften Tag kommen optionale Einheiten dazu, falls der Fokus welche hat." : ""}`}
      </div>
    </div>
  );
}

export function FocusPicker({ load, travel, value, onPick }: { load: Load; travel: boolean; value?: string; onPick: (id: string) => void }) {
  const [detail, setDetail] = useState<Focus | null>(null);
  const ranked = [...FOCI].map((f) => ({ f, ...fitScore(f, load, travel) })).sort((a, b) => b.score - a.score);
  return (
    <div className="stack">
      {ranked.map(({ f, score, reasons }) => (
        <div key={f.id} className={`focus-card ${value === f.id ? "on" : ""} ${score < 0 ? "dim" : ""}`}>
          <button className="focus-main" onClick={() => onPick(f.id)}>
            <div className="focus-name">{f.name}{score >= 2 && <span className="tag teal">passt</span>}</div>
            <div className="focus-tag">{f.tagline}</div>
            <div className="focus-meta">{GOAL_LABEL[f.goals.primary]} · {f.weeks.min === f.weeks.max ? f.weeks.min : `${f.weeks.min}–${f.weeks.max}`} Wochen · {f.session_min} Min · {reasons.join(", ")}</div>
          </button>
          <button className="btn ghost small" onClick={() => setDetail(f)}>Details</button>
        </div>
      ))}
      {detail && <Modal title={detail.name} onClose={() => setDetail(null)} wide><FocusDetail f={detail} /></Modal>}
    </div>
  );
}

export function BlockForm({ block, profiles, onSave, onCancel, onDelete }: { block: PlanBlock; profiles: EquipmentProfile[]; onSave: (b: PlanBlock) => void; onCancel: () => void; onDelete?: () => void }) {
  const [b, setB] = useState<PlanBlock>(block);
  const [ownWeek, setOwnWeek] = useState(!!block.schedule && Object.values(block.schedule).some(Boolean));
  const f = FOCUS_BY_ID[b.focusId];
  const weeks = blockWeeks(b);
  const valid = b.start <= b.end && !!f;
  return (
    <div className="stack">
      <Field label="Name der Phase" hint="z. B. Vorlesungszeit, Urlaub, Projektphase">
        <input type="text" value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} />
      </Field>
      <div className="row two">
        <Field label="Beginn"><input type="date" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} /></Field>
        <Field label="Ende"><input type="date" value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} /></Field>
      </div>
      <Field label="Alltagslast in dieser Phase" hint="Hoch = wenig Energie und Zeit fürs Training übrig.">
        <Seg value={b.load} options={[{ value: "high", label: "hoch" }, { value: "medium", label: "mittel" }, { value: "low", label: "niedrig" }]} onChange={(load) => setB({ ...b, load })} />
      </Field>
      <Check checked={b.travel} onChange={(travel) => setB({ ...b, travel })} label="Viel unterwegs" />
      <Check checked={ownWeek} onChange={(v) => { setOwnWeek(v); if (!v) setB({ ...b, schedule: undefined }); }} label="Eigener Wochenplan für diese Phase" />
      {ownWeek && <WeekEditor schedule={b.schedule ?? {}} profiles={profiles} onChange={(schedule) => setB({ ...b, schedule })} allowEmpty />}
      <div className="label teal"><span className="bar" />Orden {f ? `: ${f.name}` : "wählen"} · {weeks} Wochen{f && (weeks < f.weeks.min || weeks > f.weeks.max) ? ` (empfohlen ${f.weeks.min}–${f.weeks.max})` : ""}</div>
      <FocusPicker load={b.load} travel={b.travel} value={b.focusId} onPick={(focusId) => setB({ ...b, focusId })} />
      <div className="sticky-actions">
        {onDelete && <button className="btn danger" onClick={onDelete}>Löschen</button>}
        <button className="btn ghost" onClick={onCancel}>Abbrechen</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave(b)}>Speichern</button>
      </div>
    </div>
  );
}

export function newBlock(plan: PlanBlock[]): PlanBlock {
  const last = [...plan].sort((a, c) => a.end.localeCompare(c.end)).pop();
  const start = last ? addDays(last.end, 1) : mondayOf(isoDate(new Date()));
  return { id: uid("b"), focusId: "", label: "", start, end: addDays(start, 7 * 10 - 1), load: "medium", travel: false };
}

export function PlanList({ plan, profiles, onChange, today }: { plan: PlanBlock[]; profiles: EquipmentProfile[]; onChange: (p: PlanBlock[]) => void; today: string }) {
  const [edit, setEdit] = useState<PlanBlock | null>(null);
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const gaps: string[] = [];
  for (let i = 1; i < sorted.length; i++) if (addDays(sorted[i - 1].end, 1) < sorted[i].start) gaps.push(`${fmtDate(addDays(sorted[i - 1].end, 1))}–${fmtDate(addDays(sorted[i].start, -1))}`);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start <= sorted[i - 1].end) gaps.push(`Überschneidung bei ${fmtDate(sorted[i].start)}`);
  return (
    <div className="stack">
      {sorted.map((b) => {
        const f = FOCUS_BY_ID[b.focusId];
        const now = b.start <= today && today <= b.end;
        return (
          <button key={b.id} className={`block-row ${now ? "now" : ""} ${b.end < today ? "past" : ""}`} onClick={() => setEdit(b)}>
            <div className="block-dates">{fmtDate(b.start)} – {fmtDate(b.end)}</div>
            <div className="block-name">{f?.name ?? "Orden fehlt"} {now && <span className="tag teal">jetzt</span>}</div>
            <div className="muted small">{b.label || "–"} · Last {LOAD_LABEL[b.load]}{b.travel ? " · unterwegs" : ""} · {blockWeeks(b)} Wochen</div>
          </button>
        );
      })}
      {gaps.length > 0 && <div className="note warn">Lücken oder Überschneidungen: {gaps.join("; ")}</div>}
      <button className="btn ghost" onClick={() => setEdit(newBlock(plan))}>+ Phase hinzufügen</button>
      {edit && (
        <Modal title={plan.some((x) => x.id === edit.id) ? "Phase bearbeiten" : "Neue Phase"} onClose={() => setEdit(null)} wide>
          <BlockForm block={edit} profiles={profiles}
            onCancel={() => setEdit(null)}
            onDelete={plan.some((x) => x.id === edit.id) ? () => { onChange(plan.filter((x) => x.id !== edit.id)); setEdit(null); } : undefined}
            onSave={(nb) => { onChange(plan.some((x) => x.id === nb.id) ? plan.map((x) => (x.id === nb.id ? nb : x)) : [...plan, nb]); setEdit(null); }} />
        </Modal>
      )}
    </div>
  );
}

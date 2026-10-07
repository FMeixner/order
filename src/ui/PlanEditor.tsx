import { useState } from "react";
import { FOCI, FOCUS_BY_ID, SHARPEN } from "../data";
import { domainName, interferes, slotEligible, type DomainId, type SlotPlan } from "../engine/sharpen";
import type { DeficitWeights } from "../engine/sequence";
import { addDays, blockWeeks, defaultRoles, fitScore, fmtDate, focusName, followedByTest, insertTestWeek, isoDate, isTestBlock, mondayOf, splitTestWeek } from "../engine/plan";
import { uid } from "../store";
import type { EquipmentProfile, Focus, Load, PlanBlock, UserProfile, Weekday } from "../types";
import { shapeFocus } from "../engine/weekplan";
import { shortDay, shortEligible } from "../engine/shortday";
import { WEEKDAYS } from "../types";
import { Check, Field, Modal, Seg } from "./common";
import { FocusDetail } from "./FociBrowser";
import { SequenceDialog } from "./SequenceDialog";

export const LOAD_LABEL: Record<Load, string> = { high: "hoch", medium: "mittel", low: "niedrig" };
/** Wie viel Alltagslast ein Orden verträgt, als kurzer Text */
export const LOAD_FIT_LABEL: Record<Load, string> = { high: "auch bei viel Alltagslast", medium: "bei mittlerer Alltagslast", low: "nur bei wenig Alltagslast" };
export function levelLabel(l: string): string {
  return l.replace("beginner", "Einsteiger").replace("intermediate", "Fortgeschrittene").replace("advanced", "Erfahrene");
}
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

const GOAL_GROUPS: { label: string; goals: string[] }[] = [
  { label: "Alle", goals: [] },
  { label: "Muskeln", goals: ["hypertrophy"] },
  { label: "Kraft & Schnelligkeit", goals: ["strength", "power", "speed"] },
  { label: "Ausdauer & Kondition", goals: ["endurance", "conditioning", "fatloss"] },
  { label: "Ruhe & Beweglichkeit", goals: ["wellbeing", "mobility"] },
  { label: "Skill", goals: ["skill"] },
];

export function FocusPicker({ load, travel, value, onPick, profile, days }: { load: Load; travel: boolean; value?: string; onPick: (id: string) => void; profile?: EquipmentProfile; days?: number }) {
  const [detail, setDetail] = useState<Focus | null>(null);
  const [group, setGroup] = useState(0);
  const goals = GOAL_GROUPS[group].goals;
  const ranked = [...FOCI]
    .map((f) => ({ f, ...fitScore(f, load, travel) }))
    .filter(({ f }) => !goals.length || goals.includes(f.goals.primary) || f.id === value)
    .sort((a, b) => (b.score >= 0 ? 1 : 0) - (a.score >= 0 ? 1 : 0));
  return (
    <div className="stack">
      <div className="chips" role="radiogroup" aria-label="Nach Ziel filtern">
        {GOAL_GROUPS.map((g, i) => (
          <button key={g.label} role="radio" aria-checked={group === i} className={group === i ? "on" : ""} onClick={() => setGroup(i)}>{g.label}</button>
        ))}
      </div>
      {ranked.map(({ f, score, reasons }) => (
        <div key={f.id} className={`focus-card ${value === f.id ? "on" : ""} ${score < 0 ? "dim" : ""}`}>
          <button className="focus-main" onClick={() => onPick(f.id)} aria-pressed={value === f.id}>
            <div className="focus-name">{f.name}{value === f.id && <span className="tag teal">gewählt</span>}{score < 0 && <span className="tag">passt nicht</span>}</div>
            <div className="focus-tag">{f.tagline}</div>
            <div className="focus-meta">{GOAL_LABEL[f.goals.primary]} · {f.weeks.min === f.weeks.max ? f.weeks.min : `${f.weeks.min}–${f.weeks.max}`} Wochen · {f.session_min} Min{score < 0 ? ` · ${reasons.filter((r) => /braucht|keine/.test(r)).join(", ")}` : ""}</div>
          </button>
          <button className="btn ghost small" onClick={() => setDetail(f)}>Details</button>
        </div>
      ))}
      {detail && <Modal title={detail.name} onClose={() => setDetail(null)} wide><FocusDetail f={detail} profile={profile} days={days} /></Modal>}
    </div>
  );
}

export function BlockForm({ block, profiles, days, user, slotInfo, onSave, onCancel, onDelete, onInsertTest, onSplitTest }: { block: PlanBlock; profiles: EquipmentProfile[]; days?: number; user?: UserProfile; slotInfo?: (b: PlanBlock) => SlotPlan; onSave: (b: PlanBlock) => void; onCancel: () => void; onDelete?: () => void; onInsertTest?: () => void; onSplitTest?: () => void }) {
  const [b, setB] = useState<PlanBlock>(block);
  const [ownWeek, setOwnWeek] = useState(!!block.schedule && Object.values(block.schedule).some(Boolean));
  const f = FOCUS_BY_ID[b.focusId];
  const weeks = blockWeeks(b);
  const valid = b.start <= b.end && (!!f || isTestBlock(b));
  if (isTestBlock(b)) return (
    <div className="stack">
      <p className="muted">Eine eigene Woche nur für Tests: fünf Cups, jeder frisch. Die Woche davor läuft mit −1 Satz. Die Auswertung schlägt danach einen Schwerpunkt vor.</p>
      <div className="row two">
        <Field label="Beginn"><input type="date" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value, end: addDays(e.target.value, 6) })} /></Field>
        <Field label="Ende"><input type="date" value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} /></Field>
      </div>
      <div className="sticky-actions">
        {onDelete && <button className="btn danger" onClick={onDelete}>Löschen</button>}
        <button className="btn ghost" onClick={onCancel}>Abbrechen</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave(b)}>Speichern</button>
      </div>
    </div>
  );
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
      <FocusPicker load={b.load} travel={b.travel} value={b.focusId} onPick={(focusId) => setB({ ...b, focusId })} profile={profiles[0]} days={b.schedule && Object.values(b.schedule).some(Boolean) ? Object.values(b.schedule).filter(Boolean).length : days} />
      {f && slotEligible(f) && <SlotField f={f} b={b} auto={slotInfo?.({ ...b, sharpen: undefined })} onChange={(sharpen) => setB({ ...b, sharpen })} />}
      {f && !f.medley?.length && <ShortDayField f={f} b={b} user={user ?? { name: "" }} n={b.schedule && Object.values(b.schedule).some(Boolean) ? Object.values(b.schedule).filter(Boolean).length : days ?? 4} onChange={(shortRole) => setB({ ...b, shortRole })} />}
      {(onInsertTest || onSplitTest) && (
        <div className="stack">
          <div className="small muted">Testwoche als eigener Block</div>
          <div className="row wrap">
            {onSplitTest && <button className="btn ghost small" onClick={onSplitTest}>Letzte Woche als Testwoche</button>}
            {onInsertTest && <button className="btn ghost small" onClick={onInsertTest}>Danach eine Woche einschieben</button>}
          </div>
          <div className="muted small">„Letzte Woche“ kürzt diese Phase, der Rest des Jahres bleibt. „Einschieben“ verschiebt alle späteren Phasen um eine Woche.</div>
        </div>
      )}
      <div className="sticky-actions">
        {onDelete && <button className="btn danger" onClick={onDelete}>Löschen</button>}
        <button className="btn ghost" onClick={onCancel}>Abbrechen</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave(b)}>{f ? "Speichern" : "Erst Orden wählen"}</button>
      </div>
    </div>
  );
}

/** Kurztag: ein Tag nur mit drei Kernübungen; die App zeigt, ob und wie die übrigen Tage ausgleichen */
function ShortDayField({ f, b, user, n, onChange }: { f: Focus; b: PlanBlock; user: UserProfile; n: number; onChange: (v: string | undefined) => void }) {
  const shaped = shapeFocus(f, n);
  const roles = defaultRoles(shaped, n);
  const eligible = roles.filter((k) => shaped.roles[k] && shortEligible(shaped.roles[k]));
  if (!eligible.length) return null;
  const rep = b.shortRole && eligible.includes(b.shortRole) ? shortDay(shaped, b.shortRole, user, roles).report : null;
  return (
    <Field label="Kurztag" hint="Ein Tag nur mit drei Kernübungen. Leidet das Ziel des Ordens, gleichen die anderen Tage aus, ohne ihr Zeitlimit zu reißen.">
      <select value={b.shortRole ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Kein Kurztag</option>
        {eligible.map((k) => <option key={k} value={k}>{shaped.roles[k].name}</option>)}
      </select>
      {rep && (
        <div className="stack small" style={{ marginTop: 8 }}>
          <div>Bleibt: {rep.kept.join(", ")}</div>
          <div className="muted">Fällt weg: {rep.dropped.join(", ")}</div>
          {rep.changes.length ? <div>Ausgleich: {rep.changes.join("; ")}</div> : <div className="ok">Kein Ausgleich nötig: Das Wochenvolumen bleibt im Zielbereich.</div>}
          {rep.unresolved.length > 0 && <div className="warn">Nicht ganz auszugleichen: {rep.unresolved.join("; ")}</div>}
        </div>
      )}
    </Field>
  );
}

/** Schwerpunkt-Slot einer Phase: automatisch nach der letzten Testwoche, fester Bereich oder aus */
function SlotField({ f, b, auto, onChange }: { f: Focus; b: PlanBlock; auto?: SlotPlan; onChange: (v: string | undefined) => void }) {
  return (
    <Field label="Schwerpunkt-Slot" hint={b.sharpen ? (b.sharpen === "off" ? "Kein Slot, der Orden bekommt die volle Zeit." : SHARPEN[b.sharpen]?.why) : auto?.reason || "Kleine Erhaltungsdosis für den schwächsten Bereich aus der letzten Testwoche."}>
      <select value={b.sharpen ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Automatisch{auto?.domain ? `: ${domainName(auto.domain)}` : " (derzeit keiner)"}</option>
        {Object.entries(SHARPEN).map(([id, d]) => <option key={id} value={id} disabled={interferes(f, id as DomainId)}>{d.name}{interferes(f, id as DomainId) ? " (stört das Ziel dieses Ordens)" : ""}</option>)}
        <option value="off">Aus</option>
      </select>
    </Field>
  );
}

export function newBlock(plan: PlanBlock[]): PlanBlock {
  const last = [...plan].sort((a, c) => a.end.localeCompare(c.end)).pop();
  const start = last ? addDays(last.end, 1) : mondayOf(isoDate(new Date()));
  return { id: uid("b"), focusId: "", label: "", start, end: addDays(start, 7 * 10 - 1), load: "medium", travel: false };
}

export function PlanList({ plan, profiles, days, user, deficits, deficitNames, slotInfo, onChange, today }: { plan: PlanBlock[]; profiles: EquipmentProfile[]; days?: number; user?: UserProfile; deficits?: DeficitWeights; deficitNames?: string[]; slotInfo?: (b: PlanBlock) => SlotPlan; onChange: (p: PlanBlock[]) => void; today: string }) {
  const [edit, setEdit] = useState<PlanBlock | null>(null);
  const [seq, setSeq] = useState(false);
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const gaps: string[] = [];
  for (let i = 1; i < sorted.length; i++) if (addDays(sorted[i - 1].end, 1) < sorted[i].start) gaps.push(`${fmtDate(addDays(sorted[i - 1].end, 1))}–${fmtDate(addDays(sorted[i].start, -1))}`);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start <= sorted[i - 1].end) gaps.push(`Überschneidung bei ${fmtDate(sorted[i].start)}`);
  return (
    <div className="stack">
      {sorted.map((b) => {
        const now = b.start <= today && today <= b.end;
        return (
          <button key={b.id} className={`block-row ${now ? "now" : ""} ${b.end < today ? "past" : ""}`} onClick={() => setEdit(b)}>
            <div className="block-dates">{fmtDate(b.start)} – {fmtDate(b.end)}</div>
            <div className="block-name">{focusName(b.focusId)} {now && <span className="tag teal">jetzt</span>}</div>
            <div className="muted small">{isTestBlock(b) ? "fünf Cups, Auswertung danach" : `${b.label || "–"} · Last ${LOAD_LABEL[b.load]}${b.travel ? " · unterwegs" : ""} · ${blockWeeks(b)} Wochen${b.shortRole && FOCUS_BY_ID[b.focusId]?.roles[b.shortRole] ? ` · Kurztag: ${FOCUS_BY_ID[b.focusId].roles[b.shortRole].name}` : ""}`}</div>
          </button>
        );
      })}
      {gaps.length > 0 && <div className="note warn">Lücken oder Überschneidungen: {gaps.join("; ")}</div>}
      <div className="row wrap">
        <button className="btn ghost" onClick={() => setEdit(newBlock(plan))}>+ Phase hinzufügen</button>
        {plan.some((b) => b.end >= today) && <button className="btn ghost" onClick={() => setSeq(true)}>Blockfolge vorschlagen</button>}
      </div>
      {seq && <SequenceDialog plan={plan} today={today} deficits={deficits} deficitNames={deficitNames} onApply={onChange} onClose={() => setSeq(false)} />}
      {edit && (
        <Modal title={plan.some((x) => x.id === edit.id) ? "Phase bearbeiten" : "Neue Phase"} onClose={() => setEdit(null)} wide>
          <BlockForm block={edit} profiles={profiles} days={days} user={user} slotInfo={slotInfo}
            onCancel={() => setEdit(null)}
            onDelete={plan.some((x) => x.id === edit.id) ? () => { if (!confirm(`Phase ${fmtDate(edit.start)}–${fmtDate(edit.end)} löschen? Einträge im Log bleiben erhalten.`)) return; onChange(plan.filter((x) => x.id !== edit.id)); setEdit(null); } : undefined}
            onInsertTest={plan.some((x) => x.id === edit.id) && !isTestBlock(edit) && !followedByTest(plan, edit) ? () => { if (!confirm("Testwoche einschieben? Alle späteren Phasen rücken eine Woche nach hinten.")) return; onChange(insertTestWeek(plan, edit.id, uid("b"))); setEdit(null); } : undefined}
            onSplitTest={plan.some((x) => x.id === edit.id) && !isTestBlock(edit) && !followedByTest(plan, edit) && blockWeeks(edit) >= 3 ? () => { onChange(splitTestWeek(plan, edit.id, uid("b"))); setEdit(null); } : undefined}
            onSave={(nb) => { onChange(plan.some((x) => x.id === nb.id) ? plan.map((x) => (x.id === nb.id ? nb : x)) : [...plan, nb]); setEdit(null); }} />
        </Modal>
      )}
    </div>
  );
}

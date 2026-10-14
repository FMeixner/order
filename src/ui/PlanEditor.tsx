import { useState } from "react";
import { OrderMark } from "./OrderIcon";
import { FOCI, SHARPEN } from "../data";
import { domainName, interferes, slotEligible, type DomainId, type SlotPlan } from "../engine/sharpen";
import type { DeficitWeights } from "../engine/sequence";
import { addDays, blockFocus, blockWeeks, fitScore, fmtDate, focusName, isoDate, isTestBlock, mondayOf } from "../engine/plan";
import { uid } from "../store";
import type { EquipmentProfile, Focus, Load, PlanBlock, UserProfile, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Check, Collapse, Field, Modal, Seg } from "./common";
import { FocusDetail } from "./FociBrowser";
import { SequenceDialog } from "./SequenceDialog";
import { PlanStack } from "./PlanStack";
import { rankFor, type Aim } from "../engine/sequence";
import { mergeNext, nextOf, setTestWeek, splitBlock, testAfter } from "../engine/stack";

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
          <OrderMark id={f.id} />
          <button className="focus-main" onClick={() => onPick(f.id)} aria-pressed={value === f.id}>
            <div className="focus-name">{focusName(f.id)}{value === f.id && <span className="tag teal">gewählt</span>}{score < 0 && <span className="tag">passt nicht</span>}</div>
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

/** Bearbeitungsseite einer Phase: erst die Phase (Name, Last, unterwegs), dann der Orden (Empfehlung zuerst),
    dann Aufteilen (Teilen, Verbinden), zuletzt Feinheiten (Zeitraum, eigener Wochenplan, Schwerpunkt-Slot). */
export function BlockForm({ block, profiles, days, slotInfo, onSave, onCancel, onDelete, plan, aim = "allround", deficits = [], onStructure, today }: {
  block: PlanBlock; profiles: EquipmentProfile[]; days?: number; user?: UserProfile; slotInfo?: (b: PlanBlock) => SlotPlan;
  onSave: (b: PlanBlock, opts?: { test?: boolean }) => void; onCancel: () => void; onDelete?: () => void;
  plan?: PlanBlock[]; aim?: Aim; deficits?: DeficitWeights; onStructure?: (p: PlanBlock[]) => void; today?: string;
}) {
  const [b, setB] = useState<PlanBlock>(block);
  const [ownWeek, setOwnWeek] = useState(!!block.schedule && Object.values(block.schedule).some(Boolean));
  const [all, setAll] = useState(false);
  // Testwoche am Ende: die letzte Woche der Phase wird Testwoche (ab 3 Wochen)
  const [test, setTest] = useState(!!(plan && testAfter(plan, block)));
  const f = blockFocus(b);
  const weeks = blockWeeks(b);
  const valid = b.start <= b.end && (!!f || isTestBlock(b));
  const day = today ?? isoDate(new Date());
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
  // Empfehlung mit den Einstellungen dieser Seite (Last, unterwegs), Rest des Plans wie er ist
  const draftPlan = plan ? (plan.some((x) => x.id === b.id) ? plan.map((x) => (x.id === b.id ? b : x)) : [...plan, b]) : [b];
  const ranked = rankFor(draftPlan, b.id, aim, deficits).slice(0, 5);
  const locked = b.start <= day; // laufende Phase: Orden nicht hier wechseln (eingefroren)
  const inPlan = !!plan?.some((x) => x.id === b.id);
  const nx = plan && inPlan ? nextOf(plan, b) : undefined;
  return (
    <div className="stack">
      <div className="label teal"><span className="bar" />Phase</div>
      <Field label="Name" hint="z. B. Wintersemester, Ferien, Projektphase">
        <input type="text" value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} />
      </Field>
      <Field label="Alltagslast" hint="Hoch = wenig Energie und Zeit fürs Training übrig.">
        <Seg value={b.load} options={[{ value: "low", label: "niedrig" }, { value: "medium", label: "mittel" }, { value: "high", label: "hoch" }]} onChange={(load) => setB({ ...b, load })} />
      </Field>
      <Check checked={b.travel} onChange={(travel) => setB({ ...b, travel })} label="Viel unterwegs" />
      {plan && b.end >= day && (blockWeeks(b) >= 3 || test) && (
        <Check checked={test} onChange={setTest} label="Testwoche am Ende (die letzte Woche wird zur Testwoche)" />
      )}

      <div className="label teal"><span className="bar" />Orden · {weeks} Wochen{f && (weeks < f.weeks.min || weeks > f.weeks.max) ? ` (passt für ${f.weeks.min}–${f.weeks.max})` : ""}</div>
      {locked ? (
        <p className="muted small">{f ? focusName(f.id) : "–"} läuft schon. Einen anderen Orden wählst du für die nächste Phase.</p>
      ) : (
        <div className="sc-alts">
          {ranked.map((r, i) => (
            <button key={r.f.id} className={`sc-alt ${r.f.id === b.focusId ? "on" : ""}`} aria-pressed={r.f.id === b.focusId} onClick={() => setB({ ...b, focusId: r.f.id })}>
              <span><strong>{focusName(r.f.id)}</strong>{i === 0 && <span className="tag rec">empfohlen</span>}{r.f.id === b.focusId && <span className="tag">gewählt</span>}</span>
              <span className="muted small">{r.f.tagline}{r.reasons.length ? ` · ${r.reasons.slice(0, 2).join(", ")}` : ""}</span>
            </button>
          ))}
          <button className="sc-alt muted" aria-expanded={all} onClick={() => setAll((x) => !x)}>{all ? "Weniger" : "Alle Orden …"}</button>
          {all && <FocusPicker load={b.load} travel={b.travel} value={b.focusId} onPick={(focusId) => setB({ ...b, focusId })} profile={profiles[0]} days={b.schedule && Object.values(b.schedule).some(Boolean) ? Object.values(b.schedule).filter(Boolean).length : days} />}
        </div>
      )}

      {onStructure && inPlan && b.end >= day && (weeks >= 2 || nx) && (
        <>
          <div className="label teal"><span className="bar" />Aufteilen</div>
          <div className="row wrap">
            {weeks >= 2 && <button className="btn ghost small" onClick={() => onStructure(splitBlock(plan!, b.id, uid("b"), day))}>In zwei Phasen teilen</button>}
            {nx && nx.start > day && <button className="btn ghost small" onClick={() => onStructure(mergeNext(plan!, b.id, day))}>Mit {focusName(nx.focusId)} verbinden</button>}
          </div>
          <p className="muted small">Teilen: zwei Phasen mit demselben Orden, danach wählst du für die zweite einen anderen. Verbinden: diese Phase läuft bis zum Ende der nächsten weiter. Gilt sofort.</p>
        </>
      )}

      <Collapse title="Mehr" meta="Zeitraum, Wochenplan, Schwerpunkt">
        <div className="stack">
          <div className="row two">
            <Field label="Beginn"><input type="date" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} /></Field>
            <Field label="Ende"><input type="date" value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} /></Field>
          </div>
          <Check checked={ownWeek} onChange={(v) => { setOwnWeek(v); if (!v) setB({ ...b, schedule: undefined }); }} label="Eigener Wochenplan für diese Phase" />
          {ownWeek && <WeekEditor schedule={b.schedule ?? {}} profiles={profiles} onChange={(schedule) => setB({ ...b, schedule })} allowEmpty />}
          {f && slotEligible(f) && <SlotField f={f} b={b} auto={slotInfo?.({ ...b, sharpen: undefined })} onChange={(sharpen) => setB({ ...b, sharpen })} />}
        </div>
      </Collapse>
      <div className="sticky-actions">
        {onDelete && <button className="btn danger" onClick={onDelete}>Löschen</button>}
        <button className="btn ghost" onClick={onCancel}>Abbrechen</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave(b, { test })}>{f ? "Speichern" : "Erst Orden wählen"}</button>
      </div>
    </div>
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

export function PlanList({ plan, profiles, days, user, deficits, deficitNames, slotInfo, onChange, today, aim: aimIn }: { plan: PlanBlock[]; profiles: EquipmentProfile[]; days?: number; user?: UserProfile; deficits?: DeficitWeights; deficitNames?: string[]; slotInfo?: (b: PlanBlock) => SlotPlan; onChange: (p: PlanBlock[]) => void; today: string; aim?: Aim }) {
  const aim: Aim = aimIn ?? (deficits?.length ? "deficits" : "allround");
  const [edit, setEdit] = useState<PlanBlock | null>(null);
  // Antippen zeigt erst, was der Orden abbildet; Bearbeiten ist der zweite Schritt
  const [view, setView] = useState<PlanBlock | null>(null);
  const [seq, setSeq] = useState(false);
  const sorted = [...plan].sort((a, b) => a.start.localeCompare(b.start));
  const gaps: string[] = [];
  for (let i = 1; i < sorted.length; i++) if (addDays(sorted[i - 1].end, 1) < sorted[i].start) gaps.push(`${fmtDate(addDays(sorted[i - 1].end, 1))}–${fmtDate(addDays(sorted[i].start, -1))}`);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start <= sorted[i - 1].end) gaps.push(`Überschneidung bei ${fmtDate(sorted[i].start)}`);
  return (
    <div className="stack">
      <PlanStack plan={plan} today={today} aim={aim} deficits={deficits ?? []} onChange={onChange}
        onView={(b) => setView(b)} onEdit={(b) => setEdit(b)} />
      {gaps.length > 0 && <div className="note warn">Lücken oder Überschneidungen: {gaps.join("; ")}</div>}
      <div className="row wrap">
        <button className="btn ghost" onClick={() => { const nb = newBlock(plan); const p = [...plan, nb]; const top = rankFor(p, nb.id, aim, deficits ?? [])[0]; onChange(top ? p.map((x) => (x.id === nb.id ? { ...x, focusId: top.f.id } : x)) : p); }}>+ Phase anhängen</button>
        {plan.some((b) => b.end >= today) && <button className="btn ghost" onClick={() => setSeq(true)}>Blockfolge vorschlagen</button>}
      </div>
      {view && blockFocus(view) && (
        <Modal title={focusName(view.focusId)} onClose={() => setView(null)} wide>
          <div className="stack">
            <div className="row between wrap">
              <span className="muted small">{fmtDate(view.start)} – {fmtDate(view.end)} · {view.label || "–"} · Last {LOAD_LABEL[view.load]} · {blockWeeks(view)} Wochen</span>
              <button className="btn small" onClick={() => { setEdit(view); setView(null); }}>Phase bearbeiten</button>
            </div>
            <FocusDetail f={blockFocus(view)!} profile={profiles[0]} days={days} skills={user?.skills ? new Set(user.skills) : null} />
          </div>
        </Modal>
      )}
      {seq && <SequenceDialog plan={plan} today={today} initialAim={aim} deficits={deficits} deficitNames={deficitNames} onApply={onChange} onClose={() => setSeq(false)} />}
      {edit && (
        <Modal title={plan.some((x) => x.id === edit.id) ? "Phase bearbeiten" : "Neue Phase"} onClose={() => setEdit(null)} wide>
          <BlockForm block={edit} profiles={profiles} days={days} user={user} slotInfo={slotInfo} plan={plan} today={today}
            aim={aim} deficits={deficits ?? []} onStructure={(p) => { onChange(p); setEdit(null); }}
            onCancel={() => setEdit(null)}
            onDelete={plan.some((x) => x.id === edit.id) ? () => { if (!confirm(`Phase ${fmtDate(edit.start)}–${fmtDate(edit.end)} löschen? Einträge im Log bleiben erhalten.`)) return; onChange(plan.filter((x) => x.id !== edit.id)); setEdit(null); } : undefined}
            onSave={(nb, o) => {
              const p = plan.some((x) => x.id === nb.id) ? plan.map((x) => (x.id === nb.id ? nb : x)) : [...plan, nb];
              onChange(o?.test === undefined || isTestBlock(nb) ? p : setTestWeek(p, nb.id, o.test, uid("b")));
              setEdit(null);
            }} />
        </Modal>
      )}
    </div>
  );
}

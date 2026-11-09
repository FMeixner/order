/* Jahres-Assistent (1.0): ein Weg durchs Jahr in vier Schritten — Ziel → Klammern → Schwachstellen → Orden.
   Jeder Schritt zeigt den Vorschlag oben und lässt ihn überschreiben; was von Hand gewählt wird, wird gepinnt
   und bleibt beim nächsten Neuplanen stehen. Ein Generator (planYear) statt vier Knöpfen. */
import { useMemo, useState } from "react";
import { FOCI, FOCUS_BY_ID, KLAMMERN, KLAMMER_BY_ID } from "../data";
import { type AimPrio, aimsOf, whyCut, bindOf, klammerName, klammernOf, kcalOfKlammer, effectiveLoads, planYear, rankInKlammer } from "../engine/klammer";
import { fmtDate, focusName, isTestBlock } from "../engine/plan";
import type { ResidualClock } from "../engine/residual";
import { loadOfWindow, travelOfWindow } from "../engine/stack";
import type { Aim, DeficitWeights } from "../engine/sequence";
import { uid } from "../store";
import { domainName, PURPOSE_LABEL, yearSlots, type YearSlot } from "../engine/sharpen";
import type { AppState, Kcal, KlammerId, PlanBlock, Section } from "../types";
import { DEFAULT_TEST_POLICY } from "../types";
import { Modal, Seg } from "./common";
import { Bereiche } from "./Bereiche";
import { OrderMark } from "./OrderIcon";
import { AimsPicker, SectionList } from "./SectionsCard";
import { KlammerIcon, Sign } from "./Signs";
import { YearPicture } from "./YearPicture";
import { unpinBeasts } from "./session/items";

type Update = (fn: (s: AppState) => AppState) => void;
type Policy = "each" | "twice" | "none";
const POLICY: { value: Policy; label: string }[] = [{ value: "each", label: "nach jedem Zeichen" }, { value: "twice", label: "zweimal im Jahr" }, { value: "none", label: "keine" }];
const STEPS = ["Ziel", "Zeichen", "Bereiche", "Orden"];
const KCAL_OPTS: Kcal[] = ["deficit", "maintenance", "surplus"];

export function YearWizard({ state, update, today, aim: aim0, deficits, steer, clocks, onClose, startAt = 0, fromTest }: {
  state: AppState; update: Update; today: string; aim: Aim; deficits: DeficitWeights; steer: DeficitWeights;
  clocks: ResidualClock[]; onClose: () => void; startAt?: number;
  /** Aus der Testwoche: Namen der Defizite; der Assistent startet mit „Defizite zuerst“, wenn kein Jahresziel gesetzt ist */
  fromTest?: string[];
}) {
  const [step, setStep] = useState(startAt);
  const [aims, setAims] = useState<AimPrio[]>(state.yearAims ?? (aim0 !== "allround" && aim0 !== "deficits" ? [{ aim: aim0, prio: 1 }] : []));
  const [mode, setMode] = useState<"allround" | "deficits">(aim0 === "deficits" || (fromTest?.length && !state.yearAims?.length) ? "deficits" : "allround");
  const aim: Aim = aims.find((a) => a.prio === 1)?.aim ?? mode;
  const [policy, setPolicy] = useState<Policy>(state.testPolicy ?? DEFAULT_TEST_POLICY);
  const [pool, setPool] = useState<string[]>(state.user.pool ?? []);
  const [sections, setSections] = useState<Section[]>(state.sections ?? []);
  // Zuordnung: Die Zeichen folgen den Abschnitten, die zuletzt zugeordnet wurden. Ändern sich die Abschnitte oben,
  // erscheint „Zeichen neu setzen“: Dann werden Zeichen, Orden und Kalorien neu nach Zielen und Zeiträumen gesetzt
  // (eigene Wahl aus diesem Assistenten und alte Pins künftiger Phasen fallen weg).
  const [mapped, setMapped] = useState<Section[]>(state.sections ?? []);
  const [basePlan, setBasePlan] = useState<PlanBlock[]>(state.plan);
  const [kinds, setKinds] = useState<Partial<Record<number, KlammerId>>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});
  const [kcals, setKcals] = useState<Record<string, Kcal>>({});
  const [open, setOpen] = useState<string | null>(null);
  const dirty = JSON.stringify(sections) !== JSON.stringify(mapped);
  const unpinned = (p: PlanBlock[]) => p.map((b) => (b.start > today && b.pin ? { ...b, pin: undefined } : b));

  const build = (plan: PlanBlock[], secs: Section[], k: typeof kinds, o: typeof orders, kc: typeof kcals) => {
    let p = planYear(plan, secs, today, () => uid("b"), { aim, aims, deficits, steer, testPolicy: policy, pool, kinds: k });
    p = p.map((b) => {
      if (b.start <= today || isTestBlock(b)) return b;
      let x = b;
      if (o[b.start]) x = { ...x, focusId: o[b.start], pin: { ...x.pin, focus: true } };
      const mesoStart = b.meso ? p.filter((y) => y.meso === b.meso).map((y) => y.start).sort()[0] : undefined;
      if (mesoStart && kc[mesoStart]) x = { ...x, kcal: kc[mesoStart], pin: { ...x.pin, kcal: true } };
      return x;
    });
    return p;
  };
  // Entwurf: ein Generator, danach die Handänderungen dieses Assistenten (nach Startdatum, damit sie Neuberechnungen überleben)
  const draft = useMemo(() => build(basePlan, mapped, kinds, orders, kcals), // eslint-disable-line react-hooks/exhaustive-deps
    [basePlan, mapped, today, aim, aims, deficits, steer, policy, pool, kinds, orders, kcals]);
  const remap = () => { setMapped(sections); setBasePlan(unpinned(state.plan)); setKinds({}); setOrders({}); setKcals({}); };
  const go = (n: number) => { if (dirty) remap(); setStep(n); };
  const future = klammernOf(draft).filter((k) => k.parts[0].start > today);
  // Schwerpunkte des Entwurfs in der Jahresgesamtschau (ein Slot je Orden)
  const slots = useMemo(() => yearSlots({ ...state, plan: draft, yearAims: aims }, today), [state, draft, aims, today]);
  const eff = useMemo(() => effectiveLoads(sections), [sections]);

  const apply = () => {
    const plan = dirty ? build(unpinned(state.plan), sections, {}, {}, {}) : draft;
    update((st) => unpinBeasts({ ...st, plan, sections, sectionsChanged: false, yearAim: aim, yearAims: aims, testPolicy: policy, user: { ...st.user, pool } }, (s) => s.date > today));
    onClose();
  };

  return (
    <Modal title="Jahr planen" onClose={onClose} wide>
      <div className="stack">
        <div className="stepper" role="tablist">
          {STEPS.map((s, i) => <button key={s} role="tab" aria-selected={step === i} className={step === i ? "on" : i < step ? "done" : ""} onClick={() => go(i)}>{i + 1} · {s}</button>)}
        </div>

        {fromTest && step === 0 && (
          <div className="note small">
            <strong>Neu aus der Testwoche:</strong> {fromTest.length ? `Defizite ${fromTest.join(", ")}. Sie ziehen Zeichen, Orden und Schwerpunkt-Slots.` : "keine Defizite gegen die Norm — die Planung bleibt bei deinen Zielen."}
          </div>
        )}
        {step === 0 && (
          <>
            <div className="field-label">Ziele des Jahres · bis zu drei, in Reihenfolge antippen</div>
            <AimsPicker aims={aims} mode={mode} deficits={deficits} onChange={(a, m) => { setAims(a); setMode(m); }} />
            <div className="field-label">Testwochen</div>
            <Seg value={policy} options={POLICY} onChange={setPolicy} />
            <div className="row between"><div className="field-label">Hausorden {pool.length ? `· ${pool.length}` : "· alle"}</div>{pool.length > 0 && <button className="btn ghost small" onClick={() => setPool([])}>Alle</button>}</div>
            <div className="pool-grid" role="group" aria-label="Hausorden">
              {FOCI.map((f) => {
                const on = pool.includes(f.id);
                return <button key={f.id} className={on ? "on" : ""} aria-pressed={on} onClick={() => setPool((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}><OrderMark id={f.id} />{focusName(f.id)}</button>;
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field-label">Lebensabschnitte · führend</div>
            <SectionList sections={sections} onChange={setSections} start={today} />
            {dirty && (
              <div className="note row between wrap">
                <span className="small">Abschnitte geändert — die Zeichen passen noch zur alten Einteilung. Erst neu setzen, dann wählen.</span>
                <button className="btn primary small" onClick={remap}>Zeichen neu setzen</button>
              </div>
            )}
            <div className="field-label">Zeichen darüber</div>
            <YearPicture plan={draft} sections={sections} today={today} />
            <div className="stack">
              {future.map((k, i) => {
                const wi = i; // Fenster-Index im Generator: künftige Klammern in Reihenfolge
                const kc = kcalOfKlammer(KLAMMER_BY_ID[k.kind], k.start, k.end, eff, loadOfWindow(sections, k.start, k.end), travelOfWindow(sections, k.start, k.end));
                return (
                  <div key={k.meso} className={`kl-card kl-${k.kind}`}>
                    <div className="kl-head"><KlammerIcon id={k.kind} /> {klammerName(k.kind)} {kinds[wi] && <Sign kind="pin" />}<span className="block-dates">{fmtDate(k.start)} – {fmtDate(k.end)}</span></div>
                    <div className="kl-kinds" role="radiogroup" aria-label={`Zeichen ${i + 1}`}>
                      {KLAMMERN.map((d) => <button key={d.id} role="radio" disabled={dirty} aria-checked={k.kind === d.id} aria-label={d.name} title={`${d.name} · ${d.tag}`} className={`kl-${d.id} ${k.kind === d.id ? "on" : ""}`} onClick={() => setKinds((x) => ({ ...x, [wi]: d.id }))}><KlammerIcon id={d.id} /></button>)}
                    </div>
                    <div className="row small muted"><Sign kind={k.kcal ?? "maintenance"} /> {kc.why}</div>
                    <div className="small muted">{whyCut(k, sections)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Bereiche state={state} plan={draft} today={today} clocks={clocks} />
            <p className="muted small">Fällige Bereiche und Lücken ziehen Zeichen und Orden, die sie halten. Die Schwerpunkt-Slots jeder Phase folgen der letzten Testwoche; einzeln änderbar im Phasenblatt.</p>
          </>
        )}

        {step === 3 && (
          <div className="stack">
            <div className="legend" aria-hidden>
              <span><Sign kind="bind-lead" size={12} />trägt das Ziel</span><span><Sign kind="bind-accept" size={12} />teilweise</span><span><Sign kind="bind-none" size={12} />nicht</span>
              <span><Sign kind="deficit" size={12} /><Sign kind="maintenance" size={12} /><Sign kind="surplus" size={12} />Kalorien</span><span><Sign kind="pin" size={12} />von Hand</span>
            </div>
            {future.map((k) => (
              <div key={k.meso} className={`kl-card kl-${k.kind}`}>
                <div className="kl-head"><KlammerIcon id={k.kind} /> {klammerName(k.kind)}<span className="block-dates">{fmtDate(k.start)} – {fmtDate(k.end)}</span></div>
                <div className="kl-kinds" role="radiogroup" aria-label="Kalorien">
                  {KCAL_OPTS.map((m) => <button key={m} role="radio" aria-checked={k.kcal === m} className={`kl-${k.kind} ${k.kcal === m ? "on" : ""}`} onClick={() => setKcals((x) => ({ ...x, [k.start]: m }))}><Sign kind={m} /></button>)}
                  {k.parts[0].pin?.kcal && <Sign kind="pin" />}
                </div>
                {k.parts.map((p) => <PartRow key={p.id} slot={slots.get(p.id)} plan={draft} p={p} pool={pool} steer={steer} aims={aimsOf(aim, aims)} open={open === p.start} onToggle={() => setOpen((o) => (o === p.start ? null : p.start))} onPick={(id) => { setOrders((x) => ({ ...x, [p.start]: id })); setOpen(null); }} />)}
              </div>
            ))}
          </div>
        )}

        <div className="sticky-actions">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Zurück</button> : <button className="btn ghost" onClick={onClose}>Abbrechen</button>}
          {step < 3 ? <button className="btn primary" onClick={() => go(step + 1)}>Weiter</button> : <button className="btn primary" onClick={apply}>Übernehmen</button>}
        </div>
      </div>
    </Modal>
  );
}

function PartRow({ plan, p, pool, steer, aims, open, onToggle, onPick, slot }: { plan: PlanBlock[]; p: PlanBlock; pool: string[]; steer: DeficitWeights; aims: AimPrio[]; open: boolean; onToggle: () => void; onPick: (id: string) => void; slot?: YearSlot }) {
  const f = FOCUS_BY_ID[p.focusId];
  const k = KLAMMER_BY_ID[p.klammer!];
  const alts = open ? rankInKlammer(plan, p.id, pool, steer, aims).filter((r) => r.f.id !== p.focusId).slice(0, 4) : [];
  return (
    <>
      <button className="kl-part btn ghost small" onClick={onToggle} aria-expanded={open}>
        <OrderMark id={p.focusId} />
        <span className="kl-name">{focusName(p.focusId)}</span>
        {f && <Sign kind={`bind-${bindOf(f, k)}`} />}
        {p.pin?.focus && <Sign kind="pin" />}
        <span className="block-dates">{fmtDate(p.start)} – {fmtDate(p.end)}</span>
      </button>
      {slot?.domain && <div className="kl-slot small muted">+ {domainName(slot.domain)}{slot.purpose ? ` · ${PURPOSE_LABEL[slot.purpose]}` : ""}</div>}
      {open && (
        <div className="alt-row">
          {alts.map((r) => <button key={r.f.id} onClick={() => onPick(r.f.id)}><Sign kind={`bind-${r.bind}`} size={12} />{focusName(r.f.id)}</button>)}
        </div>
      )}
    </>
  );
}

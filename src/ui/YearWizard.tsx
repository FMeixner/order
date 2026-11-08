/* Jahres-Assistent (1.0): ein Weg durchs Jahr in vier Schritten — Ziel → Klammern → Schwachstellen → Orden.
   Jeder Schritt zeigt den Vorschlag oben und lässt ihn überschreiben; was von Hand gewählt wird, wird gepinnt
   und bleibt beim nächsten Neuplanen stehen. Ein Generator (planYear) statt vier Knöpfen. */
import { useMemo, useState } from "react";
import { FOCI, FOCUS_BY_ID, KLAMMERN, KLAMMER_BY_ID } from "../data";
import { bindOf, klammerName, klammernOf, kcalOfKlammer, effectiveLoads, planYear, rankInKlammer } from "../engine/klammer";
import { fmtDate, focusName, isTestBlock } from "../engine/plan";
import type { MesoBalance } from "../engine/bilanz";
import type { ResidualClock } from "../engine/residual";
import { loadOfWindow, travelOfWindow } from "../engine/stack";
import type { Aim, DeficitWeights } from "../engine/sequence";
import { uid } from "../store";
import type { AppState, Kcal, KlammerId, PlanBlock, Section } from "../types";
import { DEFAULT_TEST_POLICY } from "../types";
import { Collapse, Modal, Seg } from "./common";
import { ResidualClocks } from "./ResidualClocks";
import { DomainBalance } from "./DomainBalance";
import { YearBalance } from "./YearBalance";
import { OrderMark } from "./OrderIcon";
import { AimPicker, SectionList } from "./SectionsCard";
import { KlammerIcon, Sign } from "./Signs";
import { YearPicture } from "./YearPicture";
import { unpinBeasts } from "./session/items";

type Update = (fn: (s: AppState) => AppState) => void;
type Policy = "each" | "twice" | "none";
const POLICY: { value: Policy; label: string }[] = [{ value: "each", label: "nach jeder Klammer" }, { value: "twice", label: "zweimal im Jahr" }, { value: "none", label: "keine" }];
const STEPS = ["Ziel", "Klammern", "Schwachstellen", "Orden"];
const KCAL_OPTS: Kcal[] = ["deficit", "maintenance", "surplus"];

export function YearWizard({ state, update, today, aim: aim0, deficits, steer, clocks, balance, onClose, startAt = 0 }: {
  state: AppState; update: Update; today: string; aim: Aim; deficits: DeficitWeights; steer: DeficitWeights;
  clocks: ResidualClock[]; balance: MesoBalance; onClose: () => void; startAt?: number;
}) {
  const [step, setStep] = useState(startAt);
  const [aim, setAim] = useState<Aim>(aim0);
  const [policy, setPolicy] = useState<Policy>(state.testPolicy ?? DEFAULT_TEST_POLICY);
  const [pool, setPool] = useState<string[]>(state.user.pool ?? []);
  const [sections, setSections] = useState<Section[]>(state.sections ?? []);
  const [kinds, setKinds] = useState<Partial<Record<number, KlammerId>>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});
  const [kcals, setKcals] = useState<Record<string, Kcal>>({});
  const [open, setOpen] = useState<string | null>(null);

  // Entwurf: ein Generator, danach die Handänderungen dieses Assistenten (nach Startdatum, damit sie Neuberechnungen überleben)
  const draft = useMemo(() => {
    let p = planYear(state.plan, sections, today, () => uid("b"), { aim, deficits, steer, testPolicy: policy, pool, kinds });
    p = p.map((b) => {
      if (b.start <= today || isTestBlock(b)) return b;
      let x = b;
      if (orders[b.start]) x = { ...x, focusId: orders[b.start], pin: { ...x.pin, focus: true } };
      const mesoStart = b.meso ? p.filter((y) => y.meso === b.meso).map((y) => y.start).sort()[0] : undefined;
      if (mesoStart && kcals[mesoStart]) x = { ...x, kcal: kcals[mesoStart], pin: { ...x.pin, kcal: true } };
      return x;
    });
    return p;
  }, [state.plan, sections, today, aim, deficits, steer, policy, pool, kinds, orders, kcals]);
  const future = klammernOf(draft).filter((k) => k.parts[0].start > today);
  const eff = useMemo(() => effectiveLoads(sections), [sections]);

  const apply = () => {
    update((st) => unpinBeasts({ ...st, plan: draft, sections, sectionsChanged: false, yearAim: aim, testPolicy: policy, user: { ...st.user, pool } }, (s) => s.date > today));
    onClose();
  };
  const hot = clocks.filter((c) => c.over);
  const gaps = [...new Set(balance.gaps.map((g) => g.name))];

  return (
    <Modal title="Jahr planen" onClose={onClose} wide>
      <div className="stack">
        <div className="stepper" role="tablist">
          {STEPS.map((s, i) => <button key={s} role="tab" aria-selected={step === i} className={step === i ? "on" : i < step ? "done" : ""} onClick={() => setStep(i)}>{i + 1} · {s}</button>)}
        </div>

        {step === 0 && (
          <>
            <div className="field-label">Richtung des Jahres</div>
            <AimPicker value={aim} deficits={deficits} onChange={setAim} />
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
            <YearPicture plan={draft} sections={sections} today={today} />
            <div className="stack">
              {future.map((k, i) => {
                const wi = i; // Fenster-Index im Generator: künftige Klammern in Reihenfolge
                const kc = kcalOfKlammer(KLAMMER_BY_ID[k.kind], k.start, k.end, eff, loadOfWindow(sections, k.start, k.end), travelOfWindow(sections, k.start, k.end));
                return (
                  <div key={k.meso} className={`kl-card kl-${k.kind}`}>
                    <div className="kl-head"><KlammerIcon id={k.kind} /> {klammerName(k.kind)} {kinds[wi] && <Sign kind="pin" />}<span className="block-dates">{fmtDate(k.start)} – {fmtDate(k.end)}</span></div>
                    <div className="kl-kinds" role="radiogroup" aria-label={`Klammer ${i + 1}`}>
                      {KLAMMERN.map((d) => <button key={d.id} role="radio" aria-checked={k.kind === d.id} aria-label={d.name} title={d.name} className={`kl-${d.id} ${k.kind === d.id ? "on" : ""}`} onClick={() => setKinds((x) => ({ ...x, [wi]: d.id }))}><KlammerIcon id={d.id} /></button>)}
                    </div>
                    <div className="row small muted"><Sign kind={k.kcal ?? "maintenance"} /> {kc.why}</div>
                  </div>
                );
              })}
            </div>
            <div className="field-label">Lebensabschnitte</div>
            <SectionList sections={sections} onChange={setSections} start={today} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="stack">
              {hot.length === 0 && gaps.length === 0 && <div className="row"><Sign kind="ok" /> Keine roten Uhren, keine Lücken.</div>}
              {hot.map((c) => <div key={c.id} className="row small"><Sign kind="clock" /> {c.name}<span className="muted mono">{c.days == null ? "nie" : `${c.days} / ${c.budget} Tage`}</span></div>)}
              {gaps.map((g) => <div key={g} className="row small"><Sign kind="gap" /> {g}</div>)}
            </div>
            <p className="muted small">Rote Uhren und Lücken ziehen Klammern und Orden, die sie halten. Die Schwerpunkt-Slots jeder Phase folgen der letzten Testwoche; einzeln änderbar im Phasenblatt.</p>
            <Collapse title="Details" meta="Uhren, Bilanz, Balance">
              <div className="stack">
                <ResidualClocks state={state} today={today} />
                <DomainBalance plan={draft} />
                <YearBalance plan={draft} />
              </div>
            </Collapse>
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
                {k.parts.map((p) => <PartRow key={p.id} plan={draft} p={p} pool={pool} steer={steer} open={open === p.start} onToggle={() => setOpen((o) => (o === p.start ? null : p.start))} onPick={(id) => { setOrders((x) => ({ ...x, [p.start]: id })); setOpen(null); }} />)}
              </div>
            ))}
          </div>
        )}

        <div className="sticky-actions">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Zurück</button> : <button className="btn ghost" onClick={onClose}>Abbrechen</button>}
          {step < 3 ? <button className="btn primary" onClick={() => setStep(step + 1)}>Weiter</button> : <button className="btn primary" onClick={apply}>Übernehmen</button>}
        </div>
      </div>
    </Modal>
  );
}

function PartRow({ plan, p, pool, steer, open, onToggle, onPick }: { plan: PlanBlock[]; p: PlanBlock; pool: string[]; steer: DeficitWeights; open: boolean; onToggle: () => void; onPick: (id: string) => void }) {
  const f = FOCUS_BY_ID[p.focusId];
  const k = KLAMMER_BY_ID[p.klammer!];
  const alts = open ? rankInKlammer(plan, p.id, pool, steer).filter((r) => r.f.id !== p.focusId).slice(0, 4) : [];
  return (
    <>
      <button className="kl-part btn ghost small" onClick={onToggle} aria-expanded={open}>
        <OrderMark id={p.focusId} />
        <span className="kl-name">{focusName(p.focusId)}</span>
        {f && <Sign kind={`bind-${bindOf(f, k)}`} />}
        {p.pin?.focus && <Sign kind="pin" />}
        <span className="block-dates">{fmtDate(p.start)} – {fmtDate(p.end)}</span>
      </button>
      {open && (
        <div className="alt-row">
          {alts.map((r) => <button key={r.f.id} onClick={() => onPick(r.f.id)}><Sign kind={`bind-${r.bind}`} size={12} />{focusName(r.f.id)}</button>)}
        </div>
      )}
    </>
  );
}

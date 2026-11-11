import { unpinAutoSlots } from "./engine/sharpen";
import { gymDaysOf } from "./engine/klammer";
import { useEffect, useRef, useState } from "react";
import { autoBackup } from "./backup";
import { isoDate } from "./engine/plan";
import { useAppState } from "./store";
import { Almanac } from "./ui/Almanac";
import { Onboarding } from "./ui/Onboarding";
import { PlanList } from "./ui/PlanEditor";
import { yearAimOf } from "./ui/SectionsCard";
import { YearWizard } from "./ui/YearWizard";
import { Sign } from "./ui/Signs";
import { bereiche, bereicheSummary } from "./engine/bereiche";
import { addDays, freezePlan, setOrderNames, trainingDays } from "./engine/plan";
import { deficitsBefore, deficitWeights, slotsFor } from "./engine/sharpen";
import { residualClocks } from "./engine/residual";
import { steerWeights } from "./engine/steer";
import { Setup } from "./ui/Setup";
import { TimerBar, TimerProvider } from "./ui/Timer";
import { Today } from "./ui/Today";
import { unlockAudio } from "./audio";
import { Help } from "./ui/Help";
import { Dashboard } from "./ui/Dashboard";
import { TabIcon } from "./ui/Signs";
import { Modal } from "./ui/common";

type Tab = "heute" | "plan" | "stand" | "almanach" | "setup";
const TABS: { k: Tab; l: string }[] = [
  { k: "heute", l: "Heute" }, { k: "plan", l: "Plan" }, { k: "stand", l: "Stand" }, { k: "almanach", l: "Almanach" },
];

export default function App() {
  const [state, update, replace] = useAppState();
  setOrderNames(state.user);
  useEffect(() => {
    const t = state.theme ?? "auto";
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  }, [state.theme]);
  // Einmalig: festgeschriebene Schwerpunkte, die „Automatisch“ entsprechen, wieder automatisch
  useEffect(() => { if (!state.autoSlots) update((s) => unpinAutoSlots(s)); }, [state.autoSlots]); // eslint-disable-line react-hooks/exhaustive-deps
  // Browser bitten, die Daten nicht von sich aus zu löschen (schützt nicht vor manuellem Löschen)
  useEffect(() => { navigator.storage?.persist?.().catch(() => undefined); }, []);
  // Automatische Sicherung, sobald eine Einheit abgeschlossen wurde
  const doneCount = state.sessions.filter((s) => s.done).length;
  const lastDone = useRef(doneCount);
  useEffect(() => {
    if (doneCount > lastDone.current) {
      autoBackup(state, isoDate(new Date())).then((r) => { if (r) update((s) => ({ ...s, lastBackup: isoDate(new Date()) })); });
    }
    lastDone.current = doneCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount]);
  // Gestartete Phasen behalten den Stand ihres Ordens; spätere Änderungen an den Orden-Daten gelten erst nach „übernehmen“
  const todayIso = isoDate(new Date());
  useEffect(() => {
    if (freezePlan(state.plan, todayIso)) update((s) => ({ ...s, plan: freezePlan(s.plan, todayIso) ?? s.plan }));
  }, [state.plan, todayIso, update]);
  const [tab, setTab] = useState<Tab>("heute");
  const [help, setHelp] = useState(false);
  const [wizard, setWizard] = useState<number | null>(null);
  // Aus der Testwoche geöffnet: Assistent startet mit „Defizite zuerst“ und zeigt, was die Tests ergeben haben
  const [fromTest, setFromTest] = useState(false);
  const today = isoDate(new Date());
  // Allrounder: Defizite der letzten Testwoche für Blockfolge und Schwerpunkt-Slot
  const src = state.user.focusMode === "special" ? null : deficitsBefore(state, addDays(today, 1));
  const deficits = src ? deficitWeights(src.list) : [];
  const deficitNames = src?.list.map((d) => d.name) ?? [];
  // Residual-Uhren: Tage seit dem letzten wirksamen Reiz je Bereich, für Karte und Plan-Stapel
  const clocks = residualClocks(state, today);
  // Domänen-Bilanz: effektive Wochen je Bereich, für Karte und Plan-Stapel
  // Lenkung: rote Uhren als Gewichte für Blockfolge und Meso-Wizard (Vorschlag, nie Einplanung)
  const steer = steerWeights(clocks);
  // Jahresblick: eine Statuszeile statt dreier Karten — die Mechanik läuft im Hintergrund weiter
  // Status-Symbol im Plan: fällige Bereiche (Frische) und Lücken im Plan (nächstes halbes Jahr)
  const ber = bereicheSummary(bereiche(state, today, state.plan, clocks));
  const overClocks = ber.due;
  const gapNames = ber.gaps.map((r) => r.def.name);
  const yearMeta = [overClocks.length ? `Bald: ${overClocks.map((r) => r.def.name).join(", ")}` : null, gapNames.length ? `Fehlt: ${gapNames.join(", ")}` : null]
    .filter(Boolean).join(" · ") || "alles im Lot";

  if (!state.onboarded) {
    return <div className="app" onPointerDown={unlockAudio}><Onboarding state={state} update={update} replace={replace} today={today} /></div>;
  }
  return (
    <TimerProvider>
      <div className="app" onPointerDown={unlockAudio}>
        <header className="topbar">
          <div className="brand">Order</div>
          <div className="topbar-right">
            {state.user.name && <div className="muted small">{state.user.name}</div>}
            <button className="help" onClick={() => setHelp(true)} aria-label="Anleitung">?</button>
            <button className={`help ${tab === "setup" ? "on" : ""}`} onClick={() => setTab(tab === "setup" ? "heute" : "setup")} aria-label="Setup" title="Setup"><TabIcon k="setup" /></button>
          </div>
        </header>
        <main className="main">
          {tab === "heute" && <Today state={state} update={update} today={today} goPlan={() => setTab("plan")} onOptimize={() => { setFromTest(true); setWizard(0); }} />}
          {tab === "plan" && (
            <div className="stack">
              <div className="plan-head">
                {state.user.level !== "einsteiger" && (
                  <button className="status-chip" onClick={() => setTab("stand")} aria-label={`Stand: ${yearMeta}`} title={yearMeta}>
                    {overClocks.length === 0 && gapNames.length === 0 ? <><Sign kind="ok" />alles im Lot</> : null}
                    {overClocks.length > 0 && <><Sign kind="clock" />{overClocks.length} bald</>}
                    {gapNames.length > 0 && <><Sign kind="gap" />{gapNames.length} fehlt</>}
                  </button>
                )}
                <button className="btn primary" onClick={() => setWizard(0)}>Jahr planen</button>
              </div>
              <PlanList plan={state.plan} profiles={state.equipment} days={trainingDays(state).length} user={state.user} sections={state.sections} today={today}
                deficits={deficits} deficitNames={deficitNames} slotInfo={(b) => slotsFor(state, b)} aim={yearAimOf(state, deficits)} aims={state.yearAims} gymDays={gymDaysOf(state)} steer={steer}
                onKlammer={() => setWizard(3)} yearView={state.yearView ?? "year"} onYearView={(yearView) => update((s) => ({ ...s, yearView }))}
                ideas={state.ideas ?? []} onIdeas={(ideas) => update((s) => ({ ...s, ideas }))}
                onChange={(plan) => update((s) => ({ ...s, plan }))} />
            </div>
          )}
          {wizard !== null && (
            <YearWizard state={state} update={update} today={today} aim={yearAimOf(state, deficits)} deficits={deficits} steer={steer} clocks={clocks} startAt={wizard} fromTest={fromTest ? deficitNames : undefined} onClose={() => { setWizard(null); setFromTest(false); }} />
          )}
          {tab === "stand" && <Dashboard state={state} update={update} today={today} clocks={clocks} onOptimize={() => { setFromTest(true); setWizard(0); }} goPlan={() => setTab("plan")} />}
          {tab === "almanach" && <Almanac state={state} update={update} today={today} />}
          {tab === "setup" && <Setup state={state} update={update} replace={replace} restartOnboarding={() => update((s) => ({ ...s, onboarded: false }))} />}
        </main>
        <TimerBar />
        {help && <Modal title="Anleitung" onClose={() => setHelp(false)} wide><Help /></Modal>}
        <nav className="tabbar">
          {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} aria-current={tab === t.k ? "page" : undefined} onClick={() => setTab(t.k)}><TabIcon k={t.k} /><span>{t.l}</span></button>)}
        </nav>
      </div>
    </TimerProvider>
  );
}

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
import { addDays, freezePlan, setOrderNames, trainingDays } from "./engine/plan";
import { deficitsBefore, deficitWeights, slotsFor } from "./engine/sharpen";
import { residualClocks } from "./engine/residual";
import { mesoBalance } from "./engine/bilanz";
import { steerWeights } from "./engine/steer";
import { Setup } from "./ui/Setup";
import { TimerBar, TimerProvider } from "./ui/Timer";
import { Today } from "./ui/Today";
import { unlockAudio } from "./audio";
import { Help } from "./ui/Help";
import { Modal } from "./ui/common";

type Tab = "heute" | "plan" | "almanach" | "setup";
const TABS: { k: Tab; l: string }[] = [
  { k: "heute", l: "Heute" }, { k: "plan", l: "Plan" }, { k: "almanach", l: "Almanach" }, { k: "setup", l: "Setup" },
];

export default function App() {
  const [state, update, replace] = useAppState();
  setOrderNames(state.user);
  useEffect(() => {
    const t = state.theme ?? "auto";
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  }, [state.theme]);
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
  const today = isoDate(new Date());
  // Allrounder: Defizite der letzten Testwoche für Blockfolge und Schwerpunkt-Slot
  const src = state.user.focusMode === "special" ? null : deficitsBefore(state, addDays(today, 1));
  const deficits = src ? deficitWeights(src.list) : [];
  const deficitNames = src?.list.map((d) => d.name) ?? [];
  // Residual-Uhren: Tage seit dem letzten wirksamen Reiz je Bereich, für Karte und Plan-Stapel
  const clocks = residualClocks(state, today);
  // Domänen-Bilanz: effektive Wochen je Bereich, für Karte und Plan-Stapel
  const balance = mesoBalance(state.plan);
  // Lenkung: rote Uhren als Gewichte für Blockfolge und Meso-Wizard (Vorschlag, nie Einplanung)
  const steer = steerWeights(clocks);
  // Jahresblick: eine Statuszeile statt dreier Karten — die Mechanik läuft im Hintergrund weiter
  const overClocks = clocks.filter((c) => c.over);
  const gapNames = [...new Set(balance.gaps.map((g) => g.name))];
  const yearMeta = [overClocks.length ? `${overClocks.length} ${overClocks.length === 1 ? "Uhr rot" : "Uhren rot"}` : null, gapNames.length ? `Lücken: ${gapNames.join(", ")}` : null]
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
          </div>
        </header>
        <main className="main">
          {tab === "heute" && <Today state={state} update={update} today={today} goPlan={() => setTab("plan")} />}
          {tab === "plan" && (
            <div className="stack">
              <div className="plan-head">
                {state.user.level !== "einsteiger" && (
                  <button className="status-chip" onClick={() => setWizard(2)} aria-label={`Jahresblick: ${yearMeta}`} title={yearMeta}>
                    {overClocks.length === 0 && gapNames.length === 0 ? <Sign kind="ok" /> : null}
                    {overClocks.length > 0 && <><Sign kind="clock" />{overClocks.length}</>}
                    {gapNames.length > 0 && <><Sign kind="gap" />{gapNames.length}</>}
                  </button>
                )}
                <button className="btn primary" onClick={() => setWizard(0)}>Jahr planen</button>
              </div>
              <PlanList plan={state.plan} profiles={state.equipment} days={trainingDays(state).length} user={state.user} sections={state.sections} today={today}
                deficits={deficits} deficitNames={deficitNames} slotInfo={(b) => slotsFor(state, b)} aim={yearAimOf(state, deficits)} steer={steer}
                onKlammer={() => setWizard(3)}
                onChange={(plan) => update((s) => ({ ...s, plan }))} />
            </div>
          )}
          {wizard !== null && (
            <YearWizard state={state} update={update} today={today} aim={yearAimOf(state, deficits)} deficits={deficits} steer={steer} clocks={clocks} balance={balance} startAt={wizard} onClose={() => setWizard(null)} />
          )}
          {tab === "almanach" && <Almanac state={state} update={update} today={today} />}
          {tab === "setup" && <Setup state={state} update={update} replace={replace} restartOnboarding={() => update((s) => ({ ...s, onboarded: false }))} />}
        </main>
        <TimerBar />
        {help && <Modal title="Anleitung" onClose={() => setHelp(false)} wide><Help /></Modal>}
        <nav className="tabbar">
          {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.l}</button>)}
        </nav>
      </div>
    </TimerProvider>
  );
}

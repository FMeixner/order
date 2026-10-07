import { useEffect, useRef, useState } from "react";
import { autoBackup } from "./backup";
import { isoDate } from "./engine/plan";
import { useAppState } from "./store";
import { Almanac } from "./ui/Almanac";
import { Onboarding } from "./ui/Onboarding";
import { PlanList } from "./ui/PlanEditor";
import { addDays, trainingDays } from "./engine/plan";
import { deficitsBefore, deficitWeights, slotFor } from "./engine/sharpen";
import { YearBalance } from "./ui/YearBalance";
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
  const [tab, setTab] = useState<Tab>("heute");
  const [help, setHelp] = useState(false);
  const today = isoDate(new Date());
  // Allrounder: Defizite der letzten Testwoche für Blockfolge und Schwerpunkt-Slot
  const src = state.user.focusMode === "special" ? null : deficitsBefore(state, addDays(today, 1));
  const deficits = src ? deficitWeights(src.list) : [];
  const deficitNames = src?.list.map((d) => d.name) ?? [];

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
              <p className="muted">Dein Jahr in Phasen. Tippe eine Phase an, um Zeitraum, Alltagslast oder Orden zu ändern.</p>
              {state.user.level !== "einsteiger" && <YearBalance plan={state.plan} />}
              <PlanList plan={state.plan} profiles={state.equipment} days={trainingDays(state).length} user={state.user} today={today}
                deficits={deficits} deficitNames={deficitNames} slotInfo={(b) => slotFor(state, b)}
                onChange={(plan) => update((s) => ({ ...s, plan }))} />
            </div>
          )}
          {tab === "almanach" && <Almanac state={state} update={update} today={today} />}
          {tab === "setup" && <Setup state={state} update={update} replace={replace} today={today} restartOnboarding={() => update((s) => ({ ...s, onboarded: false }))} />}
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

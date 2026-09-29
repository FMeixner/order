import { useState } from "react";
import { isoDate } from "./engine/plan";
import { useAppState } from "./store";
import { FociBrowser } from "./ui/FociBrowser";
import { LogView } from "./ui/LogView";
import { Onboarding } from "./ui/Onboarding";
import { PlanList } from "./ui/PlanEditor";
import { YearBalance } from "./ui/YearBalance";
import { Setup } from "./ui/Setup";
import { TimerBar, TimerProvider } from "./ui/Timer";
import { Today } from "./ui/Today";
import { unlockAudio } from "./audio";
import { Help } from "./ui/Help";
import { Modal } from "./ui/common";

type Tab = "heute" | "plan" | "foki" | "log" | "setup";
const TABS: { k: Tab; l: string }[] = [
  { k: "heute", l: "Heute" }, { k: "plan", l: "Plan" }, { k: "foki", l: "Orden" }, { k: "log", l: "Log" }, { k: "setup", l: "Setup" },
];

export default function App() {
  const [state, update, replace] = useAppState();
  const [tab, setTab] = useState<Tab>("heute");
  const [help, setHelp] = useState(false);
  const today = isoDate(new Date());

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
              <YearBalance plan={state.plan} />
              <PlanList plan={state.plan} profiles={state.equipment} today={today} onChange={(plan) => update((s) => ({ ...s, plan }))} />
            </div>
          )}
          {tab === "foki" && <FociBrowser state={state} />}
          {tab === "log" && <LogView state={state} />}
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

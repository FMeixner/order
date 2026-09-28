/* Einheitlicher Timer: 4 s Intro mit Ticks, Startton, Countdown mit Tönen in den letzten 5 s, Schlusston.
   Pausen laufen ohne Intro. Intervalle sind eine Folge aus Arbeit und Pause. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { TONES, unlockAudio, vibrate } from "../audio";

export type PhaseKind = "intro" | "work" | "rest";
export interface Phase { kind: PhaseKind; seconds: number; label?: string }
export interface TimerSpec { label: string; phases: Phase[]; onDone?: () => void }

interface Running extends TimerSpec { idx: number; endAt: number; pausedLeft: number | null; lastSec: number }

interface Ctx {
  running: Running | null;
  start: (spec: TimerSpec) => void;
  countdown: (label: string, seconds: number, onDone?: () => void) => void;
  rest: (label: string, seconds: number) => void;
  interval: (label: string, work: number, rest: number, rounds: number, onDone?: () => void) => void;
  stop: () => void;
}

const TimerCtx = createContext<Ctx | null>(null);
export const useTimer = () => useContext(TimerCtx)!;

let wakeLock: { release: () => Promise<void> } | null = null;
async function keepAwake(on: boolean) {
  try {
    const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    if (on && nav.wakeLock && !wakeLock) wakeLock = await nav.wakeLock.request("screen");
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* nicht unterstützt */ }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState<Running | null>(null);
  const [, force] = useState(0);
  const ref = useRef<Running | null>(null);
  ref.current = running;

  const begin = useCallback((spec: TimerSpec) => {
    unlockAudio();
    const first = spec.phases[0];
    if (first.kind === "intro") TONES.tick();
    else if (first.kind === "work") TONES.go();
    setRunning({ ...spec, idx: 0, endAt: Date.now() + first.seconds * 1000, pausedLeft: null, lastSec: first.seconds });
    void keepAwake(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const r = ref.current;
      if (!r || r.pausedLeft != null) return;
      const left = Math.ceil((r.endAt - Date.now()) / 1000);
      const ph = r.phases[r.idx];
      if (left !== r.lastSec) {
        if (ph.kind === "intro" && left > 0) TONES.tick();
        if (ph.kind !== "intro" && left > 0 && left <= 5) TONES.last5();
        r.lastSec = left;
      }
      if (left <= 0) {
        const next = r.idx + 1;
        if (next >= r.phases.length) {
          TONES.done();
          vibrate([200, 100, 200]);
          const cb = r.onDone;
          setRunning(null);
          void keepAwake(false);
          cb?.();
          return;
        }
        const np = r.phases[next];
        if (np.kind === "work") TONES.go();
        else if (np.kind === "rest") { TONES.done(); vibrate(150); }
        setRunning({ ...r, idx: next, endAt: Date.now() + np.seconds * 1000, lastSec: np.seconds });
        return;
      }
      force((x) => x + 1);
    }, 200);
    return () => clearInterval(iv);
  }, [running]);

  const ctx: Ctx = {
    running,
    start: begin,
    countdown: (label, seconds, onDone) => begin({ label, onDone, phases: [{ kind: "intro", seconds: 4, label: "Gleich geht's los" }, { kind: "work", seconds, label }] }),
    rest: (label, seconds) => begin({ label, phases: [{ kind: "rest", seconds, label }] }),
    interval: (label, work, rest, rounds, onDone) => {
      const phases: Phase[] = [{ kind: "intro", seconds: 4, label: "Gleich geht's los" }];
      for (let i = 0; i < rounds; i++) {
        phases.push({ kind: "work", seconds: work, label: `Runde ${i + 1}/${rounds}` });
        if (i < rounds - 1) phases.push({ kind: "rest", seconds: rest, label: `Pause, dann Runde ${i + 2}` });
      }
      begin({ label, phases, onDone });
    },
    stop: () => { setRunning(null); void keepAwake(false); },
  };
  return <TimerCtx.Provider value={ctx}>{children}</TimerCtx.Provider>;
}

export function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function TimerBar() {
  const { running } = useTimer();
  const t = useTimer();
  if (!running) return null;
  const ph = running.phases[running.idx];
  const left = running.pausedLeft ?? Math.max(0, (running.endAt - Date.now()) / 1000);
  const pct = 100 * (1 - left / ph.seconds);
  return (
    <div className={`timerbar phase-${ph.kind}`} role="timer" aria-live="polite">
      <div className="timerbar-progress" style={{ width: `${pct}%` }} />
      <div className="timerbar-main">
        <div className="timerbar-text">
          <div className="timerbar-label">{running.label}</div>
          {(ph.kind === "intro" || ph.label !== running.label) && <div className="timerbar-phase">{ph.kind === "intro" ? "Bereit machen" : ph.label}</div>}
        </div>
        <div className="timerbar-time">{fmt(left)}</div>
      </div>
      <div className="timerbar-actions">
        <PauseButton />
        <button className="btn ghost small" onClick={() => t.start({ ...running, phases: [{ ...ph, seconds: Math.ceil(left) + 15 }, ...running.phases.slice(running.idx + 1)] })}>+15 s</button>
        <button className="btn ghost small" onClick={() => {
          const rest = running.phases.slice(running.idx + 1);
          if (rest.length) t.start({ ...running, phases: rest });
          else { t.stop(); running.onDone?.(); }
        }}>Weiter</button>
        <button className="btn ghost small" onClick={t.stop} aria-label="Timer beenden">✕</button>
      </div>
    </div>
  );
}

function PauseButton() {
  const t = useTimer();
  const r = t.running!;
  const [paused, setPaused] = useState<{ left: number } | null>(null);
  if (paused) {
    return <button className="btn ghost small" onClick={() => {
      const ph = r.phases[r.idx];
      t.start({ ...r, phases: [{ ...ph, seconds: paused.left }, ...r.phases.slice(r.idx + 1)] });
      setPaused(null);
    }}>Weiter ▶</button>;
  }
  return <button className="btn ghost small" onClick={() => {
    const left = Math.max(1, Math.ceil((r.endAt - Date.now()) / 1000));
    setPaused({ left });
    r.pausedLeft = left;
  }}>Pause</button>;
}

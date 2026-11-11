import { useEffect, useRef, useState } from "react";
import { TONES, unlockAudio, vibrate } from "../audio";
import { keepAwake } from "./Timer";

/** Zeit für Tests (1.36): Start → 4 s in Position (Ticks) → Zeit läuft.
    hold: zählt hoch, du tippst Stopp, wenn die Haltung bricht; die Sekunden landen im Feld.
    fixed: zählt die feste Dauer herunter und stoppt von selbst (Signal); dann trägst du das Ergebnis ein. */
export type TestTimerSpec = { mode: "hold" } | { mode: "fixed"; seconds: number };
export const GET_READY = 4;

export function TestTimer({ spec, onResult }: { spec: TestTimerSpec; onResult: (seconds: number) => void }) {
  const [phase, setPhase] = useState<"idle" | "prep" | "run" | "done">("idle");
  const [now, setNow] = useState(0);
  const t0 = useRef(0);
  const last = useRef(-1);
  useEffect(() => {
    if (phase !== "prep" && phase !== "run") return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);
  const elapsed = (now - t0.current) / 1000;
  // Übergänge und Töne
  useEffect(() => {
    if (phase === "prep") {
      const left = Math.ceil(GET_READY - elapsed);
      if (left !== last.current && left > 0) { last.current = left; TONES.tick(); }
      if (elapsed >= GET_READY) { t0.current += GET_READY * 1000; last.current = -1; TONES.go(); vibrate(150); setPhase("run"); }
    } else if (phase === "run" && spec.mode === "fixed") {
      const left = Math.ceil(spec.seconds - elapsed);
      if (left <= 5 && left > 0 && left !== last.current) { last.current = left; TONES.last5(); }
      if (elapsed >= spec.seconds) stop(spec.seconds);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { keepAwake(false); }, []);
  const start = () => { unlockAudio(); keepAwake(true); t0.current = Date.now(); setNow(t0.current); last.current = -1; setPhase("prep"); };
  const stop = (sec: number) => {
    TONES.done(); vibrate([200, 100, 200]); keepAwake(false); setPhase("done");
    onResult(Math.round(sec * 10) / 10);
  };
  const shown = phase === "prep" ? Math.ceil(GET_READY - elapsed)
    : phase === "run" ? (spec.mode === "fixed" ? Math.max(0, Math.ceil(spec.seconds - elapsed)) : Math.floor(elapsed))
    : null;
  const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s));
  return (
    <div className="test-timer">
      {phase === "idle" || phase === "done" ? (
        <button className="btn small" onClick={start}>{phase === "done" ? "Nochmal starten" : "▶ Timer"}</button>
      ) : (
        <>
          <span className={`test-timer-num ${phase === "prep" ? "prep" : ""}`} aria-live="polite">{phase === "prep" ? `In Position … ${shown}` : mmss(shown ?? 0)}</span>
          {phase === "run" && spec.mode === "hold" && <button className="btn primary" onClick={() => stop(elapsed)}>Stopp</button>}
          <button className="btn ghost small" onClick={() => { keepAwake(false); setPhase("idle"); }}>Abbrechen</button>
        </>
      )}
      {phase === "done" && spec.mode === "fixed" && <span className="muted small">Zeit um – Ergebnis eintragen.</span>}
    </div>
  );
}

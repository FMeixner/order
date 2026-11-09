/* Ansage-Drill: Runden mit zufälligen Ansagen (Sprache und große Schrift), Pausen dazwischen.
   Die Runde ist abgehakt, wenn ihre Arbeitszeit durch ist; man kann auch von Hand abhaken. */
import { useEffect, useRef, useState } from "react";
import type { Session } from "../../types";
import { nextCue, nextGap, type CallView } from "../../engine/call";
import { Collapse, Seg } from "../common";
import { keepAwake } from "../Timer";
import type { SessionCtx } from "./ctx";
import { toggleDrill } from "./Drills";

type Phase = "idle" | "work" | "rest" | "done";

/** Feste Farbe je Richtung, damit das Auge schneller ist als das Lesen */
const TONE: [RegExp, string][] = [[/^nicht/i, "call-not"], [/links/i, "call-left"], [/rechts/i, "call-right"], [/vor|stich|jab/i, "call-front"], [/zurück|ducken|abrollen/i, "call-back"]];
const toneOf = (c: string) => TONE.find(([r]) => r.test(c))?.[1] ?? "call-other";

function say(text: string) {
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1.15;
    s.speak(u);
  } catch { /* keine Sprachausgabe */ }
}

export function CallCard({ call, ctx, session, mut }: { call: CallView; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void }) {
  const { def, rounds } = call;
  const key = `ca:${call.variant}`;
  const done = session?.drills?.[key] ?? [];
  const mode = ctx.state.callMode ?? "both";
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(0);
  const [cue, setCue] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const end = useRef(0);
  const nextAt = useRef(0);
  const last = useRef<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const doneRef = useRef(done);
  doneRef.current = done;

  const doneCount = Array.from({ length: rounds }, (_, i) => !!done[i]).filter(Boolean).length;
  const voice = (t: string) => { if (modeRef.current !== "text") say(t); };

  const startRound = (i: number) => {
    setRound(i);
    setPhase("work");
    end.current = Date.now() + def.work * 1000;
    nextAt.current = Date.now() + 1500;
    last.current = null;
    setCue(null);
    voice(`Runde ${i + 1}`);
  };
  const stop = () => { setPhase("idle"); setCue(null); keepAwake(false); try { window.speechSynthesis?.cancel(); } catch { /* */ } };

  useEffect(() => {
    if (phase !== "work" && phase !== "rest") return;
    const id = setInterval(() => {
      const now = Date.now();
      setLeft(Math.max(0, Math.ceil((end.current - now) / 1000)));
      if (phase === "work" && now >= nextAt.current && end.current - now > 800) {
        const c = nextCue(call.pool, last.current);
        last.current = c;
        setCue(c);
        voice(c);
        nextAt.current = now + nextGap(def);
      }
      if (now >= end.current) {
        if (phase === "work") {
          if (!doneRef.current[round]) mut((s) => toggleDrill(s, key, round));
          if (round + 1 >= rounds) { setPhase("done"); setCue(null); voice("Geschafft"); keepAwake(false); return; }
          setPhase("rest");
          setCue(null);
          end.current = now + def.rest * 1000;
          voice("Pause");
        } else startRound(round + 1);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { keepAwake(false); try { window.speechSynthesis?.cancel(); } catch { /* */ } }, []);

  const begin = () => {
    keepAwake(true);
    const first = Array.from({ length: rounds }, (_, i) => i).find((i) => !done[i]) ?? 0;
    startRound(first);
    setOpen(true);
  };

  return (
    <Collapse title={def.name} meta={`${doneCount}/${rounds} Runden`} tone="amber" open={open || phase === "work" || phase === "rest"} onOpenChange={setOpen}>
      {call.replaced && <div className="muted small">Statt „{call.replaced}“: „{ctx.profile.name}“ hat kein Schwert und keinen Stock.</div>}
      <div className="muted small">{def.how}</div>
      <div className="muted small">Stufe {call.level + 1}: {call.levelName} · {rounds} × {def.work} s, {def.rest} s Pause · Entscheiden unter Zeitdruck: Die Ansage kommt zufällig, alle {def.gap[0].toString().replace(".", ",")}–{def.gap[1]} s.</div>
      <Seg value={mode} options={[{ value: "both", label: "Ton + Schrift" }, { value: "sound", label: "Nur Ton" }, { value: "text", label: "Nur Schrift" }]}
        onChange={(v) => ctx.update((st) => ({ ...st, callMode: v === "both" ? undefined : (v as "sound" | "text") }))} />
      {(phase === "work" || phase === "rest") && (
        <div className={`call-stage ${phase}`} aria-live="assertive">
          <div className="muted small">Runde {round + 1}/{rounds} · {phase === "work" ? "Arbeit" : "Pause"} · {left} s</div>
          <div className={`call-cue ${cue ? toneOf(cue) : ""}`}>{phase === "rest" ? "Pause" : mode === "sound" ? (cue ? "●" : "…") : cue ?? "Bereit"}</div>
        </div>
      )}
      {phase === "done" && <div className="note small">Alle Runden geschafft.</div>}
      <div className="row wrap">
        {phase === "work" || phase === "rest"
          ? <button className="btn small" onClick={stop}>Stopp</button>
          : <button className="btn primary small" onClick={begin} disabled={doneCount >= rounds}>{doneCount ? "Weiter" : "Start"}</button>}
        {Array.from({ length: rounds }, (_, i) => (
          <button key={i} className={`set-btn ${done[i] ? "done" : ""}`} aria-label={`Runde ${i + 1}`} aria-pressed={!!done[i]} onClick={() => mut((s) => toggleDrill(s, key, i))}>{i + 1}</button>
        ))}
      </div>
    </Collapse>
  );
}

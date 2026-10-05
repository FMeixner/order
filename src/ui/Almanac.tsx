/* Almanach: Orden, Bestiarium, Übungen und Log in einem Reiter */
import { useState } from "react";
import type { AppState } from "../types";
import { Bestiary } from "./Bestiary";
import { Hunt, startHunt } from "./Hunt";
import { isHunt } from "../engine/runs";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { FociBrowser } from "./FociBrowser";
import { LogView } from "./LogView";
import { Seg } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;
type View = "orden" | "bestien" | "uebungen" | "log";

export function Almanac({ state, update, today }: { state: AppState; update: Update; today: string }) {
  // Offene Jagd (noch ohne Zeit) bleibt beim Reiterwechsel erhalten
  const [hunt, setHunt] = useState<string | null>(() => state.sessions.find((s) => isHunt(s) && !s.done)?.id ?? null);
  const [view, setView] = useState<View>(hunt ? "bestien" : "orden");
  return (
    <div className="stack">
      <Seg value={view} options={[{ value: "orden", label: "Orden" }, { value: "bestien", label: "Bestien" }, { value: "uebungen", label: "Übungen" }, { value: "log", label: "Log" }]} onChange={setView} />
      {view === "orden" && <FociBrowser state={state} />}
      {view === "bestien" && (hunt
        ? <Hunt state={state} update={update} today={today} id={hunt} onClose={() => setHunt(null)} />
        : <Bestiary state={state} onHunt={(beastId) => setHunt(startHunt(update, today, beastId))} />)}
      {view === "uebungen" && <ExerciseLibrary state={state} update={update} today={today} />}
      {view === "log" && <LogView state={state} today={today} />}
    </div>
  );
}

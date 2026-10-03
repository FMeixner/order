/* Almanach: Orden, Bestiarium, Übungen und Log in einem Reiter */
import { useState } from "react";
import type { AppState } from "../types";
import { Bestiary } from "./Bestiary";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { FociBrowser } from "./FociBrowser";
import { LogView } from "./LogView";
import { Seg } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;
type View = "orden" | "bestien" | "uebungen" | "log";

export function Almanac({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const [view, setView] = useState<View>("orden");
  return (
    <div className="stack">
      <Seg value={view} options={[{ value: "orden", label: "Orden" }, { value: "bestien", label: "Bestien" }, { value: "uebungen", label: "Übungen" }, { value: "log", label: "Log" }]} onChange={setView} />
      {view === "orden" && <FociBrowser state={state} />}
      {view === "bestien" && <Bestiary state={state} />}
      {view === "uebungen" && <ExerciseLibrary state={state} update={update} today={today} />}
      {view === "log" && <LogView state={state} today={today} />}
    </div>
  );
}

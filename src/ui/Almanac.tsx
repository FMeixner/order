/* Almanach: Orden und Bestiarium in einem Reiter */
import { useState } from "react";
import type { AppState } from "../types";
import { Bestiary } from "./Bestiary";
import { FociBrowser } from "./FociBrowser";
import { Seg } from "./common";

export function Almanac({ state }: { state: AppState }) {
  const [view, setView] = useState<"orden" | "bestien">("orden");
  return (
    <div className="stack">
      <Seg value={view} options={[{ value: "orden", label: "Orden" }, { value: "bestien", label: "Bestiarium" }]} onChange={setView} />
      {view === "orden" ? <FociBrowser state={state} /> : <Bestiary state={state} />}
    </div>
  );
}

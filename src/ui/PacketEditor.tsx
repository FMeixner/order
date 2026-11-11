/* Päckchen (1.22): Wie viele Wiederholungen am Stück ergeben bei dir ein Päckchen (= einen halben Satz)?
   Startwerte je Niveau, Push-ups und Klimmzüge aus dem letzten Testwert; eigene Werte schlagen beides. */
import { useState } from "react";
import { beastExercises, packetSize } from "../engine/dose";
import type { AppState } from "../types";
import { Collapse } from "./common";

export function PacketEditor({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const [all, setAll] = useState(false);
  const list = beastExercises();
  const shown = all ? list : list.slice(0, 30);
  const own = state.packets ?? {};
  const set = (name: string, v: string) => update((st) => {
    const packets = { ...(st.packets ?? {}) };
    const n = Math.round(Number(v));
    if (!v || !(n >= 1)) delete packets[name]; else packets[name] = n;
    return { ...st, packets };
  });
  return (
    <Collapse title="Päckchen" meta={`${Object.keys(own).length} eigene`}>
      <p className="muted small">So viele Wiederholungen schaffst du am Stück: Das ist ein Päckchen und zählt als halber Satz. 50 Push-ups bei 25 am Stück sind zwei Päckchen. Leer lassen nimmt den Startwert für dein Niveau; Push-ups und Klimmzüge folgen nach jeder Testwoche deinem Testwert.</p>
      <div className="packet-list">
        {shown.map(({ name }) => {
          const base = packetSize(name, state.user, { tests: state.tests });
          return (
            <label key={name} className="packet-row">
              <span>{name}</span>
              <input type="number" inputMode="numeric" min={1} placeholder={String(base)} value={own[name] ?? ""} onChange={(e) => set(name, e.target.value)} aria-label={`Päckchen ${name}`} />
            </label>
          );
        })}
      </div>
      {!all && list.length > 30 && <button className="btn ghost small" onClick={() => setAll(true)}>Alle {list.length} zeigen</button>}
    </Collapse>
  );
}

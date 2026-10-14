/* Deine Woche: je Wochentag Ort, gemerkte Anpassung (Kurz, Leise) und die Einheit der laufenden Phase. */
import { blockAt, focusName, rolesFor, trainingDays, weekInBlock } from "../engine/plan";
import { focusFor } from "../engine/weekplan";
import type { AppState, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { Collapse } from "./common";
import { unpinBeasts } from "./session/items";

type Update = (fn: (s: AppState) => AppState) => void;

export function WeekCard({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const block = blockAt(state.plan, today);
  const focus = block ? focusFor(state, block, weekInBlock(block, today)) : null;
  const own = !!block?.schedule && Object.values(block.schedule).some(Boolean);
  const days = block ? trainingDays(state, block) : trainingDays(state);
  const roles = block && focus ? rolesFor(state, block, focus) : [];
  const flags = state.dayFlags ?? {};
  const count = trainingDays(state).length;

  const setPlace = (d: Weekday, pid: string) => update((st) => ({ ...st, schedule: { ...st.schedule, [d]: pid || null } }));
  // Einheit eines Tages wählen: steht sie schon an einem anderen Tag, tauschen die beiden
  const setRole = (i: number, role: string) => block && update((st) => {
    const r = [...roles];
    const j = r.indexOf(role);
    if (j >= 0) r[j] = r[i];
    r[i] = role;
    return unpinBeasts({ ...st, roleOrder: { ...st.roleOrder, [block.id]: r } }, (s) => s.blockId === block.id);
  });
  const meta = [`${count} Tage`, ...WEEKDAYS.filter((d) => flags[d]).map((d) => `${d} ${[flags[d]!.short && "kurz", flags[d]!.quiet && "leise", flags[d]!.tight && "eng"].filter(Boolean).join("+")}`)].join(" · ");

  return (
    <Collapse title="Deine Woche" meta={meta}>
      <div className="stack week-card">
        {WEEKDAYS.map((d) => {
          const pid = state.schedule[d];
          const i = days.indexOf(d);
          return (
            <div key={d} className="week-day">
              <div className="week-row">
                <span className="day">{d}</span>
                <select value={pid ?? ""} onChange={(e) => setPlace(d, e.target.value)} aria-label={`Ort am ${d}`}>
                  <option value="">kein Training</option>
                  {state.equipment.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {pid && (flags[d]?.short || flags[d]?.quiet || flags[d]?.tight) && (
                  <span className="muted small week-fixed" title="Fixiert im Anpassen-Menü der Einheit">{[flags[d]?.short && "kurz", flags[d]?.quiet && "leise", flags[d]?.tight && "eng"].filter(Boolean).join(" · ")}</span>
                )}
              </div>
              {focus && i >= 0 && roles[i] && (
                <select className="week-role" value={roles[i]} onChange={(e) => setRole(i, e.target.value)} aria-label={`Einheit am ${d}`}>
                  {Object.entries(focus.roles).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              )}
            </div>
          );
        })}
        <p className="muted small">
          {count < 3 ? "Die Orden brauchen mindestens 3 Trainingstage. " : ""}
          „kurz“, „leise“ und „eng“ (kein Platz) fixierst du im Anpassen-Menü der Einheit.
          {focus ? ` Einheiten gelten für ${focusName(focus.id)}; wählst du eine doppelt, tauschen die Tage.` : ""}
          {own ? " Diese Phase hat einen eigenen Wochenplan (Phase antippen › Phase bearbeiten)." : ""}
        </p>
        {block && state.roleOrder[block.id] && (
          <button className="btn ghost small" onClick={() => update((st) => { const ro = { ...st.roleOrder }; delete ro[block.id]; return unpinBeasts({ ...st, roleOrder: ro }, (s) => s.blockId === block.id); })}>Einheiten wie im Orden verteilen</button>
        )}
      </div>
    </Collapse>
  );
}

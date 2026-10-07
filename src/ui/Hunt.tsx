/* Freie Jagd: eine Bestie aus dem Almanach heraus besiegen, außerhalb des Plans.
   Wird gespeichert wie eine kleine Einheit (blockId „jagd“): zählt für Bestzeiten, Log und Flugblatt, nicht als Trainingseinheit. */
import { beastById, weekdayOf } from "../engine/plan";
import { isLoadBeast } from "../engine/loadbeast";
import { allRuns, HUNT, isHunt } from "../engine/runs";
import type { AppState, BeastResult, Session } from "../types";
import { Seg } from "./common";
import { BeastCard } from "./SessionView";

type Update = (fn: (s: AppState) => AppState) => void;
const RUN = "jagd";

/** Ort für die Jagd: der heute eingeplante, sonst das erste Equipment-Profil */
function defaultProfile(state: AppState, today: string): string {
  return state.schedule[weekdayOf(today)] ?? state.equipment[0]?.id ?? "";
}

/** Neue Jagd anlegen; eine noch offene (ohne Zeit) wird ersetzt */
export function startHunt(update: Update, today: string, beastId: string): string {
  const id = `${HUNT}:${Date.now()}`;
  update((st) => {
    const s: Session = {
      id, date: today, blockId: HUNT, focusId: "", week: 0, role: HUNT, profileId: defaultProfile(st, today),
      entries: {}, drills: {}, menu: {}, beastRuns: { [RUN]: { beast: { id: beastId, seconds: null } } }, done: false,
    };
    return { ...st, sessions: [...st.sessions.filter((x) => !(isHunt(x) && !x.done)), s] };
  });
  return id;
}

const loadOf = (r: BeastResult) => ({ ...(r.kg != null ? { kg: r.kg } : {}), ...(r.band ? { band: r.band } : {}), ...(r.tech ? { tech: r.tech } : {}) });

export function Hunt({ state, update, today, id, onClose }: { state: AppState; update: Update; today: string; id: string; onClose: () => void }) {
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return null;
  const beastId = session.beastRuns?.[RUN]?.beast?.id ?? "";
  const beast = beastById(beastId);
  const profile = state.equipment.find((p) => p.id === session.profileId) ?? state.equipment[0];
  // Erste Zeit: Jagd ist erledigt und die Zeit steht in den Bestzeiten. Spätere Änderungen (Wieder aufnehmen, Technik) zieht die Bestienkarte selbst nach.
  const mut = (fn: (s: Session) => Session) => update((st) => {
    const cur = st.sessions.find((s) => s.id === id);
    if (!cur) return st;
    let next = fn(cur);
    let beastTimes = st.beastTimes;
    const timed = allRuns(next).filter((r) => r.seconds != null);
    if (!next.done && timed.length) {
      next = { ...next, done: true, date: today };
      beastTimes = { ...beastTimes };
      for (const r of timed) beastTimes[r.id] = [...(beastTimes[r.id] ?? []), { date: today, seconds: r.seconds!, ...loadOf(r) }];
    }
    return { ...st, beastTimes, sessions: st.sessions.map((s) => (s.id === id ? next : s)) };
  });
  // Verwerfen: Jagd und ihre Zeiten wieder entfernen
  const discard = () => {
    update((st) => {
      const cur = st.sessions.find((s) => s.id === id);
      const beastTimes = { ...st.beastTimes };
      if (cur?.done) for (const r of allRuns(cur)) if (r.seconds) beastTimes[r.id] = (beastTimes[r.id] ?? []).filter((t) => !(t.date === cur.date && t.seconds === r.seconds));
      return { ...st, beastTimes, sessions: st.sessions.filter((s) => s.id !== id) };
    });
    onClose();
  };
  const done = session.done;
  return (
    <div className="stack">
      <div className="card stack">
        <div className="row between">
          <h2>Freie Jagd</h2>
          <button className="btn ghost small" onClick={onClose}>← Bestiarium</button>
        </div>
        <div className="muted small">Außerhalb des Plans. Zählt für Bestzeit, Log und Flugblatt, nicht als Trainingseinheit.</div>
        {beast && isLoadBeast(beast) && state.equipment.length > 1 && !done && (
          <Seg value={session.profileId} options={state.equipment.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(pid) => update((st) => ({ ...st, sessions: st.sessions.map((s) => (s.id === id ? { ...s, profileId: pid } : s)) }))} />
        )}
      </div>
      {profile && <BeastCard blockId={RUN} beast={beast} ctx={{ state, update, profile }} session={session} mut={mut} watchBase={id} />}
      <div className="card stack">
        {done && <p className="note ok">Besiegt und eingetragen. Zu früh abgehakt? „Wieder aufnehmen“ lässt die Uhr weiterlaufen.</p>}
        <div className="row between">
          <button className="btn ghost" onClick={discard}>{done ? "Eintrag verwerfen" : "Abbrechen"}</button>
          {done && <button className="btn primary" onClick={onClose}>Fertig</button>}
        </div>
      </div>
    </div>
  );
}

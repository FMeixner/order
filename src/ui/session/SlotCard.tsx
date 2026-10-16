/* Satzkarte einer Übung: Dosis, Sätze, Rückmeldung, Tausch. */
import { createContext, useContext, useEffect, useState } from "react";
import { EXERCISES } from "../../data";
import { type Feedback, FEEDBACK_LABEL, type Session, type SessionEntry, type SetEntry } from "../../types";
import { snapDown, snapNearest } from "../../engine/loads";
import { daysBetween } from "../../engine/plan";
import { backoffLoad, sharedState, suggest, type Suggestion } from "../../engine/progression";
import { parseReps, type Resolved, swapKey, swapOptions } from "../../engine/resolve";
import { WARM_REST, warmupSets } from "../../engine/warmup";
import { fmt, useTimer } from "../Timer";
import { Desc, kg, Modal } from "../common";
import { type SessionCtx, skillSet } from "./ctx";

/** Übungen mit Aufwärmsätzen in dieser Einheit (Schlüssel → Anzahl) */
export const WarmCtx = createContext<Map<string, number>>(new Map());

const FB: Feedback[] = ["zuschwer", "schwer", "ok", "leicht", "sehrleicht"];


/** Übung für diese Stelle tauschen. Die Wahl gilt je Slot und Ort und bleibt bei Updates erhalten. */
function SwapDialog({ r, ctx, onClose }: { r: Resolved; ctx: SessionCtx; onClose: () => void }) {
  const opts = swapOptions(r, ctx.profile, skillSet(ctx.state));
  const key = swapKey(r.slotId, ctx.profile.id);
  const set = (name: string | null) => {
    ctx.update((st) => {
      const sw = { ...(st.swaps ?? {}) };
      if (name == null || name === r.original) delete sw[key]; else sw[key] = name;
      return { ...st, swaps: sw };
    });
    onClose();
  };
  const usable = opts.filter((o) => o.available);
  const missing = opts.filter((o) => !o.available);
  return (
    <Modal title="Übung tauschen" onClose={onClose}>
      <div className="stack">
        <p className="muted small">Gilt für diese Stelle im Orden, immer an diesem Ort ({ctx.profile.name}). Satz- und Wiederholungsvorgaben bleiben, das Gewicht führt die App für jede Übung getrennt.</p>
        {(r.swapped || r.swapUnavailable) && (
          <button className="btn wide" onClick={() => set(null)}>Zurück zum Original: {r.original}</button>
        )}
        {usable.length === 0 && <div className="muted small">Keine passende Alternative mit dem Equipment von „{ctx.profile.name}“.</div>}
        <div className="swap-list">
          {usable.map((o) => (
            <button key={o.name} className="swap-opt" onClick={() => set(o.name)}>
              <span>{o.name}</span>
              {EXERCISES[o.name]?.equip && <span className="muted small">{EQUIP_LABEL[EXERCISES[o.name].equip] ?? ""}</span>}
            </button>
          ))}
        </div>
        {missing.length > 0 && (
          <details className="small muted">
            <summary>Nicht im Profil „{ctx.profile.name}“ ({missing.length})</summary>
            <ul>{missing.map((o) => <li key={o.name}>{o.name}</li>)}</ul>
          </details>
        )}
      </div>
    </Modal>
  );
}

const EQUIP_LABEL: Record<string, string> = {
  barbell: "Langhantel", dumbbell: "Kurzhantel", kettlebell: "Kettlebell", cable: "Kabel", machine: "Maschine", plate: "Zusatzgewicht",
  vest: "Weste", band: "Band", bodyweight: "Körpergewicht", sandbag: "Sandsack",
};

export function SlotCard({ r, ctx, session, mut, onSetDone }: { r: Resolved; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; onSetDone: (lastSet: boolean) => void }) {
  const t = useTimer();
  const [swapOpen, setSwapOpen] = useState(false);
  const canSwap = r.kind === "strength" || r.kind === "hold";
  const st = sharedState(ctx.state.slots, r);
  const raw0: Suggestion = suggest(r, st, ctx.week, ctx.profile);
  // Ältere Stände zählten bei Wiederholungs-Progression vom Ziel statt vom Geschafften (2 × 20 → 16): hier nachziehen
  const lastEntry = [...ctx.state.sessions].filter((x) => x.done && x.entries[r.key]?.sets.some((y) => y.done)).sort((a, b) => b.date.localeCompare(a.date))[0]?.entries[r.key];
  const lastMin = lastEntry && r.prog === "reps" && lastEntry.sets.every((y) => y.done && y.reps != null) ? Math.min(...lastEntry.sets.map((y) => y.reps!)) : null;
  const raw: Suggestion = lastMin != null && raw0.targetReps != null && lastMin >= raw0.targetReps
    ? { ...raw0, targetReps: lastMin + (/schwer/.test(lastEntry!.feedback ?? "") ? 0 : 1), repsLabel: `${lastMin + (/schwer/.test(lastEntry!.feedback ?? "") ? 0 : 1)}${parseReps(r.reps).suffix}` }
    : raw0;
  // Nach längerer Pause (14 Tage und mehr an dieser Übung): 10 % leichter wieder einsteigen
  const pausedDays = st?.updated && /^\d{4}-/.test(st.updated) ? daysBetween(st.updated, ctx.date) : 0;
  const sug: Suggestion = pausedDays >= 14 && raw.weight != null && r.loadable
    ? { ...raw, weight: snapDown(ctx.profile, r.equip, raw.weight * 0.9), gap: `Nach ${pausedDays} Tagen Pause 10 % leichter. Danach geht es normal weiter.` }
    : raw;
  const entry: SessionEntry = session?.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
  const sets: SetEntry[] = Array.from({ length: r.kind === "timer" || r.kind === "interval" ? 1 : r.sets }, (_, i) => entry.sets[i] ?? { done: false });
  const desc = EXERCISES[sug.name]?.desc ?? EXERCISES[r.name]?.desc;
  const rp = parseReps(r.reps ?? "");
  const amrap = rp.amrap;
  const [more, setMore] = useState(false);
  /** Ein Gewicht pro Übung: das eingetragene, sonst der Vorschlag. Beim Top-Satz gilt es für Satz 1, die Back-off-Sätze rechnet die App. */
  const enteredW = entry.sets[0]?.weight ?? null;
  const baseW = enteredW ?? sug.weight;
  const topBack = r.prog === "topset" && baseW != null ? backoffLoad(ctx.profile, r, baseW) : null;
  const defaultWeight = (i: number) => (r.prog === "topset" && i > 0 ? topBack : baseW);

  const writeSet = (i: number, patch: Partial<SetEntry>) =>
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const arr = Array.from({ length: sets.length }, (_, k) => e.sets[k] ?? { done: false });
      arr[i] = { ...arr[i], ...patch };
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, stage: sug.stage, sets: arr } } };
    });

  /** Gewicht für alle Sätze setzen (Top-Satz: Satz 1, Back-off automatisch) */
  const setWeight = (w: number | null) =>
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const back = r.prog === "topset" && w != null ? backoffLoad(ctx.profile, r, w) : w;
      const arr = Array.from({ length: sets.length }, (_, k) => ({ ...(e.sets[k] ?? { done: false }), weight: k > 0 && r.prog === "topset" ? back : w }));
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, stage: sug.stage, sets: arr } } };
    });

  const markDone = (i: number) => {
    const cur = sets[i];
    if (cur.done) return writeSet(i, { done: false });
    // Antippen heißt: Ziel geschafft. Nur AMRAP braucht die Zahl; ohne Zahl springt der Fokus ins Feld
    if (amrap && cur.reps == null) { document.getElementById(`reps-${r.key}-${i}`)?.focus(); return; }
    writeSet(i, {
      done: true,
      reps: cur.reps ?? sug.targetReps ?? undefined,
      weight: r.loadable ? cur.weight ?? defaultWeight(i) : null,
    });
    // Nach dem letzten Satz einer Übung keine Pause
    onSetDone(sets.every((x, k) => k === i || x.done));
  };

  // Aufwärmsätze: abhaken wie ein Satz, danach 30 s bis zum ersten Arbeitssatz
  const warmN = useContext(WarmCtx).get(r.key) ?? 0;
  const warmSets = warmN ? warmupSets(r, baseW ?? null, ctx.profile, warmN) : [];
  const warmDone = entry.warm ?? [];
  const markWarm = (i: number) => {
    const was = !!warmDone[i];
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const w = Array.from({ length: warmSets.length }, (_, k) => !!e.warm?.[k]);
      w[i] = !was;
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, warm: w } } };
    });
    if (!was) t.rest(i < warmSets.length - 1 ? "Pause, dann nächster Aufwärmsatz" : `Gleich: ${sug.name}, Satz 1`, WARM_REST);
  };

  // Rückmeldung: „Zu schwer“ fragt die Zahl im letzten Satz, „Sehr leicht“ die Zahl je Satz (vorbelegt mit Ziel + 2).
  // Alle anderen: die abgehakten Sätze zählen mit dem Ziel.
  const target = sug.targetReps;
  const askable = r.kind === "strength" && r.prog !== "none" && !amrap && target != null;
  const setFb = (fb: Feedback) => mut((s) => {
    const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
    const next = e.feedback === fb ? undefined : fb;
    let arr = e.sets;
    if (askable) {
      const reps = next === "sehrleicht" ? target! + 2 : target!;
      arr = e.sets.map((x) => (x.done ? { ...x, reps } : x));
    }
    return { ...s, entries: { ...s.entries, [r.key]: { ...e, feedback: next, sets: arr } } };
  });
  const doneIdx = sets.map((x, i) => (x.done ? i : -1)).filter((i) => i >= 0);
  const lastIdx = doneIdx[doneIdx.length - 1];
  const askReps = askable && lastIdx != null && (entry.feedback === "zuschwer" || entry.feedback === "sehrleicht");
  const askValue = lastIdx != null ? sets[lastIdx].reps : undefined;
  const writeAsked = (v: number | undefined) => mut((s) => {
    const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
    const arr = e.sets.map((x, k) => (!x.done ? x : e.feedback === "zuschwer" ? (k === lastIdx ? { ...x, reps: v } : x) : { ...x, reps: v }));
    return { ...s, entries: { ...s.entries, [r.key]: { ...e, sets: arr } } };
  });

  const last = [...ctx.state.sessions].filter((x) => x.done && x.id !== session?.id && x.entries[r.key]?.sets.some((y) => y.done)).sort((a, b) => b.date.localeCompare(a.date))[0]?.entries[r.key];
  // Zuletzt: „3 × 12“ bei gleichen Sätzen, sonst „12/11/10“; Gewicht nur, wenn es vom heutigen abweicht
  const lastDone = last?.sets.filter((y) => y.done) ?? [];
  const lastW = lastDone.find((y) => y.weight != null)?.weight;
  const lastReps = lastDone.map((y) => y.reps ?? "?");
  const lastLine = last && r.kind === "strength" && lastDone.length
    ? (lastReps.every((x) => x === lastReps[0]) ? `${lastReps.length} × ${lastReps[0]}` : lastReps.join("/")) + (lastW != null && lastW !== sug.weight ? ` mit ${kg(lastW)}` : "")
    : null;
  // Konkrete Vorgabe statt des Bereichs: „3 × 13 · 10 kg“. Der Bereich steht in den Details.
  const concrete = r.kind === "strength" && r.prog !== "none" && !rp.amrap && sug.targetReps != null;
  const doseLabel =
    r.kind === "timer" ? `${sug.minutes} Min`
    : r.kind === "interval" && r.interval ? `${r.interval.rounds} × ${fmt(r.interval.work)} Arbeit, ${fmt(r.interval.rest)} Pause`
    : r.kind === "hold" ? `${r.sets} × ${sug.seconds} s`
    : concrete ? `${r.sets} × ${sug.targetReps}${rp.suffix}${r.loadable && sug.weight != null ? ` · ${kg(sug.weight)}` : ""}`
    : `${r.sets} × ${sug.repsLabel}`;
  const showFb = r.prog !== "none" && (sets.some((x) => x.done) || !!entry.feedback || !!session?.done);
  // Vorausschau („→ bis 3 × 12, dann 27,5 kg“) gehört in die Details; Hinweise zum Heute (Pause, Dreimal OK) bleiben sichtbar
  const detailGap = sug.gap?.startsWith("→") ? sug.gap : undefined;

  // Fertig: alle Sätze abgehakt, Rückmeldung gegeben (bei „Zu schwer“ auch die Zahl). Dann klappt die Übung nach kurzer Zeit ein.
  const needsFb = r.prog !== "none";
  const missedOpen = entry.feedback === "zuschwer" && askable && (askValue == null || askValue >= (target ?? 0));
  const complete = sets.every((x) => x.done) && (!needsFb || !!entry.feedback) && !missedOpen;
  const [folded, setFolded] = useState<boolean>(complete);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!complete) { setFolded(false); return; }
    if (typing || folded) return;
    const id = setTimeout(() => setFolded(true), 2500);
    return () => clearTimeout(id);
  }, [complete, typing, entry.feedback, askValue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (folded && complete) {
    return (
      <button className="slot slot-done" onClick={() => setFolded(false)} aria-label={`${sug.name} erledigt, aufklappen`}>
        <span className="slot-done-check" aria-hidden>✓</span>
        <span className="slot-name">{sug.name}</span>
        <span className="muted small">{entry.feedback ? FEEDBACK_LABEL[entry.feedback] : ""}</span>
      </button>
    );
  }

  return (
    <div className="slot">
      <div className="slot-head">
        <div className="slot-title">
          <span className="slot-name">{sug.name}</span>
          {r.ladder && <span className="tag">Stufe {sug.stage + 1}/{r.ladder.length}</span>}
          {r.proposal && <span className="tag">Vorschlag</span>}
          {r.guided && <span className="tag teal" title="Phase mit hoher Alltagslast">geführt</span>}
          {r.swapped && <span className="tag amber" title={`statt ${r.original}`}>getauscht</span>}
          {r.regressedFrom && <span className="tag" title={`statt ${r.regressedFrom}: Skill noch nicht abgehakt`}>leichter</span>}
        </div>
        <div className="slot-icons">
          <Desc text={desc} />
          {canSwap && <button className="info-btn swap-btn" onClick={() => setSwapOpen(true)} aria-label="Übung tauschen" title="Übung tauschen">⇄</button>}
        </div>
      </div>
      <button className="slot-dose" onClick={() => setMore((o) => !o)} aria-expanded={more} title="Details">
        {concrete ? <strong>{doseLabel}</strong> : doseLabel}
        {(lastLine || concrete || detailGap || r.why) && <span className="muted small"> {more ? "▴" : "▾"}</span>}
      </button>
      {more && (
        <div className="muted small slot-more">
          {concrete && <div>Bereich {r.reps}{r.prog === "double" && r.loadable ? ", oben angekommen steigt das Gewicht" : ""}</div>}
          {lastLine && <div>Zuletzt {lastLine}</div>}
          {detailGap && <div>{detailGap}</div>}
          {r.why?.map((w) => <div key={w}>{w}</div>)}
        </div>
      )}
      {warmSets.length > 0 && (
        <div className="muted small">Satz 0 aufwärmen: {warmSets.map((w) => `${w.reps} × ${w.kg != null ? kg(w.kg) : "leicht"}`).join(", dann ")}{warmSets.every((w) => w.kg == null) ? " (halbes Gewicht)" : ""}</div>
      )}
      {swapOpen && <SwapDialog r={r} ctx={ctx} onClose={() => setSwapOpen(false)} />}
      {r.swapped && <div className="muted small">Statt {r.original}.</div>}
      {r.regressedFrom && <div className="muted small">Statt {r.regressedFrom}, bis der Skill sitzt (Setup › Können).</div>}
      {r.swapUnavailable && <div className="muted small">Dein Tausch „{r.swapUnavailable}“ geht mit „{ctx.profile.name}“ nicht, heute deshalb das Original.</div>}
      {r.missingEquipment && <div className="note warn small">Für diese Übung fehlt im Profil „{ctx.profile.name}“ Equipment. Nimm eine passende Alternative.</div>}
      {r.note && <div className="muted small">{r.note}</div>}
      {sug.gap && !detailGap && <div className="gap-note small">{sug.gap}</div>}
      {r.kind === "strength" && (
        <div className="sets">
          {r.loadable && (
            <div className="kg-line">
              <input type="number" inputMode="decimal" className="kg-in" placeholder={sug.weight != null ? String(sug.weight) : "kg"}
                value={enteredW ?? ""} onChange={(e) => setWeight(e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                onBlur={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v)) setWeight(snapNearest(ctx.profile, r.equip, v)); }}
                aria-label="Gewicht" />
              <span className="muted small">kg{r.equip === "plate" ? " Zusatzlast (Weste oder Gürtel)" : ""}{r.prog === "topset" && topBack != null ? ` Top-Satz, danach ${kg(topBack)}` : ""}</span>
            </div>
          )}
          <div className="set-pills">
            {warmSets.map((_w, i) => (
              <button key={`w${i}`} className={`set-btn warm0 ${warmDone[i] ? "done" : ""}`} onClick={() => markWarm(i)} aria-label={`Aufwärmsatz ${i + 1}`}>{warmDone[i] ? "✓" : "0"}</button>
            ))}
            {sets.map((s, i) => (amrap ? (
              <div key={i} className={`set-pill ${s.done ? "done" : ""}`}>
                <button className={`set-btn ${s.done ? "done" : ""}`} onClick={() => markDone(i)} aria-label={`Satz ${i + 1}`}>{s.done ? "✓" : i + 1}</button>
                <input id={`reps-${r.key}-${i}`} type="number" inputMode="numeric" className="reps-in" placeholder="Wdh"
                  value={s.reps ?? ""} onChange={(e) => writeSet(i, { reps: e.target.value === "" ? undefined : parseInt(e.target.value) })} aria-label={`Wiederholungen Satz ${i + 1}`} />
              </div>
            ) : (
              <button key={i} className={`set-btn ${s.done ? "done" : ""}`} onClick={() => markDone(i)} aria-label={`Satz ${i + 1}`}>{s.done ? "✓" : i + 1}</button>
            )))}
          </div>
        </div>
      )}

      {r.kind === "hold" && (
        <div className="drill-group">
          {sets.map((s, i) => (
            <button key={i} className={`set-btn ${s.done ? "done" : ""}`} onClick={() => {
              if (s.done) return writeSet(i, { done: false });
              t.countdown(sug.name, sug.seconds ?? 20, () => { writeSet(i, { done: true, seconds: sug.seconds ?? 20 }); });
            }}>{s.done ? "✓" : fmt(sug.seconds ?? 20)}</button>
          ))}
        </div>
      )}

      {r.kind === "timer" && (
        <div className="row">
          <button className={`btn ${sets[0].done ? "ghost" : "primary"}`} onClick={() => t.countdown(sug.name, (sug.minutes ?? 10) * 60, () => writeSet(0, { done: true, seconds: (sug.minutes ?? 10) * 60 }))}>▶ {sug.minutes} Min starten</button>
          <button className={`set-btn ${sets[0].done ? "done" : ""}`} onClick={() => writeSet(0, { done: !sets[0].done })} aria-label="Erledigt">{sets[0].done ? "✓" : "○"}</button>
        </div>
      )}

      {r.kind === "interval" && r.interval && (
        <div className="row">
          <button className={`btn ${sets[0].done ? "ghost" : "primary"}`} onClick={() => t.interval(sug.name, r.interval!.work, r.interval!.rest, r.interval!.rounds, () => writeSet(0, { done: true }))}>▶ Intervalle starten</button>
          <button className={`set-btn ${sets[0].done ? "done" : ""}`} onClick={() => writeSet(0, { done: !sets[0].done })} aria-label="Erledigt">{sets[0].done ? "✓" : "○"}</button>
        </div>
      )}

      {showFb && (
        <div className="fb">
          {FB.map((f) => <button key={f} className={entry.feedback === f ? "on" : ""} onClick={() => setFb(f)}>{FEEDBACK_LABEL[f]}</button>)}
        </div>
      )}
      {askReps && (
        <label className="row ask-reps small">
          <span>{entry.feedback === "zuschwer" ? "Wie viele im letzten Satz?" : "Wie viele je Satz?"}</span>
          <input type="number" inputMode="numeric" className="reps-in" value={askValue ?? ""} autoFocus={entry.feedback === "zuschwer"} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
            onChange={(e) => writeAsked(e.target.value === "" ? undefined : parseInt(e.target.value))} aria-label="Geschaffte Wiederholungen" />
        </label>
      )}
    </div>
  );
}

/* ---------- Bestie ---------- */

import { useState } from "react";
import { TESTWEEK } from "../data";
import type { AppState, PlanBlock } from "../types";

type Update = (fn: (s: AppState) => AppState) => void;

/** WHO-5 (1.37): alle zwei Wochen am Ende der Trainingswoche, nach der letzten Einheit. Fünf Fragen zu den letzten zwei Wochen. */
export function Who5({ update, block, week, today }: { update: Update; block: PlanBlock; week: number; today: string }) {
  const [a, setA] = useState<(number | null)[]>([null, null, null, null, null]);
  const complete = a.every((x) => x != null);
  const score = complete ? (a as number[]).reduce((s, x) => s + x, 0) * 4 : null;
  return (
    <section className="card stack who5">
      <div className="row between"><strong>Wohlbefinden</strong><span className="muted small">alle zwei Wochen · WHO-5</span></div>
      <div className="muted small">{TESTWEEK.who5_intro} …</div>
      {TESTWEEK.who5.map((q, i) => (
        <div key={i} className="who5-q">
          <div className="small">{q}</div>
          <select value={a[i] ?? ""} onChange={(e) => setA(a.map((x, k) => (k === i ? (e.target.value === "" ? null : parseInt(e.target.value)) : x)))}>
            <option value="">–</option>
            {TESTWEEK.who5_scale.map((l, v) => <option key={v} value={v}>{v} · {l}</option>)}
          </select>
        </div>
      ))}
      <div className="row wrap">
        <button className="btn small" disabled={!complete} onClick={() => update((st) => ({ ...st, who5: [...st.who5, { date: today, blockId: block.id, week, score: score! }] }))}>Speichern</button>
        <button className="btn ghost small" onClick={() => update((st) => ({ ...st, who5: [...st.who5, { date: today, blockId: block.id, week, score: -1 }] }))}>Diesmal nicht</button>
      </div>
      <div className="muted small">Werte unter 52 von 100 gelten als Hinweis auf eingeschränktes Wohlbefinden; dann lohnt sich ein Gespräch mit der Hausärztin oder dem Hausarzt.</div>
    </section>
  );
}

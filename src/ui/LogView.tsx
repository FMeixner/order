import { allRuns, isHunt } from "../engine/runs";
import { useState } from "react";
import { FOCUS_BY_ID, TESTWEEK } from "../data";
import { beastById, fmtDate } from "../engine/plan";
import type { AppState, Session } from "../types";
import { Collapse, kg } from "./common";
import { Evaluation } from "./Evaluation";
import { ProgressView, VolumeView } from "./Progress";
import { fmt } from "./Timer";
import { RavenChronicle, ravenOn } from "./Raven";

function sessionText(s: Session, state: AppState): string {
  const f = FOCUS_BY_ID[s.focusId];
  const lines = [isHunt(s) ? `## ${fmtDate(s.date)} · Freie Jagd` : `## ${fmtDate(s.date)} · ${f?.name ?? s.focusId} · ${f?.roles[s.role]?.name ?? s.role} (Woche ${s.week})`];
  for (const e of Object.values(s.entries)) {
    const done = e.sets.filter((x) => x.done);
    if (!done.length) continue;
    const sets = done.map((x) => (x.seconds ? `${x.seconds}s` : `${x.reps ?? "?"}${x.weight != null ? `×${String(x.weight).replace(".", ",")}kg` : ""}`)).join(", ");
    lines.push(`- ${e.name}: ${sets}${e.feedback ? ` (${e.feedback})` : ""}`);
  }
  for (const r of allRuns(s)) if (r.seconds) lines.push(`- Bestie ${beastById(r.id)?.name}: ${fmt(r.seconds)}${r.kg != null ? ` (${String(r.kg).replace(".", ",")} kg)` : r.band ? ` (Band ${r.band})` : ""}`);
  if (s.note) lines.push(`- Notiz: ${s.note}`);
  void state;
  return lines.join("\n");
}

export function LogView({ state, today }: { state: AppState; today: string }) {
  const [copied, setCopied] = useState(false);
  const done = state.sessions.filter((s) => s.done).sort((a, b) => b.date.localeCompare(a.date));
  const allTests = TESTWEEK.cups.flatMap((c) => c.tests);
  const copy = async () => {
    const text = `# Order-Log\n\n${done.map((s) => sessionText(s, state)).join("\n\n")}\n`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignorieren */ }
  };
  const lastTest = Object.values(state.tests).flat().sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted">{done.length} abgeschlossene Einheiten</span>
        <button className="btn ghost small" onClick={copy}>{copied ? "Kopiert" : "Als Text kopieren"}</button>
      </div>
      {done.length === 0 && <div className="card muted">Noch nichts abgeschlossen.</div>}
      {ravenOn(state) && <RavenChronicle state={state} today={today} />}
      <VolumeView state={state} today={today} />
      <ProgressView state={state} />
      {done.slice(0, 60).map((s) => {
        const f = FOCUS_BY_ID[s.focusId];
        const entries = Object.values(s.entries).filter((e) => e.sets.some((x) => x.done));
        return (
          <Collapse key={s.id} title={`${fmtDate(s.date)} · ${isHunt(s) ? "Freie Jagd" : f?.roles[s.role]?.name ?? s.role}`} meta={isHunt(s) ? "außerhalb des Plans" : `${f?.name ?? ""} · W${s.week}`}>
            <ul className="slot-list">
              {entries.map((e) => (
                <li key={e.key}>
                  <strong>{e.name}</strong>: {e.sets.filter((x) => x.done).map((x) => (x.seconds ? `${x.seconds} s` : `${x.reps ?? "?"}${x.weight != null ? ` × ${kg(x.weight)}` : ""}`)).join(" · ")}
                  {e.feedback && <span className="muted"> ({e.feedback})</span>}
                </li>
              ))}

              {allRuns(s).filter((r) => r.seconds).map((r, i) => <li key={`bp${i}`}><strong>{beastById(r.id)?.name}</strong>: {fmt(r.seconds!)}{r.kg != null ? ` · ${kg(r.kg)}` : r.band ? ` · Band ${r.band}` : ""}</li>)}
            </ul>
            {s.note && <p className="muted small">{s.note}</p>}
          </Collapse>
        );
      })}
      {lastTest && <Evaluation state={state} blockId={lastTest.blockId} />}
      {Object.keys(state.tests).length > 0 && (
        <Collapse title="Testergebnisse" meta={`${Object.keys(state.tests).length} Tests`}>
          <ul className="slot-list">
            {allTests.filter((t) => state.tests[t.id]?.length).map((t) => (
              <li key={t.id}>{t.name}: {state.tests[t.id].map((r) => `${fmtDate(r.date)} ${r.raw}${r.variant ? ` (${t.variants?.find((v) => v.id === r.variant)?.name ?? r.variant})` : ""}`).join(" · ")}</li>
            ))}
            {state.who5.map((w, i) => <li key={i}>WHO-5 {fmtDate(w.date)}: {w.score}</li>)}
          </ul>
        </Collapse>
      )}
    </div>
  );
}

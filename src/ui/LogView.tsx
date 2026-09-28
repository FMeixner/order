import { useState } from "react";
import { BEAST_BY_ID, FOCUS_BY_ID, TESTWEEK } from "../data";
import { fmtDate } from "../engine/plan";
import type { AppState, Session } from "../types";
import { Collapse, kg } from "./common";
import { fmt } from "./Timer";

function sessionText(s: Session, state: AppState): string {
  const f = FOCUS_BY_ID[s.focusId];
  const lines = [`## ${fmtDate(s.date)} · ${f?.name ?? s.focusId} · ${f?.roles[s.role]?.name ?? s.role} (Woche ${s.week})`];
  for (const e of Object.values(s.entries)) {
    const done = e.sets.filter((x) => x.done);
    if (!done.length) continue;
    const sets = done.map((x) => (x.seconds ? `${x.seconds}s` : `${x.reps ?? "?"}${x.weight != null ? `×${String(x.weight).replace(".", ",")}kg` : ""}`)).join(", ");
    lines.push(`- ${e.name}: ${sets}${e.feedback ? ` (${e.feedback})` : ""}`);
  }
  if (s.beast?.seconds) lines.push(`- Bestie ${BEAST_BY_ID[s.beast.id]?.name}: ${fmt(s.beast.seconds)}`);
  if (s.note) lines.push(`- Notiz: ${s.note}`);
  void state;
  return lines.join("\n");
}

export function LogView({ state }: { state: AppState }) {
  const [copied, setCopied] = useState(false);
  const done = state.sessions.filter((s) => s.done).sort((a, b) => b.date.localeCompare(a.date));
  const allTests = TESTWEEK.cups.flatMap((c) => c.tests);
  const copy = async () => {
    const text = `# Order-Log\n\n${done.map((s) => sessionText(s, state)).join("\n\n")}\n`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignorieren */ }
  };
  const beasts = Object.entries(state.beastTimes).filter(([, t]) => t.length);
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted">{done.length} abgeschlossene Einheiten</span>
        <button className="btn ghost small" onClick={copy}>{copied ? "Kopiert" : "Als Text kopieren"}</button>
      </div>
      {done.length === 0 && <div className="card muted">Noch nichts abgeschlossen.</div>}
      {done.slice(0, 60).map((s) => {
        const f = FOCUS_BY_ID[s.focusId];
        const entries = Object.values(s.entries).filter((e) => e.sets.some((x) => x.done));
        return (
          <Collapse key={s.id} title={`${fmtDate(s.date)} · ${f?.roles[s.role]?.name ?? s.role}`} meta={`${f?.name ?? ""} · W${s.week}`}>
            <ul className="slot-list">
              {entries.map((e) => (
                <li key={e.key}>
                  <strong>{e.name}</strong>: {e.sets.filter((x) => x.done).map((x) => (x.seconds ? `${x.seconds} s` : `${x.reps ?? "?"}${x.weight != null ? ` × ${kg(x.weight)}` : ""}`)).join(" · ")}
                  {e.feedback && <span className="muted"> ({e.feedback})</span>}
                </li>
              ))}
              {s.beast?.seconds ? <li><strong>{BEAST_BY_ID[s.beast.id]?.name}</strong>: {fmt(s.beast.seconds)}</li> : null}
            </ul>
            {s.note && <p className="muted small">{s.note}</p>}
          </Collapse>
        );
      })}
      {beasts.length > 0 && (
        <Collapse title="Bestiarium: Bestzeiten" meta={`${beasts.length} Bestien`}>
          <ul className="slot-list">
            {beasts.map(([id, t]) => <li key={id}>{BEAST_BY_ID[id]?.name ?? id}: {fmt(Math.min(...t.map((x) => x.seconds)))} ({t.length}×)</li>)}
          </ul>
        </Collapse>
      )}
      {Object.keys(state.tests).length > 0 && (
        <Collapse title="Testergebnisse" meta={`${Object.keys(state.tests).length} Tests`}>
          <ul className="slot-list">
            {allTests.filter((t) => state.tests[t.id]?.length).map((t) => (
              <li key={t.id}>{t.name}: {state.tests[t.id].map((r) => `${fmtDate(r.date)} ${r.raw}`).join(" · ")}</li>
            ))}
            {state.who5.map((w, i) => <li key={i}>WHO-5 {fmtDate(w.date)}: {w.score}</li>)}
          </ul>
        </Collapse>
      )}
    </div>
  );
}

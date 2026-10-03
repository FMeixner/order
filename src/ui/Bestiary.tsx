/* Bestiarium: alle Bestien mit Bestzeiten, filterbar nach Familie und Stand. */
import { useMemo, useState } from "react";
import { BEASTS, SKILLS } from "../data";
import { beastActive, beastClass, beastFamily, beastMinutes, beastNeeds, beastRegion, CLASS_LABEL, fmtDate, type BeastNeed } from "../engine/plan";
import { beastOk, beastSkills } from "../engine/skills";
import type { AppState, Beast } from "../types";
import { Collapse, Seg } from "./common";
import { fmt } from "./Timer";

const NEED_LABEL: Record<BeastNeed, string> = {
  rings: "Ringe", bar: "Stange", band: "Band", band_or_cable: "Band oder Kabel", barbell: "Langhantel", kb_db: "Hantel", rower: "Rudergerät", bike: "Rad",
};

type Stand = "alle" | "bezwungen" | "offen";

/** Zeiten einer Bestie, getrennt nach Form: Basis, verhext, ×2, ×3 */
function timesOf(b: Beast, all: AppState["beastTimes"]) {
  return Object.entries(all)
    .filter(([id, t]) => t.length && beastFamily(id).length === 1 && beastFamily(id)[0] === b.id)
    .map(([id, t]) => {
      const label = id.includes("~hex") ? "verhext" : id.match(/×(\d)$/) ? `×${id.match(/×(\d)$/)![1]}` : "Basis";
      const best = t.reduce((m, x) => (x.seconds < m.seconds ? x : m), t[0]);
      return { id, label, best, n: t.length, last: [...t].sort((a, c) => c.date.localeCompare(a.date))[0] };
    })
    .sort((a, c) => (a.label === "Basis" ? -1 : c.label === "Basis" ? 1 : a.label.localeCompare(c.label)));
}

export function Bestiary({ state }: { state: AppState }) {
  const [stand, setStand] = useState<Stand>("alle");
  const [q, setQ] = useState("");
  const skills = state.user.skills ? new Set(state.user.skills) : null;
  const skillName = (id: string) => SKILLS.skills.find((x) => x.id === id)?.name ?? id;

  const rows = useMemo(() => BEASTS.filter(beastActive).map((b) => ({ b, times: timesOf(b, state.beastTimes), region: beastRegion(b) })), [state.beastTimes]);
  const beaten = rows.filter((r) => r.times.length).length;
  const shown = rows
    .filter((r) => stand === "alle" || (stand === "bezwungen") === r.times.length > 0)
    .filter((r) => !q.trim() || `${r.b.name} ${r.b.orig} ${r.b.work}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, c) => (c.times.length > 0 ? 1 : 0) - (a.times.length > 0 ? 1 : 0) || a.b.name.localeCompare(c.b.name, "de"));

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row between">
          <h2>Bestiarium</h2>
          <span className="muted small">{beaten} von {rows.length} bezwungen</span>
        </div>
        <span className="muted small">Nordbestien. Die Morgenland-Bestien mit Last sind vorerst ausgeblendet.</span>
        <Seg value={stand} options={[{ value: "alle", label: "Alle" }, { value: "bezwungen", label: "Bezwungen" }, { value: "offen", label: "Offen" }]} onChange={setStand} />
        <input type="search" placeholder="Suchen: Name oder Übung" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {shown.length === 0 && <div className="card muted">Keine Bestie passt zum Filter.</div>}
      {shown.map(({ b, times, region: r }) => {
        const base = times.find((t) => t.label === "Basis");
        const { min, measured } = beastMinutes(b, state.beastTimes[b.id]);
        const needs = [...beastNeeds(b)].map((n) => NEED_LABEL[n]);
        const missing = beastSkills(b).filter((id) => skills && !skills.has(id));
        const meta = base ? `${fmt(base.best.seconds)} · ${base.n}×` : times.length ? `${times[0].label} ${fmt(times[0].best.seconds)}` : "offen";
        return (
          <Collapse key={b.id} title={b.name} meta={meta} tone={times.length ? "teal" : undefined}>
            <div className="stack">
              <div className="muted small">
                {r === "sued" ? "Morgenland" : "Nord"} · {CLASS_LABEL[beastClass(min)]} · {measured ? "" : "etwa "}{Math.round(min)} Min · {b.rounds} {b.rounds === 1 ? "Runde" : "Runden"}
                {needs.length ? ` · ${needs.join(", ")}` : " · nur Körpergewicht"}
              </div>
              <ul className="beast-work">{b.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
              {b.hex && (
                <div className="stack">
                  <span className="muted small">Hexed (leichter, etwa gleich lang):</span>
                  <ul className="beast-work muted">{b.hex.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {!beastOk(b, skills) && <div className="note warn small">Kommt noch nicht dran, es fehlt: {missing.map(skillName).join(", ")}.</div>}
              {times.length > 0 && (
                <table className="pr-table small">
                  <thead><tr><th>Form</th><th>Bestzeit</th><th>am</th><th>zuletzt</th><th>Läufe</th></tr></thead>
                  <tbody>
                    {times.map((t) => (
                      <tr key={t.id}>
                        <td>{t.label}</td>
                        <td><strong>{fmt(t.best.seconds)}</strong></td>
                        <td>{fmtDate(t.best.date)}</td>
                        <td>{fmt(t.last.seconds)}</td>
                        <td>{t.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Collapse>
        );
      })}
    </div>
  );
}

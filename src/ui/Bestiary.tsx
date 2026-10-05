/* Bestiarium: alle Bestien mit Bestzeiten, filterbar nach Familie und Stand. */
import { useMemo, useState } from "react";
import { BEASTS, SKILLS } from "../data";
import { beastById, beastClass, beastFamily, beastMinutes, beastNeeds, beastRegion, CLASS_LABEL, fmtDate, type BeastNeed } from "../engine/plan";
import { beastOk, beastSkills, hexFor } from "../engine/skills";
import { capOf, isLoadBeast, LOAD_LABEL, loadKind, loadRecord } from "../engine/loadbeast";
import type { AppState, Beast } from "../types";
import { Collapse, kg, Seg } from "./common";
import { fmt } from "./Timer";

const NEED_LABEL: Record<BeastNeed, string> = {
  rings: "Ringe", bar: "Stange", band: "Band", band_or_cable: "Band oder Kabel", barbell: "Langhantel", kb_db: "Hantel", rower: "Rudergerät", bike: "Rad",
};

type Stand = "alle" | "bezwungen" | "offen";

/** Zeiten einer Bestie, getrennt nach Form: entfesselt, mutiert, ×2, ×3 */
function timesOf(b: Beast, all: AppState["beastTimes"]) {
  return Object.entries(all)
    .filter(([id, t]) => t.length && beastFamily(id).length === 1 && beastFamily(id)[0] === b.id)
    .map(([id, t]) => {
      const r = id.match(/~r(\d+)/)?.[1], x = id.match(/×(\d)$/)?.[1];
      const label = [id.includes("~hex") ? "mutiert" : "", x ? `×${x}` : "", r ? `${r}/${b.rounds} Runden` : ""].filter(Boolean).join(", ") || "entfesselt";
      const best = t.reduce((m, x) => (x.seconds < m.seconds ? x : m), t[0]);
      return { id, label, best, n: t.length, last: [...t].sort((a, c) => c.date.localeCompare(a.date))[0] };
    })
    .sort((a, c) => (a.label === "entfesselt" ? -1 : c.label === "entfesselt" ? 1 : a.label.localeCompare(c.label)));
}

export function Bestiary({ state, onHunt }: { state: AppState; onHunt: (beastId: string) => void }) {
  const [stand, setStand] = useState<Stand>("alle");
  const [region, setRegion] = useState<"alle" | "nord" | "sued">("alle");
  const [q, setQ] = useState("");
  const skills = state.user.skills ? new Set(state.user.skills) : null;
  const skillName = (id: string) => SKILLS.skills.find((x) => x.id === id)?.name ?? id;

  const rows = useMemo(() => BEASTS.map((b) => ({ b, times: timesOf(b, state.beastTimes), region: beastRegion(b) })), [state.beastTimes]);
  const beaten = rows.filter((r) => r.times.length).length;
  const shown = rows
    .filter((r) => region === "alle" || r.region === region)
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
        <Seg value={region} options={[{ value: "alle", label: "Alle" }, { value: "nord", label: "Nord" }, { value: "sued", label: "Morgenland" }]} onChange={setRegion} />
        <Seg value={stand} options={[{ value: "alle", label: "Alle" }, { value: "bezwungen", label: "Bezwungen" }, { value: "offen", label: "Offen" }]} onChange={setStand} />
        <input type="search" placeholder="Suchen: Name oder Übung" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {shown.length === 0 && <div className="card muted">Keine Bestie passt zum Filter.</div>}
      {shown.map(({ b, times, region: r }) => {
        const base = times.find((t) => t.label === "entfesselt");
        const { min, measured } = beastMinutes(b, state.beastTimes[b.id]);
        const needs = [...beastNeeds(b)].map((n) => NEED_LABEL[n]);
        const missing = beastSkills(b).filter((id) => skills && !skills.has(id));
        const hx = missing.length ? hexFor(b, skills) : null;
        const load = isLoadBeast(b);
        const rec = load ? loadRecord(b, state.beastTimes[b.id]) : null;
        const recText = (t: { kg?: number; band?: string } | null) => (t ? (t.kg != null ? kg(t.kg) : t.band ?? "–") : "–");
        const meta = load ? (rec ? `Rekord ${recText(rec)}` : "offen") : base ? `${fmt(base.best.seconds)} · ${base.n}×` : times.length ? `${times[0].label} ${fmt(times[0].best.seconds)}` : "offen";
        return (
          <Collapse key={b.id} title={b.name} meta={meta} tone={times.length ? "teal" : undefined}>
            <div className="stack">
              <div className="muted small">
                {load
                  ? `Morgenland · ${LOAD_LABEL[loadKind(b)!] ?? "Last"} · Timecap ${capOf(b)} Min · ${b.rounds} ${b.rounds === 1 ? "Runde" : "Runden"}`
                  : `${r === "sued" ? "Morgenland" : "Nord"} · ${CLASS_LABEL[beastClass(min)]} · ${measured ? "" : "etwa "}${Math.round(min)} Min · ${b.rounds} ${b.rounds === 1 ? "Runde" : "Runden"}`}
                {needs.length ? ` · ${needs.join(", ")}` : " · nur Körpergewicht"}
              </div>
              <ul className="beast-work">{b.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
              <div className="row wrap">
                <button className="btn primary small" onClick={() => onHunt(b.id)}>Jagen{beastSkills(b).length ? ": entfesselt" : ""}</button>
                {beastSkills(b).length > 0 && beastById(`${b.id}~hex`) && <button className="btn ghost small" onClick={() => onHunt(`${b.id}~hex`)}>Jagen: mutiert</button>}
              </div>
              {!beastOk(b, skills) && (hx ? (
                <div className="stack">
                  <div className="note small">Kommt mutiert, weil {missing.map(skillName).join(", ")} noch nicht angekreuzt ist:</div>
                  <ul className="beast-work">{hx.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              ) : <div className="note warn small">Kommt noch nicht dran, es fehlt: {missing.map(skillName).join(", ")}.</div>)}
              {load && times.length > 0 && (
                <table className="pr-table small">
                  <thead><tr><th>Form</th><th>Rekord im Timecap</th><th>zuletzt</th><th>Läufe</th></tr></thead>
                  <tbody>
                    {times.map((t) => {
                      const all = state.beastTimes[t.id] ?? [];
                      const last = [...all].sort((a, c) => c.date.localeCompare(a.date))[0];
                      return (
                        <tr key={t.id}>
                          <td>{t.label}</td>
                          <td><strong>{recText(loadRecord(beastById(t.id) ?? b, all))}</strong></td>
                          <td>{recText(last)} · {fmt(last.seconds)}</td>
                          <td>{t.n}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!load && times.length > 0 && (
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

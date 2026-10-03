/* Übungsbibliothek: jede Übung mit Ausrüstung, Beschreibung, aktuellem Arbeitsgewicht, 1RM (selbst eingetragen oder geschätzt) und Verlauf. */
import { useMemo, useState } from "react";
import { EXERCISES } from "../data";
import { epley, oneRM } from "../engine/loadbeast";
import { fmtDate } from "../engine/plan";
import type { AppState } from "../types";
import { Collapse, kg, Seg } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;
const EQUIP: Record<string, string> = {
  barbell: "Langhantel", dumbbell: "Kurzhantel", kettlebell: "Kettlebell", cable: "Kabel", machine: "Maschine", band: "Band",
  bodyweight: "Körpergewicht", bar: "Stange", rings: "Ringe", vest: "Weste", sandbag: "Sandsack", medball: "Medizinball", none: "ohne",
};
const LOADED = new Set(["barbell", "dumbbell", "kettlebell", "cable", "machine", "vest", "sandbag"]);

export function ExerciseLibrary({ state, update, today }: { state: AppState; update: Update; today: string }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"alle" | "mit">("mit");
  // Verlauf je Übung aus dem Log
  const hist = useMemo(() => {
    const m = new Map<string, { date: string; sets: { reps?: number; weight?: number | null; seconds?: number }[] }[]>();
    for (const s of [...state.sessions].filter((x) => x.done).sort((a, b) => b.date.localeCompare(a.date)))
      for (const e of Object.values(s.entries)) {
        const sets = e.sets.filter((x) => x.done);
        if (!sets.length) continue;
        m.set(e.name, [...(m.get(e.name) ?? []), { date: s.date, sets }]);
      }
    return m;
  }, [state.sessions]);
  // Aktuelles Arbeitsgewicht: jüngster Stand dieser Übung
  const working = (name: string) => Object.entries(state.slots).filter(([k, st]) => k.slice(k.indexOf("|") + 1) === name && st.weight != null)
    .sort((a, b) => (b[1].updated ?? "").localeCompare(a[1].updated ?? ""))[0]?.[1];
  const names = Object.keys(EXERCISES).sort((a, b) => a.localeCompare(b, "de"))
    .filter((n) => only === "alle" || hist.has(n) || state.oneRM?.[n])
    .filter((n) => !q.trim() || n.toLowerCase().includes(q.trim().toLowerCase()));
  const setRM = (name: string, v: string) => update((st) => {
    const rm = { ...(st.oneRM ?? {}) };
    const kgv = parseFloat(v.replace(",", "."));
    if (!v.trim() || !(kgv > 0)) delete rm[name]; else rm[name] = { kg: kgv, date: today };
    return { ...st, oneRM: rm };
  });
  return (
    <div className="stack">
      <div className="card stack">
        <div className="row between"><h2>Übungen</h2><span className="muted small">{Object.keys(EXERCISES).length} in der Bibliothek</span></div>
        <Seg value={only} options={[{ value: "mit", label: "Mit Daten" }, { value: "alle", label: "Alle" }]} onChange={setOnly} />
        <input type="search" placeholder="Suchen" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {names.length === 0 && <div className="card muted">{only === "mit" ? "Noch keine Übung im Log. „Alle“ zeigt die ganze Bibliothek." : "Keine Übung passt zur Suche."}</div>}
      {names.slice(0, 120).map((n) => {
        const ex = EXERCISES[n];
        const rm = oneRM(state, n);
        const w = working(n);
        const h = hist.get(n) ?? [];
        const loaded = LOADED.has(ex.equip);
        const meta = loaded && rm ? `1RM ${kg(rm.kg)}` : w?.weight != null ? kg(w.weight) : h.length ? `${h.length}×` : "";
        return (
          <Collapse key={n} title={n} meta={meta}>
            <div className="stack small">
              <div className="muted">{EQUIP[ex.equip] ?? ex.equip}{ex.needs?.length ? ` · braucht ${ex.needs.join(", ")}` : ""}</div>
              {ex.desc && <p className="muted">{ex.desc}</p>}
              {w?.weight != null && <div>Arbeitsgewicht: <strong>{kg(w.weight)}</strong>{w.target ? ` · Ziel ${w.target} Wdh` : ""}</div>}
              {loaded && (
                <div className="row wrap">
                  <span>1RM:</span>
                  <input type="number" inputMode="decimal" className="kg-in" placeholder={rm && rm.source === "geschätzt" ? String(rm.kg) : "kg"}
                    value={state.oneRM?.[n]?.kg ?? ""} onChange={(e) => setRM(n, e.target.value)} />
                  <span className="muted">{rm ? (rm.source === "manuell" ? `eingetragen am ${fmtDate(rm.date)}` : `geschätzt aus dem Log (${fmtDate(rm.date)})`) : "noch unbekannt"}</span>
                </div>
              )}
              {h.length > 0 && (
                <table className="pr-table">
                  <thead><tr><th>Datum</th><th>Sätze</th>{loaded && <th>est. 1RM</th>}</tr></thead>
                  <tbody>
                    {h.slice(0, 8).map((x, i) => {
                      const best = Math.max(0, ...x.sets.filter((y) => y.weight && y.reps && y.reps <= 12).map((y) => epley(y.weight!, y.reps!)));
                      return (
                        <tr key={i}>
                          <td>{fmtDate(x.date)}</td>
                          <td>{x.sets.map((y) => (y.seconds ? `${y.seconds}s` : `${y.reps ?? "?"}${y.weight != null ? `×${String(y.weight).replace(".", ",")}` : ""}`)).join(" · ")}</td>
                          {loaded && <td>{best ? kg(Math.round(best * 2) / 2) : "–"}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Collapse>
        );
      })}
      {names.length > 120 && <div className="muted small">Weitere {names.length - 120} Übungen: Suche eingrenzen.</div>}
    </div>
  );
}

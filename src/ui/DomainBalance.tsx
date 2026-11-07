/* Domänen-Bilanz im Jahresblick: effektive Wochen je Bereich und Halbjahr (Hauptziel voll,
   jedes Nebenziel halb). Beide Invarianten — Allround-Minimum je Halbjahr, Abwechslungs-Regel —
   prüft die Engine; hier steht nur das Ergebnis, die Zählregeln in der Anleitung. */
import { useMemo } from "react";
import { HALF_MIN, mesoBalance } from "../engine/bilanz";
import type { PlanBlock } from "../types";
import { GOAL_LABEL } from "./PlanEditor";

/** 6 statt 6,0 — und keine Nachkommastelle, wenn es keine braucht */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

export function DomainBalance({ plan }: { plan: PlanBlock[] }) {
  const bal = useMemo(() => mesoBalance(plan), [plan]);
  if (!bal.columns.length) return null;
  const hints = [
    ...bal.gaps.map((g) => `${g.half}: ${g.name} nur ${fmt(g.weeks)} von ${HALF_MIN} Wochen`),
    ...bal.streaks.map((s) => `${s.labels.length} Phasen in Folge mit ${GOAL_LABEL[s.goal]}`),
  ];
  return (
    <div className="stack">
      <div className="label teal"><span className="bar" />Domänen-Bilanz</div>
      {hints.length > 0 && <div className="note warn small">{hints.join("; ")}.</div>}
      <div style={{ overflowX: "auto" }}>
        <table className="pr-table">
          <thead>
            <tr>
              <th className="small">Bereich</th>
              {bal.halves.map((h) => (
                <th key={h.label} className="small" title={`${h.planned} geplante Wochen${h.checked ? " — wird geprüft" : " — zu wenig geplant, um zu prüfen"}`}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bal.rows.map((r) => (
              <tr key={r.id} className={r.required ? "" : "dim"}>
                <td className="small">{r.name}</td>
                {bal.halves.map((h) => {
                  const w = h.byDomain[r.id] ?? 0;
                  const bad = r.required && h.checked && w < HALF_MIN;
                  return <td key={h.label} className={`small mono ${bad ? "warn" : ""}`}>{w ? fmt(w) : "–"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

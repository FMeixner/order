/* Domänen-Bilanz im Plan-Tab: Matrix Testwochen-Bereich × Mesozyklus, Zellen sind effektive
   Wochen (Hauptziel voll, Nebenziele halb), dazu die Halbjahressummen mit den zwei Invarianten
   des Konzepts (Allround: je Halbjahr genug effektive Wochen je Bereich; Abwechslung: kein
   Hauptziel in mehr als zwei Phasen in Folge, Harlequin als Joker). Bewusst Bewertung ohne
   Lenkung — Vorschläge, die unterversorgte Bereiche priorisieren, sind ein Folgeber. */
import { useMemo } from "react";
import { HALF_MIN, mesoBalance } from "../engine/bilanz";
import type { PlanBlock } from "../types";
import { Collapse } from "./common";
import { GOAL_LABEL } from "./PlanEditor";

/** 6 statt 6,0 — und keine Nachkommastelle, wenn es keine braucht */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

export function DomainBalance({ plan }: { plan: PlanBlock[] }) {
  const bal = useMemo(() => mesoBalance(plan), [plan]);
  if (!bal.columns.length) return null;
  const hints = [
    ...bal.gaps.map((g) => `${g.half}: ${g.name} nur ${fmt(g.weeks)} von ${HALF_MIN} effektiven Wochen`),
    ...bal.streaks.map((s) => `${s.labels.length} Phasen in Folge mit ${GOAL_LABEL[s.goal]} (${s.labels.join(" → ")})`),
  ];
  return (
    <Collapse title="Domänen-Bilanz" meta={hints.length ? `${hints.length} Hinweis${hints.length === 1 ? "" : "e"}` : "rund"} tone="teal">
      <div className="stack">
        {hints.length > 0 && (
          <div className="note warn">
            {hints.join("; ")}. Die Bilanz warnt, bevor die Testwoche enttäuscht — nichts wird gesperrt oder eingeplant.
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table className="pr-table">
            <thead>
              <tr>
                <th className="small">Bereich</th>
                {bal.columns.map((c) => (
                  <th key={c.id} className="small" title={`${c.meso ? "Mesozyklus" : "Phase"} · ${c.weeks} Wochen`}>{c.label}</th>
                ))}
                {bal.halves.map((h) => (
                  <th key={h.label} className="small" title={`${h.planned} geplante Wochen${h.checked ? " — wird geprüft" : " — zu wenig geplant, um zu prüfen"}`}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bal.rows.map((r) => (
                <tr key={r.id} className={r.required ? "" : "dim"}>
                  <td className="small">{r.name}</td>
                  {r.cells.map((c, j) => (
                    <td key={j} className="small mono">{c ? fmt(c) : "–"}</td>
                  ))}
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
        <details className="small muted">
          <summary>Wie wird gezählt?</summary>
          <p>Die Zeilen sind die Bereiche, die die Testwoche misst. Effektive Wochen: Das Hauptziel eines Ordens zählt voll, jedes Nebenziel halb; Kondition zählt für Kraftausdauer und Anaerob. Masse hat keinen eigenen Test — die Zeile läuft über die Kraft mit und wird nie als Lücke gemeldet. Fett verlieren und Wohlbefinden sind Wunschziele ohne Pflicht. Allround-Regel: Jeder Bereich braucht mindestens {HALF_MIN} effektive Wochen je Halbjahr (4 von 26); ein Halbjahr wird erst geprüft, wenn halb so viel geplant ist. Abwechslungs-Regel: Kein Hauptziel in mehr als zwei Phasen in Folge; Harlequin ist der Joker und unterbricht die Reihe. Testwochen füllen die Halbjahre, geben aber keine effektiven Wochen.</p>
        </details>
      </div>
    </Collapse>
  );
}

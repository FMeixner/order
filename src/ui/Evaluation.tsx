import { evaluateBlock } from "../engine/norms";
import type { AppState } from "../types";
import { Collapse } from "./common";

function show(v: number, unit: string): string {
  if (unit === "mmss") return `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, "0")}`;
  const u: Record<string, string> = { s: "s", cm: "cm", m: "m", reps: "Wdh", kg: "kg", bpm: "bpm", ml: "ml/kg/min" };
  return `${String(v).replace(".", ",")} ${u[unit] ?? ""}`;
}

/** Auswertung eines Blocks: je Bereich Punkte gegen Normen, Verlauf zum letzten Test, Vorschlag für den nächsten Orden. */
export function Evaluation({ state, blockId, defaultOpen }: { state: AppState; blockId: string; defaultOpen?: boolean }) {
  const ev = evaluateBlock(state, blockId);
  const withData = ev.domains.filter((d) => d.tests.length);
  if (!withData.length && ev.who5 == null) return null;
  const sources = [...new Map(withData.flatMap((d) => d.tests).filter((t) => t.norm).map((t) => [t.norm!.src, t.norm!.tier])).entries()];
  return (
    <Collapse title="Auswertung" meta={ev.weakest ? `Baustelle: ${ev.weakest.name}` : `${withData.length} Bereiche`} tone="teal" defaultOpen={defaultOpen}>
      <div className="stack">
        {ev.missingProfile && <div className="note small">Für den Vergleich mit Altersnormen fehlen Geburtsjahr und Geschlecht. Beides unter Setup › Profil eintragen. Der Verlauf zu deinen eigenen Werten funktioniert auch ohne.</div>}
        {withData.map((d) => (
          <div key={d.id} className="eval-domain">
            <div className="row between">
              <strong>{d.name}</strong>
              {d.score != null ? <span className={`score ${d.score < 40 ? "low" : d.score >= 70 ? "high" : ""}`}>{d.score}</span> : <span className="muted small">ohne Norm</span>}
            </div>
            {d.score != null && <div className="bar-track"><div className="bar-fill" style={{ width: `${d.score}%` }} /></div>}
            <ul className="slot-list">
              {d.tests.map((t) => (
                <li key={t.test.id}>
                  {t.test.name}{t.result.variant && t.test.variants ? ` (${t.test.variants.find((v) => v.id === t.result.variant)?.name ?? t.result.variant})` : ""}: <strong>{show(t.result.value, t.test.unit)}</strong>
                  {t.change && <span className={t.change === "better" ? "ok-text" : "muted"}> · {t.change === "better" ? "besser als" : t.change === "same" ? "gleich wie" : "letztes Mal"} {show(t.prev!.value, t.test.unit)}{t.change === "same" ? " (im Messfehler)" : ""}</span>}
                  {t.norm ? <span className="muted"> · {t.norm.label}{t.norm.tier === "B" ? " (Orientierung)" : ""}</span> : t.why ? <span className="muted"> · {t.why}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {ev.who5 != null && (
          <div className="eval-domain">
            <div className="row between"><strong>Wohlbefinden (WHO-5)</strong><span className={`score ${ev.who5 < 52 ? "low" : ""}`}>{ev.who5}</span></div>
            {ev.who5 < 52 && <div className="muted small">Unter 52: Wohlbefinden eingeschränkt. Der Vorschlag unten setzt deshalb auf Erholung. Wenn das länger so bleibt, lohnt sich ein Gespräch mit der Hausärztin oder dem Hausarzt.</div>}
          </div>
        )}
        {ev.suggestions.length > 0 && (
          <div className="card note">
            <strong>Vorschlag für die nächste Phase:</strong> {ev.suggestions.map((f) => f.name).join(", ")}.
            <div className="small muted">{ev.who5 != null && ev.who5 < 52 ? "Grund: niedriges Wohlbefinden." : `Grund: ${ev.weakest!.name} ist dein schwächster Bereich im Vergleich zur Norm.`} Das ist ein Hinweis, keine Pflicht. Ändern kannst du den Plan unter „Plan“.</div>
          </div>
        )}
        {sources.length > 0 && (
          <details className="small muted">
            <summary>Quellen der Normen</summary>
            <ul>{sources.map(([src, tier]) => <li key={src}>{tier === "A" ? "Norm" : "Orientierung"}: {src}</li>)}</ul>
            <p>„Gleich (im Messfehler)“: Der Unterschied zum letzten Test ist kleiner als das, was Tagesform und Messung ohnehin schwanken lassen (z. B. 0,05 s beim 10-m-Sprint, 5 cm beim Standweitsprung). Punkte entsprechen ungefähr einem Perzentil: 50 heißt, die Hälfte der Vergleichsgruppe ist besser. Sportabzeichen: Bronze 45, Silber 70, Gold 90. „Orientierung“ vergleicht mit trainierten Wettkampfsportlern, das ist ein harter Maßstab. Kraftwerte werden aus dem 5RM auf ein 1RM hochgerechnet und durch das Körpergewicht geteilt.</p>
          </details>
        )}
      </div>
    </Collapse>
  );
}

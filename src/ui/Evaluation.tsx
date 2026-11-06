import { evaluateBlock } from "../engine/norms";
import { focusName, isTestBlock } from "../engine/plan";
import { deficitsOf, domainName, slotsFor } from "../engine/sharpen";
import { FOCUS_BY_ID, SHARPEN } from "../data";
import type { AppState } from "../types";
import { Collapse } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

function show(v: number, unit: string): string {
  if (unit === "mmss") return `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, "0")}`;
  const u: Record<string, string> = { s: "s", cm: "cm", m: "m", reps: "Wdh", kg: "kg", bpm: "bpm", ml: "ml/kg/min" };
  return `${String(v).replace(".", ",")} ${u[unit] ?? ""}`;
}

/** Auswertung eines Blocks: je Bereich Punkte gegen Normen, Verlauf zum letzten Test, Vorschlag für den nächsten Orden. */
export function Evaluation({ state, blockId, defaultOpen, update }: { state: AppState; blockId: string; defaultOpen?: boolean; update?: Update }) {
  const ev = evaluateBlock(state, blockId);
  const withData = ev.domains.filter((d) => d.tests.length);
  if (!withData.length && ev.who5 == null) return null;
  // Defizite und beide Schwerpunkte der nächsten Phase — auch für Spezialisten (die heilen seit 0.93 mit)
  const defs = deficitsOf(state, blockId);
  const lastDate = Object.values(state.tests).flat().filter((r) => r.blockId === blockId).map((r) => r.date).sort().pop() ?? "";
  const nextB = [...state.plan].filter((b) => !isTestBlock(b) && b.start > lastDate && FOCUS_BY_ID[b.focusId]).sort((a, b) => a.start.localeCompare(b.start))[0];
  const slots = nextB ? slotsFor(state, nextB) : null;
  const dayText = (dom: string): string => SHARPEN[dom].days === "all" ? "jeden Trainingstag" : SHARPEN[dom].days === 2 ? "zweimal pro Woche" : "einmal pro Woche";
  const canApply = !!(update && nextB && slots && ((slots.s1.source === "auto" && slots.s1.domain && !nextB.sharpen) || (slots.s2.source === "auto" && slots.s2.domain && !nextB.sharpen2)));
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
        {defs.length === 0 && ev.suggestions.length > 0 && (
          <div className="card note">
            <strong>Vorschlag für die nächste Phase:</strong> {ev.suggestions.map((f) => focusName(f.id)).join(", ")}.
            <div className="small muted">{ev.who5 != null && ev.who5 < 52 ? "Grund: niedriges Wohlbefinden." : `Grund: ${ev.weakest!.name} ist dein schwächster Bereich im Vergleich zur Norm.`} Das ist ein Hinweis, keine Pflicht. Ändern kannst du den Plan unter „Plan“.</div>
          </div>
        )}
        {defs.length > 0 && (
          <div className="card note">
            <strong>Defizite:</strong> {defs.map((d) => `${d.name}${d.kind === "norm" ? ` (${d.score})` : " (Rückgang)"}`).join(", ")}.
            <ul className="slot-list small">
              {slots && nextB && (
                <li>Nächste Phase, {focusName(nextB.focusId)}:
                  <ul>
                    <li>Schwerpunkt 1 (Schwachstelle): {slots.s1.domain
                      ? <><strong>{domainName(slots.s1.domain)}</strong>, {dayText(slots.s1.domain)}. {slots.s1.reason}</>
                      : slots.s1.source === "off" ? "ausgeschaltet." : slots.s1.reason}</li>
                    <li>Schwerpunkt 2 (Vertiefung): {slots.s2.domain
                      ? <><strong>{domainName(slots.s2.domain)}</strong>, {dayText(slots.s2.domain)}. {slots.s2.reason}</>
                      : slots.s2.source === "off" ? "ausgeschaltet." : slots.s2.reason}</li>
                  </ul>
                </li>
              )}
              {slots && slots.deferred.length > 0 && <li>{slots.deferred.map((d) => d.name).join(" und ")} {slots.deferred.length > 1 ? "passen" : "passt"} nicht in {focusName(nextB!.focusId)}. Das übernimmt die Blockfolge: Plan › Blockfolge vorschlagen, „Defizite zuerst“.</li>}
              {ev.suggestions.length > 0 && <li>{ev.who5 != null && ev.who5 < 52 ? "Wohlbefinden ist eingeschränkt, Orden für Erholung" : `Orden, die ${ev.weakest?.name ?? defs[0].name} direkt trainieren`}: {ev.suggestions.map((f) => focusName(f.id)).join(", ")}.</li>}
            </ul>
            {canApply && (
              <div className="row wrap">
                <button className="btn small" onClick={() => update!((st) => ({ ...st, plan: st.plan.map((x) => x.id !== nextB!.id ? x : {
                  ...x,
                  ...(slots!.s1.source === "auto" && slots!.s1.domain && !x.sharpen ? { sharpen: slots!.s1.domain } : {}),
                  ...(slots!.s2.source === "auto" && slots!.s2.domain && !x.sharpen2 ? { sharpen2: slots!.s2.domain } : {}),
                }) }))}>Für die nächste Phase übernehmen</button>
              </div>
            )}
            <div className="small muted">Nur Vorschläge. Beide Schwerpunkte änderst du je Phase im Plan.</div>
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

import { Fragment } from "react";
import { evaluateBlock } from "../engine/norms";
import { focusName, isTestBlock, isoDate } from "../engine/plan";
import { deficitsOf, domainName, PURPOSE_LABEL, slotsFor, type SlotsPlan } from "../engine/sharpen";
import { residualClocks } from "../engine/residual";
import { mesoBalance } from "../engine/bilanz";
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
export function Evaluation({ state, blockId, defaultOpen }: { state: AppState; blockId: string; defaultOpen?: boolean; update?: Update }) {
  const ev = evaluateBlock(state, blockId);
  const withData = ev.domains.filter((d) => d.tests.length);
  if (!withData.length && ev.who5 == null) return null;
  // Defizite und beide Schwerpunkte der nächsten Phase — auch für Spezialisten (die heilen seit 0.93 mit)
  const defs = deficitsOf(state, blockId);
  const lastDate = Object.values(state.tests).flat().filter((r) => r.blockId === blockId).map((r) => r.date).sort().pop() ?? "";
  const nextB = [...state.plan].filter((b) => !isTestBlock(b) && b.start > lastDate && FOCUS_BY_ID[b.focusId]).sort((a, b) => a.start.localeCompare(b.start))[0];
  // Mesozyklus: alle Teile bekommen ihre Vorschläge aus derselben Testwoche (die Daten sind beim letzten Teil am ältesten)
  const parts = nextB?.meso ? state.plan.filter((x) => x.meso === nextB.meso && x.id !== nextB.id && !isTestBlock(x) && FOCUS_BY_ID[x.focusId]).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const slots = nextB ? slotsFor(state, nextB) : null;
  const slotsParts = parts.map((p) => ({ p, s: slotsFor(state, p) }));
  const dayText = (dom: string): string => SHARPEN[dom].days === "all" ? "jeden Trainingstag" : SHARPEN[dom].days === 2 ? "zweimal pro Woche" : "einmal pro Woche";
  const slotItems = (s: SlotsPlan) => (
    <ul>
      <li>Schwerpunkt{s.s1.purpose ? ` (${PURPOSE_LABEL[s.s1.purpose]})` : ""}: {s.s1.domain
        ? <><strong>{domainName(s.s1.domain)}</strong>, {dayText(s.s1.domain)}. {s.s1.reason}</>
        : s.s1.source === "off" ? "ausgeschaltet." : s.s1.reason}</li>

    </ul>
  );
  const sources = [...new Map(withData.flatMap((d) => d.tests).filter((t) => t.norm).map((t) => [t.norm!.src, t.norm!.tier])).entries()];
  return (
    <Collapse title="Auswertung" meta={ev.weakest ? `Baustelle: ${ev.weakest.name}` : `${withData.length} Bereiche`} tone="teal" defaultOpen={defaultOpen}>
      <div className="stack">
        {ev.missingProfile && <div className="note small">Für den Vergleich mit Altersnormen fehlen Geburtsjahr und Geschlecht. Beides unter Setup › Profil eintragen. Der Verlauf zu deinen eigenen Werten funktioniert auch ohne.</div>}
        {withData.map((d) => (
          <div key={d.id} className="eval-domain">
            <div className="row between">
              <strong>{d.name}</strong>
              {d.score != null ? <span className={`score ${d.score < 40 ? "low" : d.score >= 70 ? "high" : ""}`}>{d.score}</span> : d.estimate ? <span className="score est" title={`Schätzung aus ${d.estimate.from.join(", ")}`}>~{d.estimate.score}</span> : <span className="muted small">ohne Norm</span>}
            </div>
            {d.score != null && <div className="bar-track"><div className="bar-fill" style={{ width: `${d.score}%` }} /></div>}
            {d.score == null && d.estimate && <><div className="bar-track"><div className="bar-fill est" style={{ width: `${d.estimate.score}%` }} /></div><div className="muted small">Schätzung aus {d.estimate.from.join(", ")} — Rangfolge, kein Perzentil.</div></>}
            <ul className="slot-list">
              {d.tests.map((t) => (
                <li key={t.test.id}>
                  {t.test.name}{t.result.variant && t.test.variants ? ` (${t.test.variants.find((v) => v.id === t.result.variant)?.name ?? t.result.variant})` : ""}: <strong>{show(t.result.value, t.test.unit)}</strong>
                  {t.change && <span className={t.change === "better" ? "ok-text" : "muted"}> · {t.change === "better" ? "besser als" : t.change === "same" ? "gleich wie" : "letztes Mal"} {show(t.prev!.value, t.test.unit)}{t.change === "same" ? " (im Messfehler)" : ""}</span>}
                  {t.norm ? <span className="muted"> · {t.norm.label}{t.norm.noScore ? " (nur Orientierung, ohne Punkte)" : t.norm.tier === "B" ? " (Orientierung)" : ""}</span> : t.why ? <span className="muted"> · {t.why}</span> : null}
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
            <strong>Defizite:</strong> {defs.map((d) => `${d.name}${d.kind === "norm" ? ` (${d.score})` : d.kind === "estimate" ? ` (geschätzt ${d.score})` : " (Rückgang)"}`).join(", ")}.
            <ul className="slot-list small">
              {slots && nextB && (
                <li>
                  {slotsParts.length ? `Nächstes Zeichen — ${focusName(nextB.focusId)}` : `Nächste Phase, ${focusName(nextB.focusId)}`}:{slotItems(slots)}
                  {slotsParts.map((x, i) => <Fragment key={x.p.id}>Teil {i + 2}, {focusName(x.p.focusId)}:{slotItems(x.s)}</Fragment>)}
                </li>
              )}
              {(() => {
                const seen = new Set<string>();
                for (const s of [slots, ...slotsParts.map((x) => x.s)]) if (s) for (const d of s.deferred) seen.add(d.name);
                if (!seen.size) return null;
                const names = [...seen];
                return <li>{names.join(" und ")} {names.length > 1 ? "passen" : "passt"} {slotsParts.length ? "in keinen Orden des Zeichens" : `nicht in ${focusName(nextB!.focusId)}`}. Das übernimmt die Wahl der Zeichen: Plan › Jahr planen, Richtung „Defizite zuerst“.</li>;
              })()}
              {ev.suggestions.length > 0 && <li>{ev.who5 != null && ev.who5 < 52 ? "Wohlbefinden ist eingeschränkt, Orden für Erholung" : `Orden, die ${ev.weakest?.name ?? defs[0].name} direkt trainieren`}: {ev.suggestions.map((f) => focusName(f.id)).join(", ")}.</li>}
            </ul>
            {(() => {
              // Lenkung für das nächste Zeichen: rote Uhren und Bilanz-Lücken laufen ab hier
              // in die Vorschläge mit ein — gleiche Anlaufstelle wie die Schwerpunkte darüber
              const hot = residualClocks(state, isoDate(new Date())).filter((c) => c.over);
              const gaps = mesoBalance(state.plan).gaps;
              if (!hot.length && !gaps.length) return null;
              const parts: string[] = [];
              if (hot.length) parts.push(`rote Uhren (${hot.map((c) => `${c.name} ${c.days === null ? "noch nie" : `${c.days}/${c.budget}`}`).join(", ")})`);
              if (gaps.length) parts.push(`Lücken der Domänen-Bilanz (${[...new Set(gaps.map((g) => g.name))].join(", ")})`);
              return (
                <div className="small muted">
                  <strong>Lenkung für das nächste Zeichen:</strong> {parts.join(" und ")} fließen ab jetzt in die Vorschläge ein —
                  „Jahr planen“ zieht diese Bereiche vor, die Schwerpunkt-Auswahl priorisiert rote Uhren als Vertiefung.
                </div>
              );
            })()}
            <div className="small muted">Steht der Schwerpunkt auf „Automatisch“ (Vorgabe), übernimmt die Phase das von selbst. Ändern kannst du ihn je Phase im Plan.</div>
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

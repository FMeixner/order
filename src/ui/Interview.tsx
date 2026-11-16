/* Ordensstart-Interview (1.51, Friedrich): einmal je Phase, bevor es losgeht.
   1. Was soll in diesem Orden mitwachsen? Schwerpunkt wählen, die Empfehlung (Defizit aus der Testwoche) ist vorgewählt,
      was der Orden schon trainiert oder was seinem Ziel widerspricht, ist ausgegraut.
   2. Seiten ausgleichen: je Einheit und Körperhälfte eine Nebenübung einseitig (Hauptübungen bleiben beidseitig). */
import { useState } from "react";
import { FOCUS_BY_ID, SHARPEN } from "../data";
import { coveredBy, domainName, interferes, slotsFor, type DomainId } from "../engine/sharpen";
import { blockFocus, focusName } from "../engine/plan";
import { ORDER_CLASS_LABEL, type AppState, type PlanBlock } from "../types";
import { Seg } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

export function Interview({ state, block, update }: { state: AppState; block: PlanBlock; update: Update }) {
  const f = blockFocus(block)!;
  const cls = f.class ?? FOCUS_BY_ID[f.id]?.class;
  const auto = slotsFor(state, { ...block, sharpen: undefined }).s1;
  const [step, setStep] = useState<1 | 2>(1);
  const [pick, setPick] = useState<string>(block.sharpen ?? auto.domain ?? "off");
  const [uni, setUni] = useState(!!block.unilateral);
  const name = focusName(f.id);
  const finish = () => update((st) => ({
    ...st,
    plan: st.plan.map((b) => b.id !== block.id ? b : {
      ...b, interviewed: true, unilateral: uni || undefined,
      // Die Empfehlung bleibt automatisch (sie hält sich stabil, sobald die Phase läuft); alles andere ist eigene Wahl
      sharpen: pick === (auto.domain ?? "off") && !block.sharpen ? undefined : pick,
    }),
  }));
  return (
    <section className="card">
      <div className="block-label amber">Ordensstart · {step} von 2</div>
      {step === 1 ? (
        <div className="stack">
          <p>
            <b>{name}</b> trainiert auf <b>{cls ? ORDER_CLASS_LABEL[cls.primary] : "sein Ziel"}</b>
            {cls?.secondary ? <> und bedient nebenbei <b>{ORDER_CLASS_LABEL[cls.secondary]}</b></> : null}. Was soll in diesem Orden mitwachsen?
          </p>
          <div className="stack" role="radiogroup">
            {Object.entries(SHARPEN).map(([id, d]) => {
              const blocked = interferes(f, id as DomainId) ? "widerspricht dem Ziel des Ordens" : coveredBy(f, id as DomainId) ? "trainiert der Orden schon" : "";
              const rec = id === auto.domain;
              return (
                <label key={id} className={`row small${blocked ? " muted" : ""}`} style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="radio" name="iv-sharpen" disabled={!!blocked} checked={pick === id} onChange={() => setPick(id)} />
                  <span><b>{d.name}</b>{rec ? " · empfohlen" : ""}{blocked ? ` (${blocked})` : ""}{rec && auto.reason ? <span className="muted"> — {auto.reason}</span> : null}</span>
                </label>
              );
            })}
            <label className="row small" style={{ gap: 8 }}>
              <input type="radio" name="iv-sharpen" checked={pick === "off"} onChange={() => setPick("off")} />
              <span><b>Nichts extra</b>{!auto.domain ? " · empfohlen" : ""}<span className="muted"> — der Orden bleibt, wie er ist.</span></span>
            </label>
          </div>
          <div className="row"><button className="btn primary" onClick={() => setStep(2)}>Weiter</button></div>
        </div>
      ) : (
        <div className="stack">
          <p><b>Seiten ausgleichen?</b> Je Einheit wird eine Nebenübung für Oberkörper und eine für Beine einseitig, etwa Rudern mit einer Hand statt mit zwei. Die Hauptübungen bleiben beidseitig.</p>
          <p className="muted small">Sinnvoll, wenn eine Seite spürbar schwächer ist. Fang mit der schwächeren Seite an, die stärkere macht nicht mehr Wiederholungen. Einseitiges Training baut Kraft ähnlich gut auf wie beidseitiges (Speirs et al., 2016); ob kleine Seitenunterschiede die Leistung bremsen, ist allerdings nicht klar belegt (Bishop et al., 2018).</p>
          <Seg value={uni ? "ja" : "nein"} options={[{ value: "nein", label: "Nein" }, { value: "ja", label: "Ja, Seiten ausgleichen" }]} onChange={(v) => setUni(v === "ja")} />
          <div className="row">
            <button className="btn ghost" onClick={() => setStep(1)}>Zurück</button>
            <button className="btn primary" onClick={finish}>Los geht's</button>
          </div>
          <span className="muted small">Beides lässt sich später im Plan bei der Phase ändern{pick !== "off" && SHARPEN[pick] ? ` (Schwerpunkt: ${domainName(pick)})` : ""}.</span>
        </div>
      )}
    </section>
  );
}

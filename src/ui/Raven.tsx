/* Erzähler (Der Aschekurier): Ausgabe der Woche auf „Heute“, Archiv im Log, Turnierbeilage in der Testwoche, Einstellungen im Setup. */
import { useRef, useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { chapterOf, checkPack, GENERIC_PACK, narratorOf, tournamentOf, type Line } from "../engine/saga";
import { isTestBlock, weekInBlock } from "../engine/plan";
import type { AppState, PlanBlock } from "../types";
import { Collapse, Field, Seg } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

const cap1 = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
export const ravenOn = (s: AppState) => !!s.narrative?.on;

export function RavenLines({ lines, aside = "In eigener Sache" }: { lines: Line[]; aside?: string }) {
  return (
    <div className="raven-lines">
      {lines.map((l, i) => {
        switch (l.kind) {
          case "head": return <h3 key={i} className="raven-head">{l.text}</h3>;
          case "roll": return (
            <p key={i} className="raven-roll">
              <span className={`die ${l.value === 20 ? "crit" : l.value === 1 ? "fumble" : ""}`} aria-label={`Würfel: ${l.value}`}>W20 · {l.value}</span>
              {l.text && <span> {l.text}</span>}
            </p>
          );
          case "hp": {
            const v = l.value ?? 0;
            const pct = v > 0 ? Math.max(1, Math.round((100 * v) / (l.max || 1))) : 0;
            return (
              <div key={i} className="raven-hp">
                <div className="row between small"><span>{l.text}</span><span className="muted">{pct === 0 ? "besiegt" : pct <= 3 ? "wankt" : `${pct} % übrig`}</span></div>
                <div className="bar-track" role="img" aria-label={`${l.text}: ${pct} Prozent übrig`}><div className="bar-fill foe" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          }
          case "aside": return <p key={i} className="raven-aside"><strong>{aside}:</strong> {l.text}</p>;
          case "stat": return <p key={i} className="muted small">{l.text}</p>;
          default: {
            // Flugblatt: Schlagzeile in Großbuchstaben am Anfang fett
            const m = l.text.match(/^([A-ZÄÖÜ][A-ZÄÖÜ ]{3,}[.:!])\s(.*)$/s);
            return m ? <p key={i}><strong className="raven-headline">{m[1]}</strong> {m[2]}</p> : <p key={i}>{l.text}</p>;
          }
        }
      })}
    </div>
  );
}

/** Karte auf „Heute“: Prolog in Woche 1, sonst der Bericht der letzten abgeschlossenen Woche. Neu = aufgeklappt. */
export function RavenToday({ state, update, block, today }: { state: AppState; update: Update; block: PlanBlock; today: string }) {
  const ch = chapterOf(state, block, today);
  const cur = weekInBlock(block, today);
  const last = ch.weeks[ch.weeks.length - 1];
  const showWeek = last && (last.week === cur || last.week === cur - 1) ? last : null;
  const key = `${block.id}:${showWeek?.week ?? 0}`;
  const [open, setOpen] = useState(state.narrative?.seen !== key);
  const toggle = () => {
    setOpen((o) => !o);
    if (state.narrative?.seen !== key) update((st) => ({ ...st, narrative: { ...st.narrative!, seen: key } }));
  };
  const nr = narratorOf(state);
  const title = showWeek ? (ch.ended ? `${nr.name}: ${nr.special}` : `${nr.name}: ${nr.issue} ${showWeek.week}`) : `${nr.name}: ${nr.first}`;
  return (
    <section className="card collapse raven">
      <button className="collapse-head" onClick={toggle} aria-expanded={open}>
        <span className="collapse-title">{title}</span>
        <span className="collapse-meta">{state.narrative?.seen !== key ? "neu" : `${cap1(ch.foe.nom)} ${Math.max(ch.liveHp > 0 ? 1 : 0, Math.round((100 * ch.liveHp) / ch.hp))} %`}</span>
        <span className={`chev ${open ? "open" : ""}`} aria-hidden>›</span>
      </button>
      {open && (
        <div className="collapse-body">
          <RavenLines lines={(showWeek ? showWeek.lines : ch.prologue).filter((l) => ch.ended || l.kind !== "hp")} aside={nr.aside} />
          {!ch.ended && <RavenLines lines={[{ kind: "hp", text: cap1(ch.foe.nom), value: ch.liveHp, max: ch.hp }]} />}
          {ch.ended && <><hr /><RavenLines lines={ch.saga} aside={nr.aside} /></>}
          {showWeek && <p className="muted small">Alle Ausgaben stehen im Log unter „{nr.archive}“.</p>}
        </div>
      )}
    </section>
  );
}

/** Chronik im Log: je Orden Prolog, Wochen und Saga */
export function RavenChronicle({ state, today }: { state: AppState; today: string }) {
  const blocks = state.plan.filter((b) => !isTestBlock(b) && FOCUS_BY_ID[b.focusId] && b.start <= today).sort((a, b) => b.start.localeCompare(a.start));
  if (!blocks.length) return null;
  const nr = narratorOf(state);
  return (
    <Collapse title={nr.archive} meta={`${blocks.length} Orden`}>
      <div className="stack">
        {blocks.map((b) => {
          const ch = chapterOf(state, b, today);
          return (
            <Collapse key={b.id} title={ch.scene.name} meta={`${FOCUS_BY_ID[b.focusId].name}${ch.ended ? " · abgeschlossen" : ` · Woche ${ch.weeks.length}`}`}>
              {ch.ended && <RavenLines lines={ch.saga} aside={nr.aside} />}
              {ch.ended ? <Collapse title="Alle Ausgaben" meta={`${ch.weeks.length} Wochen`}><Weeks ch={ch} aside={nr.aside} /></Collapse> : <><RavenLines lines={ch.prologue.slice(1)} aside={nr.aside} /><Weeks ch={ch} aside={nr.aside} /></>}
            </Collapse>
          );
        })}
      </div>
    </Collapse>
  );
}

function Weeks({ ch, aside }: { ch: ReturnType<typeof chapterOf>; aside: string }) {
  return (
    <>
      {ch.weeks.map((w) => (
        <div key={w.week}>
          <h3 className="raven-head small">Woche {w.week}</h3>
          <RavenLines lines={w.lines} aside={aside} />
        </div>
      ))}
    </>
  );
}

/** Turnier der Klingen: Einleitung über der Testwoche */
export function RavenTournament({ state, block, today }: { state: AppState; block: PlanBlock; today: string }) {
  const t = tournamentOf(state, block, today);
  return (
    <section className="card raven">
      <h3 className="raven-head">{narratorOf(state).tournament}: Das Turnier der Klingen</h3>
      <div className="raven-lines"><p>{t.intro}</p></div>
    </section>
  );
}
/** Urteil der Klinge in einem Cup, sobald Werte da sind */
export function RavenCup({ state, block, today, cupId }: { state: AppState; block: PlanBlock; today: string; cupId: string }) {
  const c = tournamentOf(state, block, today).cups.find((x) => x.cupId === cupId);
  if (!c?.text) return null;
  return <div className="raven-lines raven-cup"><p>{c.text}</p></div>;
}

/** Einstellungen: an/aus, Name der Figur, Pronomen, eigene Welt */
export function NarrativeSettings({ state, update }: { state: AppState; update: Update }) {
  const n = state.narrative ?? { on: false };
  const set = (patch: Partial<NonNullable<AppState["narrative"]>>) => update((st) => ({ ...st, narrative: { on: false, ...st.narrative, ...patch } }));
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const packName = (n.pack?.name as string | undefined) ?? GENERIC_PACK.name;
  return (
    <Collapse title="Erzähler" meta={n.on ? `an · ${packName}` : "aus"}>
      <div className="stack">
        <p className="muted small">Der Aschekurier, ein Flugblatt, berichtet über deine Trainingswochen: ein Widersacher je Orden, eine Ausgabe pro Woche, am Ende eine Sonderausgabe. Die Testwoche wird zum Turnier. Am Training ändert sich nichts. Ausgeschaltet verschwindet nur der Text, beim Einschalten ist die Geschichte bis heute sofort da.</p>
        <Seg value={n.on ? "on" : "off"} options={[{ value: "off", label: "aus" }, { value: "on", label: "an" }]} onChange={(v) => set({ on: v === "on" })} />
        {n.on && (
          <>
            <Field label="Name der Figur" hint="Leer: Name aus dem Profil, sonst „die Heldin“ oder „der Held“.">
              <input type="text" value={n.hero ?? ""} placeholder={state.user.name || "optional"} onChange={(e) => set({ hero: e.target.value })} />
            </Field>
            <Field label="Die Figur ist">
              <Seg value={n.pronoun ?? (state.user.sex === "m" ? "er" : "sie")} options={[{ value: "sie", label: "Heldin (sie)" }, { value: "er", label: "Held (er)" }]} onChange={(pronoun) => set({ pronoun })} />
            </Field>
            <div className="stack">
              <span className="field-label">Welt: {packName}</span>
              <span className="muted small">{(n.pack?.desc as string | undefined) ?? GENERIC_PACK.desc}</span>
              <div className="row wrap">
                <button className="btn ghost small" onClick={() => file.current?.click()}>Eigene Welt laden</button>
                {n.pack && <button className="btn ghost small" onClick={() => { set({ pack: null }); setMsg("Zurück zur generischen Welt."); }}>Eigene Welt entfernen</button>}
              </div>
              <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const raw = JSON.parse(await f.text());
                  const errs = checkPack(raw);
                  if (errs.length) { setMsg(`Die Welt passt noch nicht: ${errs.slice(0, 3).join(" ")}`); return; }
                  set({ pack: raw });
                  setMsg(`Welt „${raw.name}“ geladen. Sie bleibt nur auf diesem Gerät und in deiner Sicherung.`);
                } catch { setMsg("Die Datei konnte nicht gelesen werden."); }
              }} />
              <span className="muted small">Eine eigene Welt ist eine JSON-Datei mit demselben Aufbau wie die generische (siehe data/narrative/generic.json im Quellcode). Was fehlt, kommt aus der generischen Welt. Sie wird nicht hochgeladen.</span>
              {msg && <div className="note small">{msg}</div>}
            </div>
          </>
        )}
      </div>
    </Collapse>
  );
}

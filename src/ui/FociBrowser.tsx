import { useState } from "react";
import { FOCI } from "../data";
import type { Block, Focus, Slot } from "../types";
import { Modal } from "./common";
import { GOAL_LABEL, LOAD_LABEL } from "./PlanEditor";

const NUTR: Record<string, string> = { deficit: "leichtes Defizit", maintenance: "Erhaltung", surplus: "leichter Überschuss", any: "frei" };

function slotLine(s: Slot): string {
  const dose = s.kind === "timer" ? `${s.minutes} Min` : s.kind === "hold" ? `${s.sets} × ${s.hold} s` : s.kind === "interval" && s.interval ? `${s.interval.rounds} × ${s.interval.work} s` : `${s.sets} × ${s.reps}`;
  const alt = [typeof s.home === "string" ? s.home : s.home?.name, typeof s.reise === "string" ? s.reise : s.reise?.name].filter(Boolean);
  return `${s.ladder ? s.ladder.join(" → ") : s.name} · ${dose}${alt.length ? ` · Ersatz: ${[...new Set(alt)].join(" / ")}` : ""}`;
}

function BlockLines({ b }: { b: Block }) {
  const rot = b.rotation ? ` (${b.rotation}-Woche)` : "";
  switch (b.type) {
    case "single": return <li>{slotLine(b.slot)}{rot}</li>;
    case "superset": return <li>{b.label ?? "Superset"}{rot}: <ul>{b.slots.map((s) => <li key={s.id}>{slotLine(s)}</li>)}</ul></li>;
    case "contrast": return <li>Kontrast{rot}: {b.heavy.name} {b.heavy.sets} × {b.heavy.reps} → {b.transfer ?? 30} s → {b.explosive.name} {b.explosive.reps}, {Math.round((b.rest ?? 180) / 60)} Min Pause</li>;
    case "beast": return <li>Bestie{rot}: {b.pool ? `aus ${b.pool.length} festgelegten` : `Klasse ${(b.classes ?? []).join(" oder ")}`}{b.draw === "random" ? ", zufällig" : ""}{b.benchmark_every ? `, jede ${b.benchmark_every}. Woche Wiederholung` : ""}</li>;
    case "module": return <li>Doppelmesser: {b.variant}{b.fallback ? ` (ohne Modul: ${b.fallback.name})` : ""}{rot}</li>;
    case "menu": return <li>{b.label}: nach Wahl aus {Object.keys(b.options).join(", ")}</li>;
  }
}

export function FocusDetail({ f }: { f: Focus }) {
  return (
    <div className="stack focus-detail">
      <p>{f.description}</p>
      <div className="kv">
        <span>Ziel</span><span>{GOAL_LABEL[f.goals.primary]}{f.goals.secondary.length ? `, dazu ${f.goals.secondary.map((g) => GOAL_LABEL[g]).join(", ")}` : ""}</span>
        <span>Ernährung</span><span>{NUTR[f.nutrition]}</span>
        <span>Verträgt Alltagslast</span><span>bis {LOAD_LABEL[f.load_fit]}</span>
        <span>Dauer</span><span>{f.weeks.min === f.weeks.max ? f.weeks.min : `${f.weeks.min}–${f.weeks.max}`} Wochen, etwa {f.session_min} Min pro Einheit</span>
        <span>Niveau</span><span>{f.level}</span>
        <span>Unterwegs</span><span>{f.travel ? "ja" : "nein"}</span>
        {f.test_week || f.test_weeks ? <><span>Testwoche</span><span>{f.test_weeks ? `Woche ${f.test_weeks.join(", ")}` : "letzte Woche"}</span></> : null}
        {f.sources?.length ? <><span>Grundlagen</span><span>{f.sources.join("; ")}</span></> : null}
      </div>
      {(f.week_4).map((rk, i) => {
        const r = f.roles[rk];
        return (
          <div key={rk} className="card">
            <div className="role-head"><strong>Tag {i + 1}: {r.name}</strong> <span className="muted small">{r.minutes} Min{f.week_3.includes(rk) ? "" : " · entfällt bei 3 Tagen"}</span></div>
            {r.note && <p className="muted small">{r.note}</p>}
            <ul className="slot-list">{r.blocks.map((b, j) => <BlockLines key={j} b={b} />)}</ul>
          </div>
        );
      })}
      {Object.keys(f.roles).filter((r) => !f.week_4.includes(r)).map((rk) => (
        <div key={rk} className="card"><strong>Zusatz: {f.roles[rk].name}</strong> <span className="muted small">ab 5 Trainingstagen</span>
          <ul className="slot-list">{f.roles[rk].blocks.map((b, j) => <BlockLines key={j} b={b} />)}</ul></div>
      ))}
    </div>
  );
}

export function FociBrowser() {
  const [open, setOpen] = useState<Focus | null>(null);
  return (
    <div className="stack">
      <p className="muted">Alle Orden im Überblick. Welchem Orden du dich in welcher Phase anschließt, legst du im Plan fest.</p>
      {FOCI.map((f) => (
        <button key={f.id} className="focus-card solo" onClick={() => setOpen(f)}>
          <div className="focus-name">{f.name}</div>
          <div className="focus-tag">{f.tagline}</div>
          <div className="focus-meta">{GOAL_LABEL[f.goals.primary]} · Last bis {LOAD_LABEL[f.load_fit]} · {f.session_min} Min{f.travel ? " · unterwegs möglich" : ""}</div>
        </button>
      ))}
      {open && <Modal title={open.name} onClose={() => setOpen(null)} wide><FocusDetail f={open} /></Modal>}
    </div>
  );
}

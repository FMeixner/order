import { useState } from "react";
import { OrderMark } from "./OrderIcon";
import { FLOWS, FOCI, FOCUS_BY_ID, KLAMMERN } from "../data";
import { bindOf } from "../engine/klammer";
import { primaryAxis } from "../engine/kcal";
import { KlammerIcon, Sign } from "./Signs";
import { CLASS_LABEL, defaultRoles, focusName, isWeaponModule, MODULE_LABEL, pathLevel, pathList, PATHS, trainingDays } from "../engine/plan";
import { shapeFocus } from "../engine/weekplan";
import { resolveSlot } from "../engine/resolve";
import { ladderStart } from "../engine/skills";
import type { AppState, Block, EquipmentProfile, Focus, Slot } from "../types";
import { Collapse, Modal } from "./common";
import { GOAL_LABEL, LOAD_FIT_LABEL, levelLabel } from "./PlanEditor";

const NUTR: Record<string, string> = { deficit: "leichtes Defizit", maintenance: "Erhaltung", surplus: "leichter Überschuss", any: "frei" };

type Ctx = { profile?: EquipmentProfile; skills?: Set<string> | null };

/** Eine Übung so, wie sie mit dem Profil tatsächlich dran wäre, ohne Ersatzliste */
function slotLine(s: Slot, c: Ctx): string | null {
  const r = c.profile ? resolveSlot(s, c.profile, false, undefined, c.skills) : null;
  if (c.profile && !r) return null;
  const name = r ? (r.ladder ? r.ladder[r.ladderStart ?? ladderStart(r.ladder, c.skills)] : r.name) : s.ladder ? s.ladder[0] : s.name;
  const kind = r?.kind ?? s.kind;
  const dose = kind === "timer" ? `${r?.minutes ?? s.minutes} Min` : kind === "hold" ? `${r?.sets ?? s.sets} × ${r?.hold ?? s.hold} s` : kind === "interval" && s.interval ? `${s.interval.rounds} × ${s.interval.work} s` : `${r?.sets ?? s.sets} × ${r?.reps ?? s.reps}`;
  return `${name} · ${dose}`;
}


function BlockLines({ b, c }: { b: Block; c: Ctx }) {
  const rot = b.rotation ? ` (${b.rotation}-Woche)` : "";
  switch (b.type) {
    case "single": { const l = slotLine(b.slot, c); return l ? <li>{l}{rot}</li> : null; }
    case "superset": return <li>Im Wechsel{rot}: <ul>{b.slots.map((s) => { const l = slotLine(s, c); return l ? <li key={s.id}>{l}</li> : null; })}</ul></li>;
    case "contrast": return <li>Kontrast{rot}: {slotLine(b.heavy, c)} → {b.transfer ?? 30} s → {b.explosive.name} {b.explosive.reps}, {Math.round((b.rest ?? 180) / 60)} Min Pause</li>;
    case "beast": return <li>Bestie{rot}: {b.pool ? `aus ${b.pool.length} festgelegten` : (b.classes ?? []).map((x) => CLASS_LABEL[x]).join(" oder ")}{b.pace === "easy" ? ", ruhiges Grundlagentempo" : ""}{b.benchmark_every ? `, jede ${b.benchmark_every}. Woche Wiederholung` : ""}</li>;
    case "module":
      if (b.module === "flow") return <li>{FLOWS[b.variant]?.name ?? b.variant}{rot}: <ul>{(FLOWS[b.variant]?.drills ?? []).map((d) => <li key={d.id}>{d.name} · {d.mode === "reps" ? `${d.value}×` : `${d.value} s`}{d.sides ? " je Seite" : ""}</li>)}</ul></li>;
    {
      // Sonderrolle: Waffen-Module immer zeigen, auch wenn das Profil keins hat; der Ersatz steht dahinter
      if (!isWeaponModule(b.module)) return null;
      const sk = c.skills ? [...c.skills] : null;
      const lv = PATHS[b.module].leveled.includes(b.variant) ? ` · Stufe ${PATHS[b.module].levels[pathLevel(b.module, sk)].name}` : "";
      const alt = b.fallbackFlow ? FLOWS[b.fallbackFlow]?.name : b.fallback ? slotLine(b.fallback, c) : null;
      return <li><strong>{MODULE_LABEL[b.module]}{lv}</strong>{rot}: {pathList(b.module, b.variant, sk).map((d) => d.name).join(", ")}{alt ? <span className="muted"> · ohne Schwert und Stock: {alt}</span> : null}</li>;
    }
  }
}

/** Kurzfassung eines Blocks: nur Namen, ohne Dosis */
function blockNames(b: Block, c: Ctx): string[] {
  const nm = (s: Slot) => slotLine(s, c)?.split(" · ")[0] ?? null;
  switch (b.type) {
    case "single": return [nm(b.slot)].filter(Boolean) as string[];
    case "superset": return b.slots.map(nm).filter(Boolean) as string[];
    case "contrast": return [nm(b.heavy), b.explosive.name].filter(Boolean) as string[];
    case "beast": return ["Bestie"];
    case "module": return [b.module === "flow" ? FLOWS[b.variant]?.name ?? "Flow" : b.module === "sharpen" ? "Schwerpunkt" : MODULE_LABEL[b.module]];
  }
}

/** Zeichen eines Ordens fürs Almanach-Symbol: die Zeichen, deren Ziel er trägt; sonst die, in deren Verlauf er
    kuratiert ist (früh/spät) — so hat jeder Orden ein Tier (Skill-Orden wie Acrobat und Huntsman laufen im Falken mit,
    Herald trägt den Stier nur teilweise, weil er unter 35 Minuten bleibt). */
function zeichenOf(f: Focus): { k: (typeof KLAMMERN)[number]; lead: boolean }[] {
  const lead = KLAMMERN.filter((k) => bindOf(f, k) === "lead").map((k) => ({ k, lead: true }));
  if (lead.length) return lead;
  const own = KLAMMERN.filter((k) => { const a = primaryAxis(f); return !!a && k.axes.includes(a); });
  if (own.length) return own.map((k) => ({ k, lead: false }));
  const curated = KLAMMERN.filter((k) => k.early.includes(f.id) || k.late.includes(f.id));
  const acc = curated.length ? curated : KLAMMERN.filter((k) => bindOf(f, k) === "accept").slice(0, 1);
  return acc.map((k) => ({ k, lead: false }));
}

export function FocusDetail({ f, profile, skills, days }: { f: Focus; profile?: EquipmentProfile; skills?: Set<string> | null; days?: number }) {
  const c: Ctx = { profile, skills };
  // Vorschau so, wie der Orden bei deiner Zahl an Trainingstagen aussieht (ohne Angabe: vier Tage)
  const n = days && days >= 1 ? days : 4;
  const sf = shapeFocus(f, n);
  const roles = defaultRoles(sf, n);
  // Dauer nur, wenn sie fest ist (Monk): sonst bestimmt das Zeichen, wie lange ein Orden läuft
  const facts = [GOAL_LABEL[f.goals.primary], ...(f.weeks.min === f.weeks.max ? [`fest ${f.weeks.min} Wochen`] : []), `etwa ${f.session_min} Min`, levelLabel(f.level)];
  return (
    <div className="stack focus-detail">
      {f.tagline && <p><strong>{f.tagline}</strong></p>}
      <p className="muted small">{facts.join(" · ")}</p>
      {f.medley && (
        <div className="card">
          <strong>Die Reihe</strong>
          <ol className="slot-list">{f.medley.map((id, i) => <li key={i}><strong>{focusName(id)}</strong> · {FOCUS_BY_ID[id]?.tagline}</li>)}</ol>
        </div>
      )}
      {roles.map((rk, i) => {
        const r = sf.roles[rk];
        const names = [...new Set(r.blocks.filter((b) => !b.rotation || b.rotation === "A").flatMap((b) => blockNames(b, c)))];
        return (
          <Collapse key={`${rk}-${i}`} title={<span className="stack tight"><span>Tag {i + 1}: {r.name}</span><span className="muted small">{names.join(", ")}</span></span>}
            meta={`${r.minutes} Min`}>
            <ul className="slot-list">{r.blocks.map((b, j) => <BlockLines key={j} b={b} c={c} />)}</ul>
          </Collapse>
        );
      })}
      <Collapse title="Mehr zum Orden">
        <div className="stack">
          <p>{f.description}</p>
          <div className="kv">
            <span>Ziel</span><span>{GOAL_LABEL[f.goals.primary]}{f.goals.secondary.length ? `, dazu ${f.goals.secondary.map((g) => GOAL_LABEL[g]).join(", ")}` : ""}</span>
            <span>Ernährung</span><span>{NUTR[f.nutrition]}</span>
            <span>Passt</span><span>{LOAD_FIT_LABEL[f.load_fit]}</span>
            <span>Unterwegs</span><span>{f.travel ? "ja" : "nein"}</span>
            {f.test_week || f.test_weeks ? <><span>Testwoche</span><span>{f.test_weeks ? `Woche ${f.test_weeks.join(", ")}` : "letzte Woche"}</span></> : null}
            {f.sources?.length ? <><span>Grundlagen</span><span>{f.sources.join("; ")}</span></> : null}
          </div>
          <p className="muted small">Gezeigt für {n} Trainingstage{profile ? <> mit deinem Profil „{profile.name}“</> : null}. Mit einem anderen Profil tauscht die App die Übungen passend aus.</p>
        </div>
      </Collapse>
    </div>
  );
}

export function FociBrowser({ state }: { state: AppState }) {
  const [open, setOpen] = useState<Focus | null>(null);
  return (
    <div className="stack">
      {FOCI.map((f) => (
        <button key={f.id} className="focus-card solo" onClick={() => setOpen(f)}>
          <OrderMark id={f.id} />
          <div className="focus-name">{focusName(f.id)}</div>
          <div className="focus-tag">{f.tagline}</div>
          <div className="focus-meta row">
            {GOAL_LABEL[f.goals.primary]} · {f.session_min} Min
            <Sign kind={`load-${f.load_fit}`} />{f.travel && <Sign kind="travel" />}
            {/* Zeichen, deren Ziel der Orden trägt */}
            {zeichenOf(f).map((z) => <span key={z.k.id} className={`kl-${z.k.id}`} style={{ color: "var(--k)", display: "inline-flex", opacity: z.lead ? 1 : 0.55 }} title={`${z.lead ? "trägt" : "läuft mit in"} ${z.k.name} · ${z.k.tag}`}><KlammerIcon id={z.k.id} size={14} /></span>)}
          </div>
        </button>
      ))}
      {open && <Modal title={open.name} onClose={() => setOpen(null)} wide><FocusDetail f={open} profile={state.equipment[0]} days={trainingDays(state).length} skills={state.user.skills ? new Set(state.user.skills) : null} /></Modal>}
    </div>
  );
}

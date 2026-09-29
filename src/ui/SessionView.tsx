import { useEffect, useMemo, useState } from "react";
import { EXERCISES, SKILLS } from "../data";
import { backoffLoad, advance, suggest, type Suggestion } from "../engine/progression";
import { guidedKeys, resolveSlot, swapKey, swapOptions, toGuided, type Resolved } from "../engine/resolve";
import { affectDowngrade, beastById, beastClass, beastMinutes, CLASS_LABEL, COMBO_REST, expandDrills, isAWeek, moduleDrills, pickBeast, type DrillView } from "../engine/plan";
import { snapNearest } from "../engine/loads";
import { blockSeconds, estimateRole } from "../engine/duration";
import type { AppState, Beast, BeastClass, Block, EquipmentProfile, Feedback, Focus, PlanBlock, Session, SessionEntry, SetEntry } from "../types";
import { Collapse, Desc, kg, Modal } from "./common";
import { fmt, useTimer } from "./Timer";

type Update = (fn: (s: AppState) => AppState) => void;

export interface SessionCtx {
  state: AppState;
  update: Update;
  block: PlanBlock;
  focus: Focus;
  week: number;
  roleKey: string;
  profile: EquipmentProfile;
  date: string;
  reduced: boolean;
}

export const sessionId = (blockId: string, week: number, role: string) => `${blockId}:${week}:${role}`;

/** Geschätzte Minuten dieser Einheit in dieser Woche, auf 5 gerundet */
const minutesFor = (ctx: SessionCtx) => Math.max(5, Math.round(estimateRole(ctx.focus.roles[ctx.roleKey], ctx.profile, ctx.state.user, ctx.week).total / 5) * 5);

/** Skills aus dem Skillcheck; null, solange keiner gemacht wurde */
export const skillSet = (st: AppState): Set<string> | null => (st.user.skills ? new Set(st.user.skills) : null);

/* ---------- Slots dieser Einheit sammeln ---------- */
interface Item { block: Block; resolved: Resolved[]; beast?: Beast | null; drills?: DrillView[] }

function slotsOf(b: Block, ctx: SessionCtx): Resolved[] {
  const r = (s: Parameters<typeof resolveSlot>[0]) => {
    if (s.gate_week && ctx.week < s.gate_week) return null;
    return resolveSlot(s, ctx.profile, ctx.reduced && (s.kind ?? "strength") !== "timer", ctx.state.swaps?.[swapKey(s.id, ctx.profile.tier)], skillSet(ctx.state));
  };
  switch (b.type) {
    case "single": return [r(b.slot)].filter(Boolean) as Resolved[];
    case "superset": return b.slots.map(r).filter(Boolean) as Resolved[];
    case "contrast": return [r(b.heavy), r(b.explosive)].filter(Boolean) as Resolved[];
    case "menu": {
      const choice = ctx.state.menuChoice[`${ctx.block.id}:${b.id}`];
      const s = choice ? b.options[choice] : null;
      return s ? ([r(s)].filter(Boolean) as Resolved[]) : [];
    }
    case "module": return !ctx.profile.has.sword && b.fallback ? ([r(b.fallback)].filter(Boolean) as Resolved[]) : [];
    default: return [];
  }
}

/** Läuft in diesem Block gelaufen? */
export const isRunBlock = (b: Block) => b.type === "single" && !!EXERCISES[b.slot.name]?.run;

/** Kein Laufen möglich: Laufblock wird zur Bestie ähnlicher Dauer */
function runToBeast(b: Block, ctx: SessionCtx): Block {
  if (b.type !== "single") return b;
  const min = blockSeconds(b, ctx.profile) / 60;
  const cls: BeastClass = min <= 10.5 ? "plage" : min <= 17.5 ? "bestie" : min <= 25.5 ? "ungeheuer" : "uralte";
  return { type: "beast", id: `norun-${b.slot.id}`, classes: [cls], draw: "rotate", note: `Statt ${b.slot.name}.`, rotation: b.rotation };
}

export function collectItems(ctx: SessionCtx): Item[] {
  const role = ctx.focus.roles[ctx.roleKey];
  const ab = isAWeek(ctx.week) ? "A" : "B";
  const noRun = !!ctx.state.noRun?.[sessionId(ctx.block.id, ctx.week, ctx.roleKey)];
  const items: Item[] = role.blocks
    .filter((b) => !b.rotation || b.rotation === ab)
    .map((b) => (noRun && isRunBlock(b) ? runToBeast(b, ctx) : b))
    .map((b) => {
      if (b.type === "beast") {
        return { block: b, resolved: [], beast: pickBeast(b, { blockId: ctx.block.id, week: ctx.week, profile: ctx.profile, state: ctx.state, reduced: ctx.reduced, downgrade: !!ctx.focus.affect_rule && affectDowngrade(ctx.state) }) };
      }
      if (b.type === "module" && ctx.profile.has.sword) return { block: b, resolved: [], drills: moduleDrills(b.variant, ctx.state.user, ctx.week) };
      return { block: b, resolved: slotsOf(b, ctx) };
    })
    .filter((it) => it.resolved.length || it.beast !== undefined || it.drills || it.block.type === "menu");
  // Phase mit hoher Alltagslast: etwa die Hälfte der freien Übungen geführt, sofern das Profil Maschinen oder Kabel hat
  if (ctx.block.load === "high") {
    const all = items.flatMap((it) => it.resolved.map((r, i) => ({ r, contrast: it.block.type === "contrast" && i === 0 })));
    const keys = guidedKeys(all, ctx.profile);
    if (keys.size) for (const it of items) it.resolved = it.resolved.map((r) => (keys.has(r.key) ? toGuided(r, ctx.profile) ?? r : r));
  }
  return items;
}

/* ---------- Hauptansicht ---------- */
export function SessionView(ctx: SessionCtx) {
  const { state, update, focus, roleKey, week, block } = ctx;
  const role = focus.roles[roleKey];
  const id = sessionId(block.id, week, roleKey);
  const session = state.sessions.find((s) => s.id === id);
  const items = useMemo(() => collectItems(ctx), [ctx]);
  const warm = expandDrills((role.warmup ?? ["base"]).filter((l) => !l.startsWith("sword") || ctx.profile.has.sword), state.user, week);
  const cool = expandDrills(role.cooldown ?? ["cd_general"], state.user, week);
  const [feeling, setFeeling] = useState<number | null>(null);
  const hard = items.some((it) => it.beast || it.resolved.some((r) => r.kind === "interval"));

  const mut = (fn: (s: Session) => Session) =>
    update((st) => {
      const cur = st.sessions.find((s) => s.id === id) ?? {
        id, date: ctx.date, blockId: block.id, focusId: focus.id, week, role: roleKey, profileId: ctx.profile.id,
        entries: {}, drills: {}, menu: {}, done: false,
      };
      const next = fn({ ...cur, date: cur.done ? cur.date : ctx.date });
      return { ...st, sessions: [...st.sessions.filter((s) => s.id !== id), next] };
    });

  const finish = () => {
    update((st) => {
      const cur = st.sessions.find((s) => s.id === id);
      if (!cur) return st;
      const slots = { ...st.slots };
      for (const it of items) for (const r of it.resolved) {
        const e = cur.entries[r.key];
        if (!e || !e.sets.some((x) => x.done)) continue;
        slots[r.key] = advance(r, slots[r.key], e, ctx.profile, ctx.date);
      }
      const beastTimes = { ...st.beastTimes };
      if (cur.beast?.seconds && !cur.beast.easy) beastTimes[cur.beast.id] = [...(beastTimes[cur.beast.id] ?? []), { date: ctx.date, seconds: cur.beast.seconds }];
      for (const pt of cur.beastParts ?? []) if (pt.seconds && !pt.easy) beastTimes[pt.id] = [...(beastTimes[pt.id] ?? []), { date: ctx.date, seconds: pt.seconds }];
      const feelingLog = feeling != null ? [...st.feeling, { date: ctx.date, sessionId: id, value: feeling }] : st.feeling;
      return { ...st, slots, beastTimes, feeling: feelingLog, sessions: st.sessions.map((s) => (s.id === id ? { ...s, done: true, date: ctx.date } : s)) };
    });
  };

  return (
    <div className="stack session">
      <div className="session-head">
        <h2>{role.name}</h2>
        <div className="muted small">{ctx.profile.name} · etwa {minutesFor(ctx)} Min{ctx.reduced ? " · −1 Satz" : ""}</div>
        {role.note && <p className="note">{role.note}</p>}
        {role.blocks.some(isRunBlock) && (
          <label className="check small">
            <input type="checkbox" checked={!!state.noRun?.[id]} onChange={(e) => update((st) => ({ ...st, noRun: { ...(st.noRun ?? {}), [id]: e.target.checked } }))} />
            <span>Heute kein Laufen möglich: Bestie statt Lauf</span>
          </label>
        )}
        {items.some((it) => it.resolved.some((r) => r.guided)) && <p className="note">Phase mit hoher Alltagslast: Etwa die Hälfte der freien Übungen läuft heute an Maschine oder Kabel. Der erste große Lift bleibt frei.</p>}
        {session?.done && <p className="note ok">Abgeschlossen am {session.date.split("-").reverse().join(".")}. Änderungen sind noch möglich, die Progression ist aber schon fortgeschrieben.</p>}
      </div>

      {warm.length > 0 && (
        <Collapse title="Warm-up" meta={`${warm.length} Übungen`} tone="amber">
          <DrillList drills={warm} done={session?.drills ?? {}} prefix="wu" onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
        </Collapse>
      )}

      {items.map((it, i) => (
        <ItemCard key={i} it={it} ctx={ctx} session={session} mut={mut} />
      ))}

      {cool.length > 0 && (
        <Collapse title="Cool-down" meta={`${cool.length} Übungen`} tone="amber">
          <DrillList drills={cool} done={session?.drills ?? {}} prefix="cd" onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
        </Collapse>
      )}

      <div className="card finish">
        {focus.affect_rule && hard && !session?.done && (
          <div className="stack">
            <div className="small">Wie hat sich die Einheit angefühlt? (−5 sehr schlecht, +5 sehr gut)</div>
            <div className="fs-scale">
              {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
                <button key={v} className={feeling === v ? "on" : ""} onClick={() => setFeeling(v)}>{v > 0 ? `+${v}` : v}</button>
              ))}
            </div>
          </div>
        )}
        <textarea placeholder="Notiz zur Einheit (optional)" value={session?.note ?? ""} onChange={(e) => mut((s) => ({ ...s, note: e.target.value }))} rows={2} />
        {!session?.done
          ? <button className="btn primary wide" onClick={() => { if (!session) mut((s) => s); finish(); }}>Einheit abschließen</button>
          : <button className="btn ghost wide" onClick={() => update((st) => ({ ...st, sessions: st.sessions.map((s) => (s.id === id ? { ...s, done: false } : s)) }))}>Wieder öffnen</button>}
      </div>
    </div>
  );
}

function toggleDrill(s: Session, key: string, i: number): Session {
  const arr = [...(s.drills[key] ?? [])];
  arr[i] = !arr[i];
  return { ...s, drills: { ...s.drills, [key]: arr } };
}

/* ---------- Warm-up, Cool-down, Module ---------- */
function DrillList({ drills, done, prefix, onToggle }: { drills: DrillView[]; done: Record<string, boolean[]>; prefix: string; onToggle: (key: string, i: number) => void }) {
  const t = useTimer();
  return (
    <div className="drills">
      {drills.map((d) => {
        const key = `${prefix}:${d.id}`;
        const arr = done[key] ?? [];
        let idx = 0;
        return (
          <div key={d.id} className="drill">
            <div className="drill-head">
              <span className="drill-name">{d.name}</span>
              <Desc text={d.desc} />
            </div>
            {d.note && <div className="muted small">{d.note}</div>}
            <div className="drill-groups">
              {d.groups.map((g, gi) => (
                <div key={gi} className="drill-group">
                  {g.label && <span className="muted small">{g.label}</span>}
                  {Array.from({ length: g.sets }).map(() => {
                    const i = idx++;
                    const isDone = !!arr[i];
                    const timed = d.mode !== "reps";
                    const label = timed ? fmt(g.value) : `${g.value}×`;
                    return (
                      <button key={i} className={`set-btn ${isDone ? "done" : ""}`}
                        onClick={() => {
                          if (isDone || !timed) return onToggle(key, i);
                          t.countdown(`${d.name}${g.label ? ` · ${g.label}` : ""}`, g.value, () => onToggle(key, i));
                        }}>
                        {isDone ? "✓" : label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Blöcke ---------- */
function ItemCard({ it, ctx, session, mut }: { it: Item; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void }) {
  const b = it.block;
  const t = useTimer();
  if (b.type === "beast") return <BeastCard beast={it.beast ?? null} ctx={ctx} session={session} mut={mut} note={b.note} easy={b.pace === "easy"} />;
  if (b.type === "module" && it.drills) {
    return (
      <section className="card">
        <div className="block-label amber">Schwert</div>
        <DrillList drills={it.drills} done={session?.drills ?? {}} prefix="dm" onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
      </section>
    );
  }
  if (b.type === "menu") {
    const key = `${ctx.block.id}:${b.id}`;
    const choice = ctx.state.menuChoice[key] ?? "";
    return (
      <section className="card">
        <div className="block-label teal">{b.label}</div>
        <select value={choice} onChange={(e) => ctx.update((st) => ({ ...st, menuChoice: { ...st.menuChoice, [key]: e.target.value } }))}>
          <option value="">Schwerpunkt wählen …</option>
          {Object.keys(b.options).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => t.rest(`Pause nach ${r.name}`, r.rest)} />)}
      </section>
    );
  }
  if (b.type === "contrast") {
    const [heavy, expl] = it.resolved;
    const transfer = b.transfer ?? 30, rest = b.rest ?? 180;
    return (
      <section className="card contrast">
        <div className="block-label amber">Kontrastpaar · {transfer} s Übergang · {Math.round(rest / 60)} Min Pause</div>
        {heavy && <SlotCard r={heavy} ctx={ctx} session={session} mut={mut} onSetDone={() => expl && t.rest(`Gleich: ${expl.name}`, transfer)} />}
        <div className="arrow muted small">↓ {transfer} s, dann explosiv</div>
        {expl && <SlotCard r={expl} ctx={ctx} session={session} mut={mut} onSetDone={() => t.rest("Pause bis zum nächsten Paar", rest)} />}
      </section>
    );
  }
  if (b.type === "superset") {
    const last = it.resolved[it.resolved.length - 1];
    return (
      <section className="card superset">
        <div className="block-label teal">Im Wechsel · direkt nacheinander, dann {b.rest ?? 60} s Pause</div>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => { if (r === last) t.rest("Pause, dann nächste Runde", b.rest ?? 60); }} />)}
      </section>
    );
  }
  if (b.type === "module") {
    return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => {}} />)}</section>;
  }
  return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => t.rest(`Pause nach ${r.name}`, r.rest)} />)}</section>;
}

const FB: { k: Feedback; l: string }[] = [{ k: "schwer", l: "Schwer" }, { k: "ok", l: "OK" }, { k: "leicht", l: "Leicht" }, { k: "sehrleicht", l: "Sehr leicht" }];

const TIER_LABEL = { gym: "Studio", home: "Zuhause", reise: "Unterwegs" } as const;

/** Übung für diese Stelle tauschen. Die Wahl gilt je Slot und Ort und bleibt bei Updates erhalten. */
function SwapDialog({ r, ctx, onClose }: { r: Resolved; ctx: SessionCtx; onClose: () => void }) {
  const opts = swapOptions(r, ctx.profile, skillSet(ctx.state));
  const key = swapKey(r.slotId, ctx.profile.tier);
  const set = (name: string | null) => {
    ctx.update((st) => {
      const sw = { ...(st.swaps ?? {}) };
      if (name == null || name === r.original) delete sw[key]; else sw[key] = name;
      return { ...st, swaps: sw };
    });
    onClose();
  };
  const usable = opts.filter((o) => o.available);
  const missing = opts.filter((o) => !o.available);
  return (
    <Modal title="Übung tauschen" onClose={onClose}>
      <div className="stack">
        <p className="muted small">Gilt für diese Stelle im Orden, immer wenn du {TIER_LABEL[ctx.profile.tier]} trainierst. Satz- und Wiederholungsvorgaben bleiben, das Gewicht führt die App für jede Übung getrennt.</p>
        {(r.swapped || r.swapUnavailable) && (
          <button className="btn wide" onClick={() => set(null)}>Zurück zum Original: {r.original}</button>
        )}
        {usable.length === 0 && <div className="muted small">Keine passende Alternative mit dem Equipment von „{ctx.profile.name}“.</div>}
        <div className="swap-list">
          {usable.map((o) => (
            <button key={o.name} className="swap-opt" onClick={() => set(o.name)}>
              <span>{o.name}</span>
              {EXERCISES[o.name]?.equip && <span className="muted small">{EQUIP_LABEL[EXERCISES[o.name].equip] ?? ""}</span>}
            </button>
          ))}
        </div>
        {missing.length > 0 && (
          <details className="small muted">
            <summary>Nicht im Profil „{ctx.profile.name}“ ({missing.length})</summary>
            <ul>{missing.map((o) => <li key={o.name}>{o.name}</li>)}</ul>
          </details>
        )}
      </div>
    </Modal>
  );
}

const EQUIP_LABEL: Record<string, string> = {
  barbell: "Langhantel", dumbbell: "Kurzhantel", kettlebell: "Kettlebell", cable: "Kabel", machine: "Maschine", plate: "Zusatzgewicht",
  vest: "Weste", band: "Band", bodyweight: "Körpergewicht", sandbag: "Sandsack",
};

function SlotCard({ r, ctx, session, mut, onSetDone }: { r: Resolved; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; onSetDone: () => void }) {
  const t = useTimer();
  const [swapOpen, setSwapOpen] = useState(false);
  const canSwap = r.kind === "strength" || r.kind === "hold";
  const st = ctx.state.slots[r.key];
  const sug: Suggestion = suggest(r, st, ctx.week, ctx.profile);
  const entry: SessionEntry = session?.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
  const sets: SetEntry[] = Array.from({ length: r.kind === "timer" || r.kind === "interval" ? 1 : r.sets }, (_, i) => entry.sets[i] ?? { done: false });
  const desc = EXERCISES[sug.name]?.desc ?? EXERCISES[r.name]?.desc;
  /** Ein Gewicht pro Übung: das eingetragene, sonst der Vorschlag. Beim Top-Satz gilt es für Satz 1, die Back-off-Sätze rechnet die App. */
  const enteredW = entry.sets[0]?.weight ?? null;
  const baseW = enteredW ?? sug.weight;
  const topBack = r.prog === "topset" && baseW != null ? backoffLoad(ctx.profile, r, baseW) : null;
  const defaultWeight = (i: number) => (r.prog === "topset" && i > 0 ? topBack : baseW);

  const writeSet = (i: number, patch: Partial<SetEntry>) =>
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const arr = Array.from({ length: sets.length }, (_, k) => e.sets[k] ?? { done: false });
      arr[i] = { ...arr[i], ...patch };
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, stage: sug.stage, sets: arr } } };
    });

  /** Gewicht für alle Sätze setzen (Top-Satz: Satz 1, Back-off automatisch) */
  const setWeight = (w: number | null) =>
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const back = r.prog === "topset" && w != null ? backoffLoad(ctx.profile, r, w) : w;
      const arr = Array.from({ length: sets.length }, (_, k) => ({ ...(e.sets[k] ?? { done: false }), weight: k > 0 && r.prog === "topset" ? back : w }));
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, stage: sug.stage, sets: arr } } };
    });

  const markDone = (i: number) => {
    const cur = sets[i];
    if (cur.done) return writeSet(i, { done: false });
    // Bei Übungen mit Wiederholungen trägst du die tatsächliche Zahl ein; ohne Zahl springt der Fokus ins Feld
    const needsReps = r.kind === "strength" && r.prog !== "none";
    if (needsReps && cur.reps == null) { document.getElementById(`reps-${r.key}-${i}`)?.focus(); return; }
    writeSet(i, {
      done: true,
      reps: cur.reps ?? sug.targetReps ?? undefined,
      weight: r.loadable ? cur.weight ?? defaultWeight(i) : null,
    });
    onSetDone();
  };

  const setFb = (fb: Feedback) => mut((s) => {
    const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
    return { ...s, entries: { ...s.entries, [r.key]: { ...e, feedback: e.feedback === fb ? undefined : fb } } };
  });

  const last = [...ctx.state.sessions].filter((x) => x.done && x.id !== session?.id && x.entries[r.key]?.sets.some((y) => y.done)).sort((a, b) => b.date.localeCompare(a.date))[0]?.entries[r.key];
  const lastLine = last && r.kind === "strength" ? last.sets.filter((y) => y.done).map((y) => y.reps ?? "?").join(" · ") + (last.sets.find((y) => y.done)?.weight != null ? ` mit ${kg(last.sets.find((y) => y.done)!.weight)}` : "") : null;
  const doseLabel =
    r.kind === "timer" ? `${sug.minutes} Min`
    : r.kind === "interval" && r.interval ? `${r.interval.rounds} × ${fmt(r.interval.work)} Arbeit, ${fmt(r.interval.rest)} Pause`
    : r.kind === "hold" ? `${r.sets} × ${sug.seconds} s`
    : `${r.sets} × ${sug.repsLabel}`;
  const showFb = r.prog !== "none" && (sets.some((x) => x.done) || !!entry.feedback || !!session?.done);

  return (
    <div className="slot">
      <div className="slot-head">
        <div className="slot-title">
          <span className="slot-name">{sug.name}</span>
          {r.ladder && <span className="tag">Stufe {sug.stage + 1}/{r.ladder.length}</span>}
          {r.proposal && <span className="tag">Vorschlag</span>}
          {r.guided && <span className="tag teal" title="Phase mit hoher Alltagslast">geführt</span>}
          {r.swapped && <span className="tag amber" title={`statt ${r.original}`}>getauscht</span>}
          {r.regressedFrom && <span className="tag" title={`statt ${r.regressedFrom}: Skill noch nicht abgehakt`}>leichter</span>}
        </div>
        <div className="slot-icons">
          <Desc text={desc} />
          {canSwap && <button className="info-btn swap-btn" onClick={() => setSwapOpen(true)} aria-label="Übung tauschen" title="Übung tauschen">⇄</button>}
        </div>
      </div>
      <div className="slot-dose">
        {doseLabel}
        {lastLine && <span className="muted"> · zuletzt {lastLine}</span>}

      </div>
      {swapOpen && <SwapDialog r={r} ctx={ctx} onClose={() => setSwapOpen(false)} />}
      {r.swapped && <div className="muted small">Statt {r.original}.</div>}
      {r.regressedFrom && <div className="muted small">Statt {r.regressedFrom}, bis der Skill sitzt (Setup › Können).</div>}
      {r.swapUnavailable && <div className="muted small">Dein Tausch „{r.swapUnavailable}“ geht mit „{ctx.profile.name}“ nicht, heute deshalb das Original.</div>}
      {r.missingEquipment && <div className="note warn small">Für diese Übung fehlt im Profil „{ctx.profile.name}“ Equipment. Nimm eine passende Alternative.</div>}
      {r.note && <div className="muted small">{r.note}</div>}
      {sug.gap && <div className="gap-note small">{sug.gap}</div>}
      {r.kind === "strength" && (
        <div className="sets">
          {r.loadable && (
            <div className="kg-line">
              <input type="number" inputMode="decimal" className="kg-in" placeholder={sug.weight != null ? String(sug.weight) : "kg"}
                value={enteredW ?? ""} onChange={(e) => setWeight(e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                onBlur={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v)) setWeight(snapNearest(ctx.profile, r.equip, v)); }}
                aria-label="Gewicht" />
              <span className="muted small">kg{r.prog === "topset" && topBack != null ? ` Top-Satz, danach ${kg(topBack)}` : ""}</span>
            </div>
          )}
          <div className="set-pills">
            {sets.map((s, i) => (
              <div key={i} className={`set-pill ${s.done ? "done" : ""}`}>
                <button className={`set-btn ${s.done ? "done" : ""}`} onClick={() => markDone(i)} aria-label={`Satz ${i + 1}`}>{s.done ? "✓" : i + 1}</button>
                <input id={`reps-${r.key}-${i}`} type="number" inputMode="numeric" className="reps-in" placeholder="Wdh"
                  value={s.reps ?? ""} onChange={(e) => writeSet(i, { reps: e.target.value === "" ? undefined : parseInt(e.target.value) })} aria-label={`Wiederholungen Satz ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {r.kind === "hold" && (
        <div className="drill-group">
          {sets.map((s, i) => (
            <button key={i} className={`set-btn ${s.done ? "done" : ""}`} onClick={() => {
              if (s.done) return writeSet(i, { done: false });
              t.countdown(sug.name, sug.seconds ?? 20, () => { writeSet(i, { done: true, seconds: sug.seconds ?? 20 }); });
            }}>{s.done ? "✓" : fmt(sug.seconds ?? 20)}</button>
          ))}
        </div>
      )}

      {r.kind === "timer" && (
        <div className="row">
          <button className={`btn ${sets[0].done ? "ghost" : "primary"}`} onClick={() => t.countdown(sug.name, (sug.minutes ?? 10) * 60, () => writeSet(0, { done: true, seconds: (sug.minutes ?? 10) * 60 }))}>▶ {sug.minutes} Min starten</button>
          <button className={`set-btn ${sets[0].done ? "done" : ""}`} onClick={() => writeSet(0, { done: !sets[0].done })} aria-label="Erledigt">{sets[0].done ? "✓" : "○"}</button>
        </div>
      )}

      {r.kind === "interval" && r.interval && (
        <div className="row">
          <button className={`btn ${sets[0].done ? "ghost" : "primary"}`} onClick={() => t.interval(sug.name, r.interval!.work, r.interval!.rest, r.interval!.rounds, () => writeSet(0, { done: true }))}>▶ Intervalle starten</button>
          <button className={`set-btn ${sets[0].done ? "done" : ""}`} onClick={() => writeSet(0, { done: !sets[0].done })} aria-label="Erledigt">{sets[0].done ? "✓" : "○"}</button>
        </div>
      )}

      {showFb && (
        <div className="fb">
          {FB.map((f) => <button key={f.k} className={entry.feedback === f.k ? "on" : ""} onClick={() => setFb(f.k)}>{f.l}</button>)}
        </div>
      )}
    </div>
  );
}

/* ---------- Bestie ---------- */
/** Hinweis bei hexed-Bestien: welche Übung leichter ist */
function hexNote(b: Beast): string | null {
  const ids = b.hexed ?? b.parts?.flatMap((p) => beastById(p.id)?.hexed ?? []) ?? [];
  if (!ids.length) return null;
  const names = SKILLS.skills.filter((x) => ids.includes(x.id)).map((x) => x.name);
  return `hexed: ${names.join(", ")} durch eine leichtere Übung ersetzt, bis der Skill sitzt.`;
}

/** Stoppuhr und Zeiteingabe für eine Bestie */
function BeastTimer({ times, label, saved, onSave }: { times: { seconds: number }[]; label?: string; saved: number | null; onSave: (sec: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const [manual, setManual] = useState("");
  useEffect(() => {
    if (startedAt == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(iv);
  }, [startedAt]);
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  const running = startedAt != null;
  const elapsed = running ? (Date.now() - startedAt!) / 1000 : 0;
  return (
    <div className="stack beast-timer">
      {label && <div className="small muted">{label}</div>}
      <div className="row">
        {!running
          ? <button className="btn primary" onClick={() => setStartedAt(Date.now())}>▶ Stoppuhr</button>
          : <button className="btn primary" onClick={() => { onSave(Math.round(elapsed)); setStartedAt(null); }}>■ Stopp {fmt(elapsed)}</button>}
        <input type="text" inputMode="numeric" placeholder="oder mm:ss" value={manual} onChange={(e) => setManual(e.target.value)}
          onBlur={() => { const m = manual.match(/^(\d+):(\d{1,2})$/); if (m) { onSave(parseInt(m[1]) * 60 + parseInt(m[2])); setManual(""); } }} className="time-in" />
      </div>
      <div className="small">
        {saved ? <>Heute: <strong>{fmt(saved)}</strong>{pr && saved < pr ? " · neue Bestzeit" : ""}</> : null}
        {pr ? <span className="muted">{saved ? " · " : ""}Bestzeit {fmt(pr)}</span> : !saved ? <span className="muted">Noch keine Zeit</span> : null}
      </div>
    </div>
  );
}

function BeastCard({ beast, ctx, session, mut, note, easy }: { beast: Beast | null; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; note?: string; easy?: boolean }) {
  const t = useTimer();
  if (!beast) return <section className="card"><div className="muted">Keine passende Bestie für dieses Equipment gefunden.</div></section>;
  // Dauer: bei Serien aus den Teilen, mit gemessenen Zeiten, wo vorhanden
  const effMin = beast.parts
    ? beast.parts.reduce((m, pt) => m + beastMinutes(beastById(pt.id)!, ctx.state.beastTimes[pt.id]).min, 0) + ((beast.parts.length - 1) * COMBO_REST) / 60
    : beastMinutes(beast, ctx.state.beastTimes[beast.id]).min;
  const measured = beast.parts ? beast.parts.every((pt) => (ctx.state.beastTimes[pt.id] ?? []).length) : (ctx.state.beastTimes[beast.id] ?? []).length > 0;
  const cls = beastClass(effMin);
  const saveSingle = (sec: number) => mut((s) => ({ ...s, beast: { id: beast.id, seconds: sec, ...(easy ? { easy } : {}) } }));
  // Serie: jeder Teil einzeln, jede Zeit zählt für ihre Bestie (ein Doppel/Triple ist ein Teil mit eigener Bestzeit)
  const parts = beast.parts ?? [];
  const saveUnit = (u: number, sec: number) => {
    mut((s) => {
      const arr = parts.map((x, i) => (s.beastParts?.[i]?.id === x.id ? s.beastParts[i] : { id: x.id, seconds: null }));
      arr[u] = { id: parts[u].id, seconds: sec, ...(easy ? { easy } : {}) };
      return { ...s, beastParts: arr };
    });
    if (u < parts.length - 1) t.rest(`Pause, dann ${parts[u + 1].name}`, COMBO_REST);
  };
  const work = (b: { work: string; rounds: number; times?: number; repeat?: number }) => {
    const k = b.times ?? b.repeat ?? 1;
    return (
      <>
        <div className="muted small">{k > 1 ? `${k}-mal am Stück ohne Pause, je ${b.rounds / k} ${b.rounds / k === 1 ? "Durchgang" : "Runden"}` : `${b.rounds} ${b.rounds === 1 ? "Durchgang" : "Runden"}`}</div>
        <ul className="beast-work">{b.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
      </>
    );
  };
  return (
    <section className="card beast">
      <div className="block-label amber">Bestiarium · {CLASS_LABEL[cls]} · ~{Math.round(effMin)} Min {measured ? "gemessen" : "geschätzt"}</div>
      <div className="beast-name">{beast.name}</div>
      {easy && <div className="note small">Grundlagentempo: ruhig und gleichmäßig, Nasenatmung, du kannst dabei sprechen. Die Zeit zählt nicht für die Bestzeit.</div>}
      {hexNote(beast) && <div className="muted small">{hexNote(beast)}</div>}
      {parts.length ? (
        <>
          <div className="muted small">Zwei Bestien hintereinander, dazwischen {COMBO_REST / 60} Min Pause. Jede Zeit zählt für die Bestzeit ihrer Bestie.</div>
          {parts.map((pt, u) => (
            <div key={u} className="stack">
              <div className="small"><strong>{u + 1}. {pt.name}</strong></div>
              {work(pt)}
              <BeastTimer times={ctx.state.beastTimes[pt.id] ?? []} saved={session?.beastParts?.[u]?.id === pt.id ? session.beastParts[u].seconds : null} onSave={(sec) => saveUnit(u, sec)} />
            </div>
          ))}
        </>
      ) : (
        <>
          {work(beast)}
          <BeastTimer times={ctx.state.beastTimes[beast.id] ?? []} saved={session?.beast?.id === beast.id ? session.beast.seconds : null} onSave={saveSingle} />
        </>
      )}
      {note && <div className="muted small">{note}</div>}
    </section>
  );
}

/* ---------- Vorschau einer künftigen Woche: nur Übungen und Dosis, keine Eingaben ---------- */
function previewDose(r: Resolved): string {
  if (r.kind === "timer") return `${r.minutes ?? 10} Min`;
  if (r.kind === "interval" && r.interval) return `${r.interval.rounds} × ${fmt(r.interval.work)} / ${fmt(r.interval.rest)}`;
  if (r.kind === "hold") return `${r.sets} × ${r.hold ?? 20} s`;
  return `${r.sets} × ${r.reps}`;
}
const BLOCK_TITLE: Partial<Record<Block["type"], string>> = { superset: "Superset", contrast: "Kontrastpaar", menu: "Wahl" };

export function SessionPreview(ctx: SessionCtx) {
  const role = ctx.focus.roles[ctx.roleKey];
  const items = collectItems(ctx);
  const warm = expandDrills((role.warmup ?? ["base"]).filter((l) => !l.startsWith("sword") || ctx.profile.has.sword), ctx.state.user, ctx.week);
  const cool = expandDrills(role.cooldown ?? ["cd_general"], ctx.state.user, ctx.week);
  return (
    <div className="stack session">
      <div className="session-head">
        <h2>{role.name}</h2>
        <div className="muted small">{ctx.profile.name} · etwa {minutesFor(ctx)} Min{ctx.reduced ? " · −1 Satz" : ""}</div>
      </div>
      <section className="card preview">
        <div className="preview-row muted"><span>Warm-up</span><span>{warm.length} Übungen</span></div>
        {items.map((it, i) => {
          const title = BLOCK_TITLE[it.block.type];
          if (it.beast !== undefined) {
            const parts = it.beast?.parts ?? (it.beast ? [{ id: it.beast.id, name: it.beast.name, rounds: it.beast.rounds, work: it.beast.work, times: it.beast.repeat ?? 1 }] : []);
            return (
              <div key={i} className="preview-group">
                {!parts.length && <div className="block-label amber">Bestie: passend zum Equipment</div>}
                {parts.map((pt, k) => (
                  <div key={k}>
                    <div className="block-label amber">{it.beast?.parts ? `${k + 1}. ` : "Bestie: "}{pt.name} · {pt.times > 1 ? `${pt.times}-mal am Stück, je ${pt.rounds / pt.times} Runden` : `${pt.rounds} ${pt.rounds === 1 ? "Durchgang" : "Runden"}`}</div>
                    {pt.work.split(" · ").map((w, j) => <div key={j} className="preview-row"><span>{w}</span></div>)}
                  </div>
                ))}
              </div>
            );
          }
          if (it.drills) return <div key={i} className="preview-row"><span>Schwert: {it.drills.map((d) => d.name).join(", ")}</span></div>;
          if (it.block.type === "menu" && !it.resolved.length) return <div key={i} className="preview-row"><span>{it.block.label}</span><span className="muted">Wahl am Tag</span></div>;
          return (
            <div key={i} className={title ? "preview-group" : ""}>
              {title && <div className="block-label teal">{title}</div>}
              {it.resolved.map((r) => (
                <div key={r.key} className="preview-row">
                  <span>{r.name}{r.guided ? <span className="tag teal">geführt</span> : null}{r.swapped ? <span className="tag amber">getauscht</span> : null}</span>
                  <span className="mono muted">{previewDose(r)}</span>
                </div>
              ))}
            </div>
          );
        })}
        <div className="preview-row muted"><span>Cool-down</span><span>{cool.length} Übungen</span></div>
      </section>
      <p className="muted small">Gewichte rechnet die App erst, wenn die Woche dran ist, aus deinen Einheiten bis dahin.</p>
    </div>
  );
}

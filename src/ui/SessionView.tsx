import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EXERCISES, FLOWS, SHARPEN } from "../data";
import { menuDefault } from "../engine/sharpen";
import { focusFor } from "../engine/weekplan";
import { parseClock } from "../engine/clock";
import { allRuns } from "../engine/runs";
import { capOf, isLoadBeast, loadKind, loadRecord, pctLift, suggestLoad } from "../engine/loadbeast";
import { backoffLoad, advance, suggest, type Suggestion, sharedState } from "../engine/progression";
import { guidedKeys, parseReps, resolveSlot, swapKey, swapOptions, toGuided, type Resolved } from "../engine/resolve";
import { affectDowngrade, beastById, finisherBlock, daysBetween, beastMinutes, COMBO_REST, expandDrills, isAWeek, moduleDrills, pickBeast, dayRoleMap, setWeekBeastBlocks, type BeastTarget, type DrillView } from "../engine/plan";
import { snapDown, snapNearest } from "../engine/loads";
import { blockSeconds, estimateRole } from "../engine/duration";
import { WARM_REST, warmupKeys, warmupSets } from "../engine/warmup";
import type { AppState, Beast, BeastResult, BeastRun, BeastClass, Block, EquipmentProfile, Feedback, Focus, PlanBlock, Session, SessionEntry, SetEntry } from "../types";
import { Collapse, Desc, kg, Modal, Seg } from "./common";
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
  /** Knopf neben der Überschrift (⚙ Anpassen) und die aufgeklappte Karte darunter */
  headAction?: ReactNode;
  headPanel?: ReactNode;
}

/** Was eine Bestienkarte braucht: auch außerhalb einer Einheit (freie Jagd im Almanach) */
export type BeastCtx = Pick<SessionCtx, "state" | "update" | "profile">;

export const sessionId = (blockId: string, week: number, role: string) => `${blockId}:${week}:${role}`;

/** Geschätzte Minuten dieser Einheit in dieser Woche, auf 5 gerundet */
/** Zusatz an einer Bestien-Übung: Band-Stufe oder Gewicht am heutigen Ort */

const minutesFor = (ctx: SessionCtx) => Math.max(5, Math.round(estimateRole(ctx.focus.roles[ctx.roleKey], ctx.profile, ctx.state.user, ctx.week, ctx.reduced).total / 5) * 5);

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
      const choice = ctx.state.menuChoice[`${ctx.block.id}:${b.id}`] ?? menuDefault(ctx.state, ctx.block, b);
      const s = choice ? b.options[choice] : null;
      return s ? ([r(s)].filter(Boolean) as Resolved[]) : [];
    }
    case "module": return b.module === "sword" && !ctx.profile.has.sword && b.fallback ? ([r(b.fallback)].filter(Boolean) as Resolved[]) : [];
    default: return [];
  }
}

/** Läuft in diesem Block gelaufen? */
export const isRunBlock = (b: Block) => b.type === "single" && !!EXERCISES[b.slot.name]?.run;

/** Alle Bestien einer Woche mit Ort, so wie die Einheiten sie zeigen (A/B-Wechsel, „kein Laufen“) */
setWeekBeastBlocks((state, pb, week) => {
  const f = focusFor(state, pb, week);
  if (!f) return [];
  const ab = isAWeek(week) ? "A" : "B";
  return dayRoleMap(state, pb, f, week).flatMap((d) => {
    const pid = state.profileFor?.[sessionId(pb.id, week, d.role)] ?? d.profileId;
    const profile = state.equipment.find((e) => e.id === pid);
    if (!profile) return [];
    const noRun = !!state.noRun?.[sessionId(pb.id, week, d.role)];
    const ctx = { profile } as SessionCtx;
    return (f.roles[d.role]?.blocks ?? [])
      .filter((b) => !b.rotation || b.rotation === ab)
      .map((b) => (noRun && isRunBlock(b) ? runToBeast(b, ctx) : finisherBlock(b, week) ?? b))
      .filter((b): b is Extract<Block, { type: "beast" }> => b.type === "beast")
      .map((b) => [b, profile] as BeastTarget);
  });
});

/** Kein Laufen möglich: Laufblock wird zur Bestie ähnlicher Dauer */
function runToBeast(b: Block, ctx: SessionCtx): Block {
  if (b.type !== "single") return b;
  const min = blockSeconds(b, ctx.profile) / 60;
  const cls: BeastClass = min <= 10.5 ? "plage" : min <= 17.5 ? "bestie" : min <= 25.5 ? "ungeheuer" : "uralte";
  return { type: "beast", id: `norun-${b.slot.id}`, classes: [cls], note: `Statt ${b.slot.name}.`, rotation: b.rotation };
}

export function collectItems(ctx: SessionCtx): Item[] {
  const role = ctx.focus.roles[ctx.roleKey];
  const ab = isAWeek(ctx.week) ? "A" : "B";
  const noRun = !!ctx.state.noRun?.[sessionId(ctx.block.id, ctx.week, ctx.roleKey)];
  const done = ctx.state.sessions.find((s) => s.id === sessionId(ctx.block.id, ctx.week, ctx.roleKey) && s.done);
  const beastItem = (b: Extract<Block, { type: "beast" }>): Item => {
    // Schon erledigt: die Bestie, die tatsächlich gemacht wurde, nicht neu würfeln
    const r = done?.beastRuns?.[b.id] ?? (done && !done.beastRuns && role.blocks.filter((x) => x.type === "beast").length === 1 ? { beast: done.beast, parts: done.beastParts } : undefined);
    const logged = r?.parts?.length ? r.parts.map((p) => p.id).join("+") : r?.beast?.id;
    const lb = logged ? beastById(logged) : null;
    if (lb) return { block: b, resolved: [], beast: lb };
    return { block: b, resolved: [], beast: pickBeast(b, { blockId: ctx.block.id, week: ctx.week, profile: ctx.profile, state: ctx.state, reduced: ctx.reduced, downgrade: !!ctx.focus.affect_rule && affectDowngrade(ctx.state) }) };
  };
  const otherItem = (b: Block): Item => {
    if (b.type === "module" && (b.module !== "sword" || ctx.profile.has.sword)) return { block: b, resolved: [], drills: moduleDrills(b.variant, ctx.state.user, ctx.week, b.module) };
    return { block: b, resolved: slotsOf(b, ctx) };
  };
  const all: Item[] = role.blocks
    .filter((b) => !b.rotation || b.rotation === ab)
    .map((b) => (noRun && isRunBlock(b) ? runToBeast(b, ctx) : b))
    .map((b) => {
      // Finisher: passt eine Bestie aus dem Pool, kommt sie statt des Supersets (erledigte Einheit: so, wie sie war)
      const fb = finisherBlock(b, ctx.week);
      if (fb && (!done || done.beastRuns?.[fb.id])) {
        const it = beastItem(fb);
        if (it.beast) return it;
      }
      return b.type === "beast" ? beastItem(b) : otherItem(b);
    });
  const items: Item[] = all.filter((it) => it.resolved.length || it.beast !== undefined || it.drills || it.block.type === "menu");
  // Phase mit hoher Alltagslast: etwa die Hälfte der freien Übungen geführt, sofern das Profil Maschinen oder Kabel hat
  if (ctx.block.load === "high") {
    const all = items.flatMap((it) => it.resolved.map((r, i) => ({ r, contrast: it.block.type === "contrast" && i === 0 })));
    const keys = guidedKeys(all, ctx.profile);
    if (keys.size) for (const it of items) it.resolved = it.resolved.map((r) => (keys.has(r.key) ? toGuided(r, ctx.profile) ?? r : r));
  }
  return items;
}

/** Übungen mit Aufwärmsätzen in dieser Einheit (Schlüssel → Anzahl) */
const WarmCtx = createContext<Map<string, number>>(new Map());

/* ---------- Hauptansicht ---------- */
export function SessionView(ctx: SessionCtx) {
  const { state, update, focus, roleKey, week, block } = ctx;
  const role = focus.roles[roleKey];
  const id = sessionId(block.id, week, roleKey);
  const session = state.sessions.find((s) => s.id === id);
  const items = useMemo(() => collectItems(ctx), [ctx]);
  // Erste schwere Mehrgelenksübung je Körperhälfte: Aufwärmsatz
  const warmMap = useMemo(() => warmupKeys(items.flatMap((it) => it.resolved)), [items]);
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
      const next = fn({ ...cur, date: cur.done ? cur.date : ctx.date, profileId: cur.done ? cur.profileId : ctx.profile.id });
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
        slots[r.key] = advance(r, sharedState(slots, r), e, ctx.profile, ctx.date);
      }
      const beastTimes = { ...st.beastTimes };
      const load = (r: BeastResult) => ({ ...(r.kg != null ? { kg: r.kg } : {}), ...(r.band ? { band: r.band } : {}), ...(r.tech ? { tech: r.tech } : {}) });
      for (const r of allRuns(cur)) if (r.seconds && !r.easy) beastTimes[r.id] = [...(beastTimes[r.id] ?? []), { date: ctx.date, seconds: r.seconds, ...load(r) }];
      const feelingLog = feeling != null ? [...st.feeling, { date: ctx.date, sessionId: id, value: feeling }] : st.feeling;
      // Jede gezeigte Bestie merken, auch ohne Zeit: zählt für die Rotation
      const runs = { ...(cur.beastRuns ?? {}) };
      for (const it of items) if (it.beast && it.block.type === "beast" && !runs[it.block.id]) {
        const legacy = !cur.beastRuns && (cur.beast?.id === it.beast.id || cur.beastParts?.length) ? { beast: cur.beast, parts: cur.beastParts } : null;
        runs[it.block.id] = legacy ?? (it.beast.parts ? { parts: it.beast.parts.map((p) => ({ id: p.id, seconds: null })) } : { beast: { id: it.beast.id, seconds: null } });
      }
      return { ...st, slots, beastTimes, feeling: feelingLog, sessions: st.sessions.map((s) => (s.id === id ? { ...s, done: true, date: ctx.date, beastRuns: runs, beast: undefined, beastParts: undefined } : s)) };
    });
  };

  return (
    <div className="stack session">
      <div className="session-head">
        {/* Name und Ort stehen schon im Tagesknopf darüber */}
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.reduced ? " · −1 Satz" : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
        {role.note && <p className="note">{role.note}</p>}
        {items.some((it) => it.resolved.some((r) => r.guided)) && <p className="note">Phase mit hoher Alltagslast: Etwa die Hälfte der freien Übungen läuft heute an Maschine oder Kabel. Der erste große Lift bleibt frei.</p>}
        {session?.done && <p className="note ok">Abgeschlossen am {session.date.split("-").reverse().join(".")}. Änderungen sind noch möglich, die Progression ist aber schon fortgeschrieben.</p>}
      </div>

      {warm.length > 0 && (
        <Collapse title="Warm-up" meta={`${warm.length} Übungen`} tone="amber">
          <DrillList drills={warm} done={session?.drills ?? {}} prefix="wu" onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
        </Collapse>
      )}

      <WarmCtx.Provider value={warmMap}>
        {items.map((it, i) => (
          <ItemCard key={i} it={it} ctx={ctx} session={session} mut={mut} nextBeast={items.slice(i + 1).find((x) => x.beast)?.beast?.name} />
        ))}
      </WarmCtx.Provider>

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
        // Startindex je Gruppe: nach Ablauf links startet rechts von selbst (mit Vorlauf)
        const offs = d.groups.reduce<number[]>((o, _g, gi) => [...o, gi ? o[gi - 1] + d.groups[gi - 1].sets : 0], []);
        const run = (gi: number, j: number) => {
          const g = d.groups[gi], i = offs[gi] + j;
          t.countdown(`${d.name}${g.label ? ` · ${g.label}` : ""}`, g.value, () => {
            onToggle(key, i);
            const ng = d.groups[gi + 1];
            if (ng && j < ng.sets && !arr[offs[gi + 1] + j]) run(gi + 1, j);
          });
        };
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
                          run(gi, i - offs[gi]);
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
function ItemCard({ it, ctx, session, mut, nextBeast }: { it: Item; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; nextBeast?: string }) {
  const b = it.block;
  const t = useTimer();
  if (b.type === "beast") return <BeastCard blockId={b.id} beast={it.beast ?? null} ctx={ctx} session={session} mut={mut} note={b.note} easy={b.pace === "easy"} nextBeast={nextBeast} watchBase={sessionId(ctx.block.id, ctx.week, ctx.roleKey)} />;
  if (b.type === "module" && it.drills) {
    return (
      <section className="card">
        <div className="block-label amber">{b.module === "flow" ? FLOWS[b.variant]?.name ?? "Flow" : b.module === "sharpen" ? `Schwerpunkt: ${SHARPEN[b.variant]?.name ?? b.variant} · Erhaltung` : "Schwert"}</div>
        {b.module === "flow" && <div className="muted small">Jede Zeile ist eine Kette: einmal durch ist eine Wiederholung. Erst alle Wiederholungen einer Seite, dann die andere.</div>}
        {b.module === "sharpen" && <div className="muted small">{SHARPEN[b.variant]?.why}</div>}
        <DrillList drills={it.drills} done={session?.drills ?? {}} prefix={b.module === "flow" ? "fl" : b.module === "sharpen" ? "sh" : "dm"} onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
      </section>
    );
  }
  if (b.type === "menu") {
    const key = `${ctx.block.id}:${b.id}`;
    const auto = menuDefault(ctx.state, ctx.block, b);
    const choice = ctx.state.menuChoice[key] ?? auto ?? "";
    return (
      <section className="card">
        <div className="block-label teal">{b.label}{!ctx.state.menuChoice[key] && auto ? <span className="muted small"> · nach deiner Testwoche vorbelegt</span> : null}</div>
        <select value={choice} onChange={(e) => ctx.update((st) => ({ ...st, menuChoice: { ...st.menuChoice, [key]: e.target.value } }))}>
          <option value="">Schwerpunkt wählen …</option>
          {Object.keys(b.options).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(last) => { if (!last) t.rest(`Pause nach ${r.name}`, r.rest); }} />)}
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
        {expl && <SlotCard r={expl} ctx={ctx} session={session} mut={mut} onSetDone={(last) => { if (!last) t.rest("Pause bis zum nächsten Paar", rest); }} />}
      </section>
    );
  }
  if (b.type === "superset") {
    const last = it.resolved[it.resolved.length - 1];
    return (
      <section className="card superset">
        <div className="block-label teal">Im Wechsel · direkt nacheinander, dann {b.rest ?? 60} s Pause</div>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(lastSet) => { if (r === last && !lastSet) t.rest("Pause, dann nächste Runde", b.rest ?? 60); }} />)}
      </section>
    );
  }
  if (b.type === "module") {
    return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => {}} />)}</section>;
  }
  return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(last) => { if (!last) t.rest(`Pause nach ${r.name}`, r.rest); }} />)}</section>;
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

function SlotCard({ r, ctx, session, mut, onSetDone }: { r: Resolved; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; onSetDone: (lastSet: boolean) => void }) {
  const t = useTimer();
  const [swapOpen, setSwapOpen] = useState(false);
  const canSwap = r.kind === "strength" || r.kind === "hold";
  const st = sharedState(ctx.state.slots, r);
  const raw: Suggestion = suggest(r, st, ctx.week, ctx.profile);
  // Nach längerer Pause (14 Tage und mehr an dieser Übung): 10 % leichter wieder einsteigen
  const pausedDays = st?.updated && /^\d{4}-/.test(st.updated) ? daysBetween(st.updated, ctx.date) : 0;
  const sug: Suggestion = pausedDays >= 14 && raw.weight != null && r.loadable
    ? { ...raw, weight: snapDown(ctx.profile, r.equip, raw.weight * 0.9), gap: `Nach ${pausedDays} Tagen Pause 10 % leichter. Danach geht es normal weiter.` }
    : raw;
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
    // Nach dem letzten Satz einer Übung keine Pause
    onSetDone(sets.every((x, k) => k === i || x.done));
  };

  // Aufwärmsätze: abhaken wie ein Satz, danach 30 s bis zum ersten Arbeitssatz
  const warmN = useContext(WarmCtx).get(r.key) ?? 0;
  const warmSets = warmN ? warmupSets(r, baseW ?? null, ctx.profile).slice(0, warmN) : [];
  const warmDone = entry.warm ?? [];
  const markWarm = (i: number) => {
    const was = !!warmDone[i];
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const w = Array.from({ length: warmSets.length }, (_, k) => !!e.warm?.[k]);
      w[i] = !was;
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, warm: w } } };
    });
    if (!was) t.rest(i < warmSets.length - 1 ? "Pause, dann nächster Aufwärmsatz" : `Gleich: ${sug.name}, Satz 1`, WARM_REST);
  };

  const setFb = (fb: Feedback) => mut((s) => {
    const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
    return { ...s, entries: { ...s.entries, [r.key]: { ...e, feedback: e.feedback === fb ? undefined : fb } } };
  });

  const last = [...ctx.state.sessions].filter((x) => x.done && x.id !== session?.id && x.entries[r.key]?.sets.some((y) => y.done)).sort((a, b) => b.date.localeCompare(a.date))[0]?.entries[r.key];
  // Zuletzt: „3 × 12“ bei gleichen Sätzen, sonst „12/11/10“; Gewicht nur, wenn es vom heutigen abweicht
  const lastDone = last?.sets.filter((y) => y.done) ?? [];
  const lastW = lastDone.find((y) => y.weight != null)?.weight;
  const lastReps = lastDone.map((y) => y.reps ?? "?");
  const lastLine = last && r.kind === "strength" && lastDone.length
    ? (lastReps.every((x) => x === lastReps[0]) ? `${lastReps.length} × ${lastReps[0]}` : lastReps.join("/")) + (lastW != null && lastW !== sug.weight ? ` mit ${kg(lastW)}` : "")
    : null;
  // Nach der ersten Einheit eine konkrete Vorgabe statt des Bereichs: „3 × 13 @ 10 kg“
  const rp = parseReps(r.reps ?? "");
  const concrete = !!last && r.kind === "strength" && r.prog !== "none" && !rp.amrap && sug.targetReps != null;
  const doseLabel =
    r.kind === "timer" ? `${sug.minutes} Min`
    : r.kind === "interval" && r.interval ? `${r.interval.rounds} × ${fmt(r.interval.work)} Arbeit, ${fmt(r.interval.rest)} Pause`
    : r.kind === "hold" ? `${r.sets} × ${sug.seconds} s`
    : concrete ? `${r.sets} × ${sug.targetReps}${rp.suffix}${r.loadable && sug.weight != null ? ` @ ${kg(sug.weight)}` : ""}`
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
        {concrete ? <strong>{doseLabel}</strong> : doseLabel}
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
          {warmSets.length > 0 && (
            <div className="warm-line">
              <span className="muted small">Aufwärmen</span>
              {warmSets.map((w, i) => (
                <button key={i} className={`set-btn warm ${warmDone[i] ? "done" : ""}`} onClick={() => markWarm(i)} aria-label={`Aufwärmsatz ${i + 1}`}>
                  {warmDone[i] ? "✓" : `${w.reps} × ${w.kg != null ? kg(w.kg) : "leicht"}`}
                </button>
              ))}
              {warmSets.every((w) => w.kg == null) && <span className="muted small">etwa die Hälfte des Arbeitsgewichts</span>}
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
/** Stoppuhr, Rundentracker und Zeiteingabe für eine Bestie.
    Das letzte Rundenhäkchen stoppt und speichert die Zeit. „Wieder aufnehmen“ lässt die Uhr ab dem ersten Start weiterlaufen,
    gespeichert wird dann nur die neue Zeit. Der Stand überlebt Reiterwechsel (lokal je Bestie und Einheit). */
/** Abhakbare Schritte: Runden, bei nur einem Durchgang die einzelnen Übungen */
const stepsOf = (b: { rounds: number; work: string }): string[] =>
  b.rounds > 1 ? Array.from({ length: b.rounds }, (_, i) => String(i + 1)) : b.work.split(" · ");
interface Watch { startedAt: number | null; done: number; last: number | null }
const WATCH_KEY = (k: string) => `order:watch:${k}`;
function readWatch(k?: string): Watch {
  try { const v = k ? localStorage.getItem(WATCH_KEY(k)) : null; if (v) return JSON.parse(v) as Watch; } catch { /* egal */ }
  return { startedAt: null, done: 0, last: null };
}
function BeastTimer({ times, label, saved, steps, watchKey, onSave }: { times: { seconds: number }[]; label?: string; saved: number | null; steps?: string[]; watchKey?: string; onSave: (sec: number) => void }) {
  const t = useTimer();
  const [w, setW] = useState<Watch>(() => readWatch(watchKey));
  const put = (nw: Watch) => {
    setW(nw);
    try { if (watchKey) { if (nw.startedAt == null && nw.last == null) localStorage.removeItem(WATCH_KEY(watchKey)); else localStorage.setItem(WATCH_KEY(watchKey), JSON.stringify(nw)); } } catch { /* egal */ }
  };
  const [, tick] = useState(0);
  const [manual, setManual] = useState("");
  const [bad, setBad] = useState(false);
  const commit = () => {
    if (!manual.trim()) { setBad(false); return; }
    const sec = parseClock(manual);
    if (sec == null) { setBad(true); return; }
    onSave(Math.round(sec)); setManual(""); setBad(false);
    put({ startedAt: null, done: 0, last: null });
  };
  useEffect(() => {
    if (w.startedAt == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(iv);
  }, [w.startedAt]);
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  const running = w.startedAt != null;
  const elapsed = running ? (Date.now() - w.startedAt!) / 1000 : 0;
  const n = steps?.length ?? 0;
  const byLine = n > 0 && !/^\d+$/.test(steps![0]);
  const stop = (done: number) => { onSave(Math.round(elapsed)); put({ startedAt: null, done, last: w.startedAt }); };
  const tapRound = (i: number) => {
    if (!running) return;
    const done = i < w.done ? i : i + 1;
    if (done >= n) stop(n);
    else put({ ...w, done });
  };
  const resume = () => {
    if (t.running) t.stop(); // Pause nach der Bestie hinfällig
    put({ startedAt: w.last, done: Math.min(w.done, Math.max(0, n - 1)), last: null });
  };
  return (
    <div className="stack beast-timer">
      {label && <div className="small muted">{label}</div>}
      <div className="row wrap">
        {!running
          ? <button className="btn primary" onClick={() => put({ startedAt: Date.now(), done: 0, last: null })}>▶ Stoppuhr</button>
          : <button className="btn primary" onClick={() => stop(w.done)}>■ Stopp {fmt(elapsed)}</button>}
        {!running && w.last != null && Date.now() - w.last < 3 * 3600e3 && <button className="btn ghost" onClick={resume}>↺ Wieder aufnehmen</button>}
        {!running && <input type="text" inputMode="decimal" placeholder="oder mm.ss" value={manual} onChange={(e) => setManual(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} className="time-in" aria-invalid={bad} />}
      </div>
      {running && n > 0 && (
        <div className="stack">
          <div className="small muted">{byLine ? "Übung für Übung abhaken" : `Runde ${Math.min(w.done + 1, n)} von ${n}: nach jeder Runde abhaken`}, das letzte Häkchen stoppt die Uhr.</div>
          {byLine ? (
            <div className="stack rounds">
              {steps!.map((x, i) => (
                <button key={i} className={`step-btn ${i < w.done ? "done" : ""}`} onClick={() => tapRound(i)} aria-label={x}><span className="set-btn">{i < w.done ? "✓" : "○"}</span><span>{x}</span></button>
              ))}
            </div>
          ) : (
            <div className="drill-group rounds">
              {steps!.map((x, i) => (
                <button key={i} className={`set-btn ${i < w.done ? "done" : ""}`} onClick={() => tapRound(i)} aria-label={`Runde ${x}`}>{i < w.done ? "✓" : x}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {bad && <div className="small warn">„{manual}“ verstehe ich nicht. Bitte so: 12.34 oder 12:34.</div>}
      <div className="small">
        {saved ? <>Heute: <strong>{fmt(saved)}</strong>{pr && saved < pr ? " · neue Bestzeit" : ""}</> : null}
        {pr ? <span className="muted">{saved ? " · " : ""}Bestzeit {fmt(pr)}</span> : !saved ? <span className="muted">Noch keine Zeit</span> : null}
      </div>
    </div>
  );
}

/** Lastbestie: ein Gewicht (je Hantel) oder ein Band für alle Lastübungen, dazu Rekord und Timecap */
function LoadField({ beast, ctx, cur, onChange }: { beast: Beast; ctx: BeastCtx; cur?: BeastResult; onChange: (l: Partial<BeastResult>) => void }) {
  const kind = loadKind(beast);
  if (!kind) return null;
  const sug = suggestLoad(ctx.state, beast, ctx.profile);
  const rec = loadRecord(beast, ctx.state.beastTimes[beast.id]);
  const cap = capOf(beast)!;
  const over = cur?.seconds != null && cur.seconds > cap * 60;
  const pl = pctLift(beast);
  return (
    <div className="stack small">
      {kind === "band" ? (
        <Seg value={cur?.band ?? sug?.band ?? ""} options={ctx.profile.bands.map((b) => ({ value: b, label: b }))} onChange={(band) => onChange({ band })} />
      ) : (
        <div className="row">
          <input type="number" inputMode="decimal" className="kg-in" placeholder={sug?.kg != null ? String(sug.kg) : "kg"} value={cur?.kg ?? ""}
            onChange={(e) => onChange({ kg: e.target.value === "" ? undefined : parseFloat(e.target.value.replace(",", ".")) })} />
          <span className="muted">kg {kind === "barbell" ? "Langhantel" : kind === "kettlebell" ? "Kettlebell" : "je Kurzhantel"}, für alle Lastübungen</span>
        </div>
      )}
      {pl && !sug && <div className="muted">1RM {pl.exercise} noch unbekannt: Gewicht selbst festlegen.</div>}
      {sug && cur?.kg == null && !cur?.band && <div className="muted">Vorschlag: {sug.kg != null ? kg(sug.kg) : sug.band} ({sug.why})</div>}
      {rec && <div className="muted">Rekord: {rec.kg != null ? kg(rec.kg) : rec.band}</div>}
      {over && <div className="warn">Über dem Timecap: zählt nicht als Rekord, nächstes Mal eine Stufe leichter.</div>}
      {cur?.seconds != null && !over && (
        <div className="row wrap">
          <span>Technik:</span>
          <Seg value={cur.tech ?? ""} options={[{ value: "gut", label: "sauber" }, { value: "schlecht", label: "unsauber" }]} onChange={(tech) => onChange({ tech: tech as "gut" | "schlecht" })} />
          <span className="muted">{cur.tech === "gut" ? "nächstes Mal eine Stufe höher" : cur.tech === "schlecht" ? "nächstes Mal eine Stufe leichter" : ""}</span>
        </div>
      )}
    </div>
  );
}

export function BeastCard({ blockId, beast, ctx, session, mut, note, easy, nextBeast, watchBase }: { blockId: string; beast: Beast | null; ctx: BeastCtx; watchBase: string; session?: Session; mut: (fn: (s: Session) => Session) => void; note?: string; easy?: boolean; nextBeast?: string }) {
  const t = useTimer();
  if (!beast) return <section className="card"><div className="muted">Keine passende Bestie für dieses Equipment gefunden.</div></section>;
  // Dauer: bei Serien aus den Teilen, mit gemessenen Zeiten, wo vorhanden
  const effMin = beast.parts
    ? beast.parts.reduce((m, pt) => m + beastMinutes(beastById(pt.id)!, ctx.state.beastTimes[pt.id]).min, 0) + ((beast.parts.length - 1) * COMBO_REST) / 60
    : beastMinutes(beast, ctx.state.beastTimes[beast.id]).min;
  const measured = beast.parts ? beast.parts.every((pt) => (ctx.state.beastTimes[pt.id] ?? []).length) : (ctx.state.beastTimes[beast.id] ?? []).length > 0;
  // Zeit nachgetragen, Einheit schon abgeschlossen: gleich in die Bestzeiten, alte Zeit dieses Tages ersetzen
  const lateTime = (id: string, sec: number, old: number | null | undefined, load?: Partial<BeastResult>) => {
    if (!session?.done || easy) return;
    ctx.update((st) => {
      const list = (st.beastTimes[id] ?? []).filter((x) => !(x.date === session.date && x.seconds === old));
      const { kg: k, band, tech } = load ?? {};
      return { ...st, beastTimes: { ...st.beastTimes, [id]: [...list, { date: session.date, seconds: sec, ...(k != null ? { kg: k } : {}), ...(band ? { band } : {}), ...(tech ? { tech } : {}) }] } };
    });
  };
  // Ergebnis dieses Bestien-Blocks (alte Einheiten: beast/beastParts)
  const runOf = (s?: Session): BeastRun => s?.beastRuns?.[blockId] ?? (!s?.beastRuns && (s?.beast?.id === beast.id || s?.beastParts?.length) ? { beast: s?.beast, parts: s?.beastParts } : {});
  const run = runOf(session);
  const mutRun = (fn: (r: BeastRun) => BeastRun) => mut((s) => ({ ...s, beastRuns: { ...(s.beastRuns ?? {}), [blockId]: fn(runOf(s)) } }));
  const cur = run.beast?.id === beast.id ? run.beast : undefined;
  // Lastbestie: ohne eigene Eingabe gilt der Vorschlag
  const loadOf = (b: Beast, r?: BeastResult) => {
    if (!isLoadBeast(b)) return {};
    const sg = suggestLoad(ctx.state, b, ctx.profile);
    return { kg: r?.kg ?? sg?.kg, band: r?.band ?? sg?.band, tech: r?.tech };
  };
  // Technik oder Gewicht nachträglich geändert, Einheit schon abgeschlossen: Eintrag in den Bestzeiten mitziehen
  const syncTime = (id: string, sec: number | null | undefined, patch: Partial<BeastResult>) => {
    if (!session?.done || sec == null) return;
    const { kg: k, band, tech } = patch;
    const p2 = { ...(k !== undefined ? { kg: k } : {}), ...(band !== undefined ? { band } : {}), ...(tech !== undefined ? { tech } : {}) };
    ctx.update((st) => ({ ...st, beastTimes: { ...st.beastTimes, [id]: (st.beastTimes[id] ?? []).map((x) => (x.date === session.date && x.seconds === sec ? { ...x, ...p2 } : x)) } }));
  };
  const saveSingle = (sec: number) => {
    const l = loadOf(beast, cur);
    lateTime(beast.id, sec, cur?.seconds, l);
    mutRun((r) => ({ ...r, beast: { ...(r.beast?.id === beast.id ? r.beast : {}), ...l, id: beast.id, seconds: sec, ...(easy ? { easy } : {}) } }));
    // Zwei Bestien in der Einheit: Pause bis zur nächsten
    if (nextBeast) t.rest(`Pause, dann ${nextBeast}`, COMBO_REST);
  };
  const setLoadSingle = (load: Partial<BeastResult>) => {
    syncTime(beast.id, cur?.seconds, load);
    mutRun((r) => ({ ...r, beast: { ...(r.beast?.id === beast.id ? r.beast : { seconds: null }), id: beast.id, ...load } }));
  };
  // Serie: jeder Teil einzeln, jede Zeit zählt für ihre Bestie (ein Doppel/Triple ist ein Teil mit eigener Bestzeit)
  const parts = beast.parts ?? [];
  const curPart = (u: number) => (run.parts?.[u]?.id === parts[u].id ? run.parts[u] : undefined);
  const patchUnit = (u: number, patch: Partial<BeastResult>) => mutRun((r) => {
    const arr = parts.map((x, i) => (r.parts?.[i]?.id === x.id ? r.parts[i] : { id: x.id, seconds: null }));
    arr[u] = { ...arr[u], ...patch, id: parts[u].id };
    return { ...r, parts: arr };
  });
  const saveUnit = (u: number, sec: number) => {
    const c = curPart(u);
    const l = loadOf(beastById(parts[u].id)!, c);
    lateTime(parts[u].id, sec, c?.seconds, l);
    patchUnit(u, { ...l, seconds: sec, ...(easy ? { easy } : {}) });
    if (u < parts.length - 1) t.rest(`Pause, dann ${parts[u + 1].name}`, COMBO_REST);
    else if (nextBeast) t.rest(`Pause, dann ${nextBeast}`, COMBO_REST);
  };
  const work = (b: { id?: string; work: string; rounds: number; times?: number; repeat?: number; name?: string }) => {
    const k = b.times ?? b.repeat ?? 1;
    return (
      <>
        <div className="muted small">{k > 1 ? `${k} × ${b.rounds / k} Runden am Stück` : `${b.rounds} ${b.rounds === 1 ? "Durchgang" : "Runden"}`}</div>
        <ul className="beast-work">{b.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
      </>
    );
  };
  return (
    <section className="card beast">
      <div className="block-label amber">{capOf(beast) != null ? `Lastbestie · Timecap ${capOf(beast)} Min` : `Bestie · ${measured ? "" : "~"}${Math.round(effMin)} Min`}</div>
      <div className="beast-name">{beast.name}</div>
      {easy && <div className="muted small">Grundlagentempo, zählt nicht für die Bestzeit.</div>}
      {parts.length ? (
        <>
          {parts.map((pt, u) => (
            <div key={u} className="stack">
              <div className="small"><strong>{u + 1}. {pt.name}</strong></div>
              {work(pt)}
              {isLoadBeast(beastById(pt.id)!) && <LoadField beast={beastById(pt.id)!} ctx={ctx} cur={curPart(u)} onChange={(l) => { syncTime(pt.id, curPart(u)?.seconds, l); patchUnit(u, l); }} />}
              <BeastTimer times={isLoadBeast(beastById(pt.id)!) ? [] : ctx.state.beastTimes[pt.id] ?? []} saved={curPart(u)?.seconds ?? null} steps={stepsOf(pt)} watchKey={`${watchBase}:${blockId}:${u}:${pt.id}`} onSave={(sec) => saveUnit(u, sec)} />
            </div>
          ))}
        </>
      ) : (
        <>
          {work(beast)}
          {isLoadBeast(beast) && <LoadField beast={beast} ctx={ctx} cur={cur} onChange={setLoadSingle} />}
          <BeastTimer times={isLoadBeast(beast) ? [] : ctx.state.beastTimes[beast.id] ?? []} saved={cur?.seconds ?? null} steps={stepsOf(beast)} watchKey={`${watchBase}:${blockId}:${beast.id}`} onSave={saveSingle} />
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
        {/* Name und Ort stehen schon im Tagesknopf darüber */}
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.reduced ? " · −1 Satz" : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
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
          if (it.drills) {
            if (it.block.type === "module" && it.block.module !== "sword") return (
              <div key={i} className="preview-group">
                <div className="block-label amber">{it.block.module === "flow" ? FLOWS[it.block.variant]?.name : `Schwerpunkt: ${SHARPEN[it.block.variant]?.name} · Erhaltung`}</div>
                {it.drills.map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.value}×` : fmt(d.value)}{d.sides ? " je Seite" : ""}</span></div>)}
              </div>
            );
            return <div key={i} className="preview-row"><span>Schwert: {it.drills.map((d) => d.name).join(", ")}</span></div>;
          }
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

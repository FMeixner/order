import { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "../data";
import { backoffLoad, advance, suggest, type Suggestion } from "../engine/progression";
import { guidedKeys, resolveSlot, toGuided, type Resolved } from "../engine/resolve";
import { affectDowngrade, beastClass, beastMinutes, CLASS_LABEL, expandDrills, isAWeek, moduleDrills, pickBeast, type DrillView } from "../engine/plan";
import { snapNearest } from "../engine/loads";
import type { AppState, Beast, Block, EquipmentProfile, Feedback, Focus, PlanBlock, Session, SessionEntry, SetEntry } from "../types";
import { Collapse, Desc, kg } from "./common";
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

/* ---------- Slots dieser Einheit sammeln ---------- */
interface Item { block: Block; resolved: Resolved[]; beast?: Beast | null; drills?: DrillView[] }

function slotsOf(b: Block, ctx: SessionCtx): Resolved[] {
  const r = (s: Parameters<typeof resolveSlot>[0]) => {
    if (s.gate_week && ctx.week < s.gate_week) return null;
    return resolveSlot(s, ctx.profile, ctx.reduced && (s.kind ?? "strength") !== "timer");
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

export function collectItems(ctx: SessionCtx): Item[] {
  const role = ctx.focus.roles[ctx.roleKey];
  const ab = isAWeek(ctx.week) ? "A" : "B";
  const items: Item[] = role.blocks
    .filter((b) => !b.rotation || b.rotation === ab)
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
      if (cur.beast?.seconds) beastTimes[cur.beast.id] = [...(beastTimes[cur.beast.id] ?? []), { date: ctx.date, seconds: cur.beast.seconds }];
      const feelingLog = feeling != null ? [...st.feeling, { date: ctx.date, sessionId: id, value: feeling }] : st.feeling;
      return { ...st, slots, beastTimes, feeling: feelingLog, sessions: st.sessions.map((s) => (s.id === id ? { ...s, done: true, date: ctx.date } : s)) };
    });
  };

  return (
    <div className="stack session">
      <div className="session-head">
        <h2>{role.name}</h2>
        <div className="muted small">{ctx.profile.name} · etwa {role.minutes} Min · {isAWeek(week) ? "A-Woche" : "B-Woche"}{ctx.reduced ? " · −1 Satz" : ""}</div>
        {role.note && <p className="note">{role.note}</p>}
        {items.some((it) => it.resolved.some((r) => r.loadable && !state.slots[r.key]?.weight)) && !session?.done && <p className="note">Neue Übungen: Wähle ein Startgewicht, bei dem am Ende noch 2–3 Wiederholungen gegangen wären. Danach rechnet die App. Was die Feedback-Knöpfe bedeuten, steht unter „?“ oben rechts.</p>}
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
  if (b.type === "beast") return <BeastCard beast={it.beast ?? null} ctx={ctx} session={session} mut={mut} note={b.note} />;
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
        <div className="block-label teal">{b.label ?? "Superset"} · direkt nacheinander, dann {b.rest ?? 60} s Pause</div>
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

function SlotCard({ r, ctx, session, mut, onSetDone }: { r: Resolved; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; onSetDone: () => void }) {
  const t = useTimer();
  const st = ctx.state.slots[r.key];
  const sug: Suggestion = suggest(r, st, ctx.week);
  const entry: SessionEntry = session?.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
  const sets: SetEntry[] = Array.from({ length: r.kind === "timer" || r.kind === "interval" ? 1 : r.sets }, (_, i) => entry.sets[i] ?? { done: false });
  const desc = EXERCISES[sug.name]?.desc ?? EXERCISES[r.name]?.desc;
  const topBack = r.prog === "topset" && sug.weight != null ? backoffLoad(ctx.profile, r, sug.weight) : null;
  const defaultWeight = (i: number) => (r.prog === "topset" && i > 0 ? topBack : sug.weight);

  const writeSet = (i: number, patch: Partial<SetEntry>) =>
    mut((s) => {
      const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
      const arr = Array.from({ length: sets.length }, (_, k) => e.sets[k] ?? { done: false });
      arr[i] = { ...arr[i], ...patch };
      return { ...s, entries: { ...s.entries, [r.key]: { ...e, name: sug.name, stage: sug.stage, sets: arr } } };
    });

  const markDone = (i: number) => {
    const cur = sets[i];
    if (cur.done) return writeSet(i, { done: false });
    const prev = i > 0 ? sets[i - 1] : undefined;
    writeSet(i, {
      done: true,
      reps: cur.reps ?? prev?.reps ?? sug.targetReps ?? undefined,
      weight: cur.weight !== undefined ? cur.weight : r.loadable ? (i > 0 && r.prog !== "topset" ? prev?.weight ?? defaultWeight(i) : defaultWeight(i)) : null,
    });
    onSetDone();
  };

  const setFb = (fb: Feedback) => mut((s) => {
    const e: SessionEntry = s.entries[r.key] ?? { key: r.key, slotId: r.slotId, name: sug.name, prog: r.prog, sets: [] };
    return { ...s, entries: { ...s.entries, [r.key]: { ...e, feedback: e.feedback === fb ? undefined : fb } } };
  });

  const doseLabel =
    r.kind === "timer" ? `${sug.minutes} Min`
    : r.kind === "interval" && r.interval ? `${r.interval.rounds} × ${fmt(r.interval.work)} Arbeit, ${fmt(r.interval.rest)} Pause`
    : r.kind === "hold" ? `${r.sets} × ${sug.seconds} s`
    : `${r.sets} × ${sug.repsLabel}`;
  const showFb = r.prog !== "none";

  return (
    <div className="slot">
      <div className="slot-head">
        <div className="slot-title">
          <span className="slot-name">{sug.name}</span>
          <Desc text={desc} />
          {r.ladder && <span className="tag">Stufe {sug.stage + 1}/{r.ladder.length}</span>}
          {r.proposal && <span className="tag">Vorschlag</span>}
          {r.guided && <span className="tag teal" title="Phase mit hoher Alltagslast">geführt</span>}
        </div>
        <div className="slot-dose">{doseLabel}</div>
      </div>
      {r.missingEquipment && <div className="note warn small">Für diese Übung fehlt im Profil „{ctx.profile.name}“ Equipment. Nimm eine passende Alternative.</div>}
      {r.note && <div className="muted small">{r.note}</div>}
      {r.loadable && (
        <div className="muted small">
          {sug.weight != null
            ? r.prog === "topset" ? <>Top-Satz <strong>{kg(sug.weight)}</strong>, danach {kg(topBack)}</> : <>Vorschlag <strong>{kg(sug.weight)}</strong></>
            : sug.hint}
        </div>
      )}

      {r.kind === "strength" && (
        <div className="sets">
          {sets.map((s, i) => (
            <div key={i} className={`set-row ${s.done ? "done" : ""}`}>
              <button className={`set-btn ${s.done ? "done" : ""}`} onClick={() => markDone(i)} aria-label={`Satz ${i + 1}`}>{s.done ? "✓" : i + 1}</button>
              <input type="number" inputMode="numeric" className="reps-in" placeholder={sug.targetReps != null ? String(sug.targetReps) : "Wdh"}
                value={s.reps ?? ""} onChange={(e) => writeSet(i, { reps: e.target.value === "" ? undefined : parseInt(e.target.value) })} aria-label="Wiederholungen" />
              <span className="muted small">Wdh</span>
              {r.loadable && (
                <>
                  <input type="number" inputMode="decimal" className="kg-in" placeholder={defaultWeight(i) != null ? String(defaultWeight(i)) : "kg"}
                    value={s.weight ?? ""} onChange={(e) => writeSet(i, { weight: e.target.value === "" ? undefined : parseFloat(e.target.value.replace(",", ".")) })}
                    onBlur={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v)) writeSet(i, { weight: snapNearest(ctx.profile, r.equip, v) }); }}
                    aria-label="Gewicht" />
                  <span className="muted small">kg</span>
                </>
              )}
              {r.prog === "topset" && <span className="muted small">{i === 0 ? "Top" : "Back-off"}</span>}
            </div>
          ))}
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
function BeastCard({ beast, ctx, session, mut, note }: { beast: Beast | null; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; note?: string }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const [manual, setManual] = useState("");
  useEffect(() => {
    if (startedAt == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(iv);
  }, [startedAt]);
  if (!beast) return <section className="card"><div className="muted">Keine passende Bestie für dieses Equipment gefunden.</div></section>;
  const times = ctx.state.beastTimes[beast.id] ?? [];
  const pr = times.length ? Math.min(...times.map((x) => x.seconds)) : null;
  const eff = beastMinutes(beast, times);
  const cls = beastClass(eff.min);
  const saved = session?.beast?.id === beast.id ? session.beast.seconds : null;
  const running = startedAt != null;
  const elapsed = running ? (Date.now() - startedAt!) / 1000 : 0;
  const save = (sec: number) => mut((s) => ({ ...s, beast: { id: beast.id, seconds: Math.round(sec) } }));
  return (
    <section className="card beast">
      <div className="block-label amber">Bestiarium · {CLASS_LABEL[cls]} · ~{Math.round(eff.min)} Min {eff.measured ? "gemessen" : "geschätzt"}</div>
      <div className="beast-name">{beast.name}</div>
      <div className="muted small">{beast.rounds} {beast.rounds === 1 ? "Durchgang" : "Runden"}</div>
      <ul className="beast-work">{beast.work.split(" · ").map((w, i) => <li key={i}>{w}</li>)}</ul>
      {note && <div className="muted small">{note}</div>}
      <div className="row">
        {!running
          ? <button className="btn primary" onClick={() => setStartedAt(Date.now())}>▶ Stoppuhr</button>
          : <button className="btn primary" onClick={() => { save(elapsed); setStartedAt(null); }}>■ Stopp {fmt(elapsed)}</button>}
        <input type="text" inputMode="numeric" placeholder="oder mm:ss" value={manual} onChange={(e) => setManual(e.target.value)}
          onBlur={() => { const m = manual.match(/^(\d+):(\d{1,2})$/); if (m) { save(parseInt(m[1]) * 60 + parseInt(m[2])); setManual(""); } }} className="time-in" />
      </div>
      <div className="small">
        {saved ? <>Heute: <strong>{fmt(saved)}</strong>{pr && saved < pr ? " · neue Bestzeit" : ""}</> : null}
        {pr ? <span className="muted"> · Bestzeit {fmt(pr)}</span> : <span className="muted"> · noch keine Zeit</span>}
      </div>
    </section>
  );
}

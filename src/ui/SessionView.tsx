/* Eine Einheit: Ansicht der laufenden Woche und Vorschau künftiger Wochen. */
import { useEffect, useMemo, useState } from "react";
import { FLOWS, SHARPEN } from "../data";
import type { BeastResult, Block, Session, WeaponModule } from "../types";
import { estimateRole } from "../engine/duration";
import { swapRunBeast } from "../engine/cardio";
import { asWeaponBlock, isWeaponModule, MODULE_LABEL, moduleDrills, pathLevel, pathNext, PATHS, coolDrills, roleAt, roleDrills, shortSwordDrills, weekdayOf } from "../engine/plan";
import { dayMods } from "../engine/dayadj";
import { advance, estimateEnv, sharedState, suggest } from "../engine/progression";
import type { Resolved } from "../engine/resolve";
import { allRuns } from "../engine/runs";
import { warmupKeys } from "../engine/warmup";
import { fmt, useTimer } from "./Timer";
import { Collapse } from "./common";
import { Sign } from "./Signs";
import { BeastCard } from "./session/BeastCard";
import { CallCard } from "./session/CallCard";
import { allDrillsDone, DrillList, DrillSection, toggleDrill } from "./session/Drills";
import { SlotCard, WarmCtx } from "./session/SlotCard";
import { boostOf, type SessionCtx, sessionId } from "./session/ctx";
import { collectItems, type Item, pinBeasts } from "./session/items";
import { PURPOSE_LABEL, slotsFor } from "../engine/sharpen";
import { dayGear } from "./session/gear";
import { who5Due } from "../engine/who5";
import { Who5 } from "./Who5";

/** Geschätzte Minuten dieser Einheit in dieser Woche, auf 5 gerundet */
const minutesFor = (ctx: SessionCtx) => Math.max(5, Math.round(estimateRole(roleAt(ctx.focus.roles[ctx.roleKey], ctx.profile), ctx.profile, ctx.state.user, ctx.week, ctx.reduced, boostOf(ctx)).total / 5) * 5);

/** Geführte Übungen bei hoher Phasenlast (1.19): Begründung hinter dem Lastsymbol, ein Tap klappt sie auf (1.40) */
function GuidedNote() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="info-btn" onClick={() => setOpen((o) => !o)} aria-label="Warum heute geführte Übungen?" aria-expanded={open} title="Hohe Alltagslast — Begründung anzeigen">
        <Sign kind="load-high" size={16} />
      </button>
      {open && <p className="note">Phase mit hoher Alltagslast: Etwa die Hälfte der Übungen läuft heute an Maschine oder Kabel. Der erste große Lift bleibt frei.</p>}
    </>
  );
}

/* ---------- Hauptansicht ---------- */
export function SessionView(ctx: SessionCtx) {
  const { state, update, focus, roleKey, week, block } = ctx;
  const role = roleAt(focus.roles[roleKey], ctx.profile);
  const id = sessionId(block.id, week, roleKey);
  const session = state.sessions.find((s) => s.id === id);
  const items = useMemo(() => collectItems(ctx).filter((it) => !it.sword || it.drills || it.resolved.length), [ctx]);
  const env = useMemo(() => estimateEnv(state, ctx.date), [state, ctx.date]);
  // Aufwärmsätze nach Last und Risiko (erste schwere Übung je Körperhälfte), Gewicht aus dem Vorschlag
  const warmMap = useMemo(() => warmupKeys(items.flatMap((it) => it.resolved), (r) => { const x = r as Resolved; return suggest(x, sharedState(state.slots, x, env), week, ctx.profile).weight ?? null; }), [items, state.slots, week, ctx.profile, env]);
  const warm = roleDrills(role, "wu", ctx.profile, state.user, week);
  const cool = coolDrills(role, ctx.profile, state.user, week, dayMods(state, block, week, roleKey, weekdayOf(ctx.date)).short);
  const [feeling, setFeeling] = useState<number | null>(null);

  const mut = (fn: (s: Session) => Session) =>
    update((st) => {
      const cur = st.sessions.find((s) => s.id === id) ?? {
        id, date: ctx.date, blockId: block.id, focusId: focus.id, week, role: roleKey, profileId: ctx.profile.id,
        entries: {}, drills: {}, done: false,
      };
      const next = pinBeasts(fn({ ...cur, date: cur.done ? cur.date : ctx.date, profileId: cur.done ? cur.profileId : ctx.profile.id }), items);
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
        slots[r.key] = advance(r, sharedState(slots, r, estimateEnv(st, ctx.date)), e, ctx.profile, ctx.date);
      }
      const beastTimes = { ...st.beastTimes };
      const load = (r: BeastResult) => ({ ...(r.kg != null ? { kg: r.kg } : {}), ...(r.band ? { band: r.band } : {}), ...(r.tech ? { tech: r.tech } : {}), ...(r.adj ? { adj: r.adj } : {}) });
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
        <FocusLine role={role} ctx={ctx} items={items} />
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.modsLabel ? ` · ${ctx.modsLabel}` : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
        {role.note && <p className="note">{role.note}</p>}
        {items.some((it) => it.resolved.some((r) => r.guided)) && <GuidedNote />}
        {session?.done && <p className="note ok">Abgeschlossen am {session.date.split("-").reverse().join(".")}. Änderungen sind noch möglich, die Progression ist aber schon fortgeschrieben.</p>}
      </div>

      <DrillSection kind="wu" drills={warm} ctx={ctx} session={session} mut={mut} />

      <WarmCtx.Provider value={warmMap}>
        {items.map((it, i) => (
          <ItemCard key={i} it={it} ctx={ctx} session={session} mut={mut} nextBeast={items.slice(i + 1).find((x) => x.beast)?.beast?.name} />
        ))}
      </WarmCtx.Provider>

      <DrillSection kind="cd" drills={cool} ctx={ctx} session={session} mut={mut} />

      <div className="card finish">
        {!session?.done && (
          <div className="stack fs">
            <div className="small">Wie hat sich die Einheit angefühlt?</div>
            <div className="fs-scale" role="radiogroup" aria-label="Befinden">
              {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
                <button key={v} role="radio" aria-checked={feeling === v} className={feeling === v ? "on" : ""} onClick={() => setFeeling(feeling === v ? null : v)}>{v > 0 ? `+${v}` : v}</button>
              ))}
            </div>
            <div className="fs-ends muted" aria-hidden><span>sehr schlecht</span><span>neutral</span><span>sehr gut</span></div>
          </div>
        )}
        <textarea placeholder="Notiz zur Einheit (optional)" value={session?.note ?? ""} onChange={(e) => mut((s) => ({ ...s, note: e.target.value }))} rows={2} />
        {!session?.done
          ? <button className="btn primary wide" onClick={() => { if (!session) mut((s) => s); finish(); }}>Einheit abschließen</button>
          : <button className="btn ghost wide" onClick={() => update((st) => ({ ...st, sessions: st.sessions.map((s) => (s.id === id ? { ...s, done: false } : s)) }))}>Wieder öffnen</button>}
      </div>
      {session?.done && who5Due(state, block, week) && <Who5 update={update} block={block} week={week} today={ctx.date} />}
    </div>
  );
}


/** Stufe im Lernweg eines Waffen-Moduls; der nächste Test öffnet die nächste Stufe (abhaken unter Setup › Können) */
function PathLevel({ module, skills }: { module: WeaponModule; skills: string[] | null | undefined }) {
  const i = pathLevel(module, skills);
  const next = pathNext(module, skills);
  return (
    <div className="muted small">
      Stufe {i + 1} von {PATHS[module].levels.length}: {PATHS[module].levels[i].name}
      {next && <> · Weiter zu {next.level}, wenn das sitzt: {next.test}. Abhaken unter Setup › Können.</>}
    </div>
  );
}

/** Schwerpunkt oder „Mehr vom Ordensziel“ für diesen Orden (diese Phase) entfernen – wie ein Übungstausch, nur ohne Ersatz.
    Zurück: Plan › Phase › Schwerpunkt „Automatisch“. */
function DropSlot({ ctx }: { ctx: SessionCtx }) {
  const [ask, setAsk] = useState(false);
  const drop = () => ctx.update((st) => ({ ...st, plan: st.plan.map((x) => (x.id === ctx.block.id ? { ...x, sharpen: "off" } : x)) }));
  return ask ? (
    <div className="row wrap small">
      <span className="muted">Für {ctx.focus.name} in dieser Phase entfernen? Zurückholen im Plan unter Schwerpunkt.</span>
      <button className="btn small" onClick={drop}>Entfernen</button>
      <button className="btn ghost small" onClick={() => setAsk(false)}>Abbrechen</button>
    </div>
  ) : (
    <button className="btn ghost small drop-slot" onClick={() => setAsk(true)}>Für diesen Orden entfernen</button>
  );
}

/** Überschrift der Schwerpunkt-Karte mit dem echten Zweck (Testdefizit, Erhalt, Double down, Sekundärziel, selbst gewählt) */
function sharpenTitle(ctx: SessionCtx, variant: string): string {
  const s1 = slotsFor(ctx.state, ctx.block).s1;
  const why = s1.domain === variant ? (s1.purpose ? PURPOSE_LABEL[s1.purpose] : s1.source === "manual" ? "selbst gewählt" : "") : "";
  return `Schwerpunkt: ${SHARPEN[variant]?.name ?? variant}${why ? ` · ${why}` : ""}`;
}

/** Schwert-, Flow- und Schwerpunkt-Block: aufklappbare Karte wie das Warm-up —
    ist alles abgehakt, klappt sie nach kurzer Zeit ein wie eine Übungskarte */
function ModuleCard({ it, ctx, session, mut }: { it: Item; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void }) {
  // Aufrufer (ItemCard) stellt module-Block mit drills sicher
  const b = it.block as Extract<Block, { type: "module" }>;
  const drills = it.drills ?? [];
  const prefix = b.module === "flow" ? "fl" : b.module === "sharpen" ? "sh" : b.module === "longsword" ? "ls" : b.module === "stab" ? "sb" : "dm";
  const title = it.fill ?? (b.module === "flow" ? FLOWS[b.variant]?.name ?? "Flow" : b.module === "sharpen" ? sharpenTitle(ctx, b.variant) : isWeaponModule(b.module) ? MODULE_LABEL[b.module] : "");
  const allDone = allDrillsDone(drills, session?.drills ?? {}, prefix);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!allDone) return;
    const id = setTimeout(() => setOpen(false), 2500);
    return () => clearTimeout(id);
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Collapse title={title} meta={`${drills.length} Übungen`} tone="amber" open={open} onOpenChange={setOpen}>
      {it.sword && <div className="muted small">Statt {MODULE_LABEL[it.sword.module]}: „{ctx.profile.name}“ hat kein Schwert und keinen Stock. Mit Stock kommt hier dein {MODULE_LABEL[it.sword.module]}-Block.</div>}
      {b.module === "flow" && <div className="muted small">Jede Zeile ist eine Kette: einmal durch ist eine Wiederholung. Erst alle Wiederholungen einer Seite, dann die andere.</div>}
      {b.module === "sharpen" && <div className="muted small">{SHARPEN[b.variant]?.why}</div>}
      {isWeaponModule(b.module) && PATHS[b.module].leveled.includes(b.variant) && <PathLevel module={b.module} skills={ctx.state.user.skills} />}
      <DrillList drills={drills} done={session?.drills ?? {}} prefix={prefix} onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))} />
      {(b.module === "sharpen" || it.fill) && <DropSlot ctx={ctx} />}
    </Collapse>
  );
}

function ItemCard({ it, ctx, session, mut, nextBeast }: { it: Item; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; nextBeast?: string }) {
  const b = it.block;
  const t = useTimer();
  if (b.type === "beast") return <BeastCard blockId={b.id} beast={it.beast ?? null} cardio={it.cardio} ctx={ctx} session={session} mut={mut} note={b.note || undefined} easy={b.pace === "easy"} nextBeast={nextBeast} watchBase={sessionId(ctx.block.id, ctx.week, ctx.roleKey)} />;
  if (b.type === "module" && it.call) return <CallCard call={it.call} ctx={ctx} session={session} mut={mut} />;
  if (b.type === "module" && it.drills) return <ModuleCard it={it} ctx={ctx} session={session} mut={mut} />;
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
        <div className="block-label teal">Im Wechsel{b.sameStation && b.label && it.resolved.every((r) => r.equip === "cable") ? ` · ${b.label}` : ""} · {b.rest ?? 60} s Pause</div>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(lastSet) => { if (r === last && !lastSet) t.rest("Pause, dann nächste Runde", b.rest ?? 60); }} />)}
      </section>
    );
  }
  if (b.type === "module") {
    return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => {}} />)}</section>;
  }
  return <section className="card">{it.fill && <div className="block-label amber">{it.fill}</div>}{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(last) => { if (!last) t.rest(`Pause nach ${r.name}`, r.rest); }} />)}{it.fill && <DropSlot ctx={ctx} />}</section>;
}


/* ---------- Vorschau einer künftigen Woche: nur Übungen und Dosis, keine Eingaben ---------- */
function previewDose(r: Resolved): string {
  if (r.kind === "timer") return `${r.minutes ?? 10} Min`;
  if (r.kind === "interval" && r.interval) return `${r.interval.rounds} × ${fmt(r.interval.work)} / ${fmt(r.interval.rest)}`;
  if (r.kind === "hold") return `${r.sets} × ${r.hold ?? 20} s`;
  return `${r.sets} × ${r.reps}`;
}
const BLOCK_TITLE: Partial<Record<Block["type"], string>> = { superset: "Superset", contrast: "Kontrastpaar" };

/** Fokus der Einheit und was der Tag an Ausrüstung braucht (zwischen Tagesknöpfen und Warm-up) */
function FocusLine({ role, ctx, items }: { role: { name: string }; ctx: SessionCtx; items: Item[] }) {
  const gear = dayGear(items);
  return (
    <div className="session-focus">
      <strong>{role.name}</strong>
      <span className="muted small">{ctx.profile.name}{gear.length ? ` · ${gear.join(", ")}` : " · nur Körpergewicht"}</span>
    </div>
  );
}

export function SessionPreview(ctx: SessionCtx) {
  const role = roleAt(ctx.focus.roles[ctx.roleKey], ctx.profile);
  const items = collectItems(ctx);
  const warm = roleDrills(role, "wu", ctx.profile, ctx.state.user, ctx.week);
  const cool = coolDrills(role, ctx.profile, ctx.state.user, ctx.week, dayMods(ctx.state, ctx.block, ctx.week, ctx.roleKey, weekdayOf(ctx.date)).short);
  return (
    <div className="stack session">
      <div className="session-head">
        <FocusLine role={role} ctx={ctx} items={items} />
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.modsLabel ? ` · ${ctx.modsLabel}` : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
      </div>
      <section className="card preview">
        <div className="preview-row muted"><span>Warm-up</span><span>{warm.length} Übungen</span></div>
        {items.map((it, i) => {
          const title = it.fill ?? BLOCK_TITLE[it.block.type];
          if (it.beast !== undefined) {
            const bst = it.beast ? swapRunBeast(it.beast, it.cardio) : it.beast;
            const parts = bst?.parts ?? (bst ? [{ id: bst.id, name: bst.name, rounds: bst.rounds, work: bst.work, times: bst.repeat ?? 1 }] : []);
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
          if (it.call) return (
            <div key={i} className="preview-group">
              <div className="block-label amber">{it.call.def.name} · Stufe {it.call.levelName}</div>
              <div className="preview-row"><span>{it.call.rounds} Runden à {it.call.def.work} s, {it.call.def.rest} s Pause</span><span className="mono muted">{it.call.pool.filter((c, j, a) => a.indexOf(c) === j).slice(0, 4).join(" · ")} …</span></div>
              {it.call.replaced && <div className="preview-row muted"><span>Statt „{it.call.replaced}“ (ohne Schwert und Stock)</span></div>}
            </div>
          );
          if (it.sword && !ctx.profile.has.sword) {
            // Sonderrolle Waffe: die Vorschau zeigt den Waffenblock auch für ein Profil ohne Schwert und Stock, darunter den Ersatz
            const sw = it.sword;
            const lv = PATHS[sw.module].leveled.includes(sw.variant) ? PATHS[sw.module].levels[pathLevel(sw.module, ctx.state.user.skills)].name : null;
            const alt = it.block.type === "module" && it.block.module === "flow" ? FLOWS[it.block.variant]?.name : it.resolved.map((r) => `${r.name} · ${previewDose(r)}`).join(", ");
            return (
              <div key={i} className="preview-group">
                <div className="block-label amber">{MODULE_LABEL[sw.module]}{lv ? ` · Stufe ${lv}` : ""}</div>
                {(sw.short ? shortSwordDrills(moduleDrills(sw.variant, ctx.state.user, ctx.week, sw.module)) : moduleDrills(sw.variant, ctx.state.user, ctx.week, sw.module)).map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.sets && d.sets > 1 ? `${d.sets} × ` : ""}${d.value}` : fmt(d.value * (d.sets ?? 1))}{d.sides ? " je Seite" : ""}</span></div>)}
                <div className="preview-row muted"><span>Ohne Schwert und Stock („{ctx.profile.name}“): {alt || "entfällt"}</span></div>
              </div>
            );
          }
          if (it.drills) {
            if (it.block.type === "module" && !isWeaponModule(it.block.module)) return (
              <div key={i} className="preview-group">
                <div className="block-label amber">{it.fill ?? (it.block.module === "flow" ? FLOWS[it.block.variant]?.name : sharpenTitle(ctx, it.block.variant))}</div>
                {it.drills.map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.value}×` : fmt(d.value)}{d.sides ? " je Seite" : ""}</span></div>)}
              </div>
            );
            let w: (Extract<Block, { type: "module" }> & { module: WeaponModule }) | null = null;
            if (it.block.type === "module" && isWeaponModule(it.block.module)) w = asWeaponBlock(it.block);
            const lv = w && PATHS[w.module].leveled.includes(w.variant) ? PATHS[w.module].levels[pathLevel(w.module, ctx.state.user.skills)].name : null;
            return (
              <div key={i} className="preview-group">
                <div className="block-label amber">{w ? MODULE_LABEL[w.module] : ""}{lv ? ` · Stufe ${lv}` : ""}</div>
                {it.drills.map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.sets && d.sets > 1 ? `${d.sets} × ` : ""}${d.value}` : fmt(d.value * (d.sets ?? 1))}{d.sides ? " je Seite" : ""}</span></div>)}
              </div>
            );
          }
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

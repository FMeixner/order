/* Eine Einheit: Ansicht der laufenden Woche und Vorschau künftiger Wochen. */
import { useMemo, useState } from "react";
import { FLOWS, SHARPEN, SWORD } from "../data";
import type { BeastResult, Block, Session } from "../types";
import { estimateRole } from "../engine/duration";
import { swapRunBeast } from "../engine/cardio";
import { moduleDrills, roleAt, roleDrills, shortSwordDrills, swordLevel, swordNext } from "../engine/plan";
import { advance, sharedState, suggest } from "../engine/progression";
import type { Resolved } from "../engine/resolve";
import { allRuns } from "../engine/runs";
import { menuDefault } from "../engine/sharpen";
import { warmupKeys } from "../engine/warmup";
import { fmt, useTimer } from "./Timer";
import { BeastCard } from "./session/BeastCard";
import { DrillList, DrillSection, toggleDrill } from "./session/Drills";
import { SlotCard, WarmCtx } from "./session/SlotCard";
import { boostOf, type SessionCtx, sessionId } from "./session/ctx";
import { collectItems, type Item, pinBeasts } from "./session/items";

/** Geschätzte Minuten dieser Einheit in dieser Woche, auf 5 gerundet */
const minutesFor = (ctx: SessionCtx) => Math.max(5, Math.round(estimateRole(roleAt(ctx.focus.roles[ctx.roleKey], ctx.profile), ctx.profile, ctx.state.user, ctx.week, ctx.reduced, boostOf(ctx)).total / 5) * 5);

/* ---------- Hauptansicht ---------- */
export function SessionView(ctx: SessionCtx) {
  const { state, update, focus, roleKey, week, block } = ctx;
  const role = roleAt(focus.roles[roleKey], ctx.profile);
  const id = sessionId(block.id, week, roleKey);
  const session = state.sessions.find((s) => s.id === id);
  const items = useMemo(() => collectItems(ctx).filter((it) => !it.sword || it.drills || it.resolved.length), [ctx]);
  // Aufwärmsätze nach Last und Risiko (erste schwere Übung je Körperhälfte), Gewicht aus dem Vorschlag
  const warmMap = useMemo(() => warmupKeys(items.flatMap((it) => it.resolved), (r) => { const x = r as Resolved; return suggest(x, sharedState(state.slots, x), week, ctx.profile).weight ?? null; }), [items, state.slots, week, ctx.profile]);
  const warm = roleDrills(role, "wu", ctx.profile, state.user, week);
  const cool = roleDrills(role, "cd", ctx.profile, state.user, week);
  const [feeling, setFeeling] = useState<number | null>(null);
  const hard = items.some((it) => it.beast || it.resolved.some((r) => r.kind === "interval"));

  const mut = (fn: (s: Session) => Session) =>
    update((st) => {
      const cur = st.sessions.find((s) => s.id === id) ?? {
        id, date: ctx.date, blockId: block.id, focusId: focus.id, week, role: roleKey, profileId: ctx.profile.id,
        entries: {}, drills: {}, menu: {}, done: false,
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
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.modsLabel ? ` · ${ctx.modsLabel}` : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
        {role.note && <p className="note">{role.note}</p>}
        {items.some((it) => it.resolved.some((r) => r.guided)) && <p className="note">Phase mit hoher Alltagslast: Etwa die Hälfte der Übungen läuft heute an Maschine oder Kabel. Der erste große Lift bleibt frei.</p>}
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


/** Stufe im Schwert-Lernweg; der nächste Test öffnet die nächste Stufe (abhaken unter Setup › Können) */
function SwordLevel({ skills }: { skills: string[] | null | undefined }) {
  const i = swordLevel(skills);
  const next = swordNext(skills);
  return (
    <div className="muted small">
      Stufe {i + 1} von {SWORD.levels.length}: {SWORD.levels[i].name}
      {next && <> · Weiter zu {next.level}, wenn das sitzt: {next.test}. Abhaken unter Setup › Können.</>}
    </div>
  );
}

function ItemCard({ it, ctx, session, mut, nextBeast }: { it: Item; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void; nextBeast?: string }) {
  const b = it.block;
  const t = useTimer();
  if (b.type === "beast") return <BeastCard blockId={b.id} beast={it.beast ?? null} cardio={it.cardio} ctx={ctx} session={session} mut={mut} note={b.note} easy={b.pace === "easy"} nextBeast={nextBeast} watchBase={sessionId(ctx.block.id, ctx.week, ctx.roleKey)} />;
  if (b.type === "module" && it.drills) {
    return (
      <section className="card">
        <div className="block-label amber">{b.module === "flow" ? FLOWS[b.variant]?.name ?? "Flow" : b.module === "sharpen" ? `Schwerpunkt: ${SHARPEN[b.variant]?.name ?? b.variant} · Erhaltung` : "Schwert"}</div>
        {it.sword && <div className="muted small">Statt Schwert: „{ctx.profile.name}“ hat kein Schwert. Mit Schwert kommt hier dein Schwertblock.</div>}
        {b.module === "flow" && <div className="muted small">Jede Zeile ist eine Kette: einmal durch ist eine Wiederholung. Erst alle Wiederholungen einer Seite, dann die andere.</div>}
        {b.module === "sharpen" && <div className="muted small">{SHARPEN[b.variant]?.why}</div>}
        {b.module === "sword" && SWORD.leveled.includes(b.variant) && <SwordLevel skills={ctx.state.user.skills} />}
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
        <div className="block-label teal">Im Wechsel{b.sameStation && b.label && it.resolved.every((r) => r.equip === "cable") ? ` · ${b.label}` : ""} · {b.rest ?? 60} s Pause</div>
        {it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(lastSet) => { if (r === last && !lastSet) t.rest("Pause, dann nächste Runde", b.rest ?? 60); }} />)}
      </section>
    );
  }
  if (b.type === "module") {
    return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={() => {}} />)}</section>;
  }
  return <section className="card">{it.resolved.map((r) => <SlotCard key={r.key} r={r} ctx={ctx} session={session} mut={mut} onSetDone={(last) => { if (!last) t.rest(`Pause nach ${r.name}`, r.rest); }} />)}</section>;
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
  const role = roleAt(ctx.focus.roles[ctx.roleKey], ctx.profile);
  const items = collectItems(ctx);
  const warm = roleDrills(role, "wu", ctx.profile, ctx.state.user, ctx.week);
  const cool = roleDrills(role, "cd", ctx.profile, ctx.state.user, ctx.week);
  return (
    <div className="stack session">
      <div className="session-head">
        {/* Name und Ort stehen schon im Tagesknopf darüber */}
        <div className="session-title"><span className="muted small">etwa {minutesFor(ctx)} Min{ctx.modsLabel ? ` · ${ctx.modsLabel}` : ""}</span>{ctx.headAction}</div>
        {ctx.headPanel}
      </div>
      <section className="card preview">
        <div className="preview-row muted"><span>Warm-up</span><span>{warm.length} Übungen</span></div>
        {items.map((it, i) => {
          const title = BLOCK_TITLE[it.block.type];
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
          if (it.sword && !ctx.profile.has.sword) {
            // Sonderrolle Schwert: die Vorschau zeigt den Schwertblock auch für ein Profil ohne Schwert, darunter den Ersatz
            const sw = it.sword;
            const lv = SWORD.leveled.includes(sw.variant) ? SWORD.levels[swordLevel(ctx.state.user.skills)].name : null;
            const alt = it.block.type === "module" && it.block.module === "flow" ? FLOWS[it.block.variant]?.name : it.resolved.map((r) => `${r.name} · ${previewDose(r)}`).join(", ");
            return (
              <div key={i} className="preview-group">
                <div className="block-label amber">Schwert{lv ? ` · Stufe ${lv}` : ""}</div>
                {(sw.short ? shortSwordDrills(moduleDrills(sw.variant, ctx.state.user, ctx.week)) : moduleDrills(sw.variant, ctx.state.user, ctx.week)).map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.sets && d.sets > 1 ? `${d.sets} × ` : ""}${d.value}` : fmt(d.value * (d.sets ?? 1))}{d.sides ? " je Seite" : ""}</span></div>)}
                <div className="preview-row muted"><span>Ohne Schwert („{ctx.profile.name}“): {alt || "entfällt"}</span></div>
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
            const lv = it.block.type === "module" && SWORD.leveled.includes(it.block.variant) ? SWORD.levels[swordLevel(ctx.state.user.skills)].name : null;
            return (
              <div key={i} className="preview-group">
                <div className="block-label amber">Schwert{lv ? ` · Stufe ${lv}` : ""}</div>
                {it.drills.map((d) => <div key={d.id} className="preview-row"><span>{d.name}</span><span className="mono muted">{d.mode === "reps" ? `${d.sets && d.sets > 1 ? `${d.sets} × ` : ""}${d.value}` : fmt(d.value * (d.sets ?? 1))}{d.sides ? " je Seite" : ""}</span></div>)}
              </div>
            );
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

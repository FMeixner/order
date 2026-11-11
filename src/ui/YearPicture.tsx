/* Zeitstrahl (1.23): das Jahr ohne Scrollen auf die Breite gepasst. Drei Bahnen — Last je Woche (schmal), Zeichen,
   Orden —, Testwochen als Kerbe, heute als Marke. Antippen eines Zeichens öffnet darunter den Detailstreifen.
   Zwei Fenster: ganzes Trainingsjahr (mit Vergangenheit) oder ab heute; darunter auf Wunsch die Jahresbilanz. */
import { useEffect, useRef, useState } from "react";
import { FOCUS_BY_ID } from "../data";
import { flagsOf, klammerName, klammernOf, type KlammerView } from "../engine/klammer";
import { addDays, blockWeeks, daysBetween, fmtDate, focusName, isTestBlock, parseIso } from "../engine/plan";
import { dauerlast } from "../engine/weekplan";
import { weekLoads, windowOf, type Span, type YearView } from "../engine/yearview";
import type { Kcal, Load, PlanBlock, Section } from "../types";
import { Seg } from "./common";
import { OrderMark } from "./OrderIcon";
import { FlagSign, KlammerIcon, Sign } from "./Signs";
import { YearBalance } from "./YearBalance";

const INITIAL = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const LOAD_TXT: Record<Load, string> = { low: "niedrig", medium: "mittel", high: "hoch" };
const KCAL_TXT: Record<Kcal, string> = { deficit: "Defizit", maintenance: "Erhaltung", surplus: "Überschuss" };
/** Ab dieser Segmentbreite (px) stehen Namen im Bild, ab 40 px das Kalorienzeichen */
const NAME_PX = 64, SIGN_PX = 40;
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;
const short = (iso: string) => { const d = parseIso(iso); return `${d.getDate()}.${d.getMonth() + 1}.`; };

type Seg<T> = { key: string; from: string; to: string; item?: T };

/** Lückenlose Folge über [lo, hi]: Elemente in Reihenfolge, Lücken als leere Segmente */
function fill<T extends { start: string; end: string }>(items: T[], lo: string, hi: string, key: (t: T) => string): Seg<T>[] {
  const out: Seg<T>[] = [];
  let at = lo;
  for (const t of [...items].sort((a, b) => a.start.localeCompare(b.start))) {
    if (t.end < lo || t.start > hi) continue;
    const s = t.start < lo ? lo : t.start, e = t.end > hi ? hi : t.end;
    if (s < at) continue;
    if (s > at) out.push({ key: `gap-${at}`, from: at, to: addDays(s, -1) });
    out.push({ key: key(t), from: s, to: e, item: t });
    at = addDays(e, 1);
  }
  if (at <= hi) out.push({ key: `gap-${at}`, from: at, to: hi });
  return out;
}
const days = (s: { from: string; to: string }) => daysBetween(s.from, s.to) + 1;

/** Umschalter, Bild und (optional) Jahresbilanz */
export function YearTimeline({ plan, sections, today, view = "year", onView, balance, onBlock, onJump, onKlammer, onTest }: {
  plan: PlanBlock[]; sections?: Section[]; today: string; view?: YearView; onView?: (v: YearView) => void; balance?: boolean;
  onBlock?: (b: PlanBlock) => void; onJump?: (b: PlanBlock) => void; onKlammer?: (k: KlammerView) => void; onTest?: (b: PlanBlock) => void;
}) {
  const [own, setOwn] = useState<YearView>(view);
  const v = onView ? view : own;
  if (!plan.length && !sections?.length) return null;
  return (
    <div className="yt stack">
      <Seg value={v} options={[{ value: "year", label: "Jahr" }, { value: "ahead", label: "Ab heute" }]} onChange={(x) => (onView ? onView(x) : setOwn(x))} />
      <YearPicture plan={plan} sections={sections} today={today} window={windowOf(v, plan, sections, today)} labels={v === "ahead"}
        onBlock={onBlock} onJump={onJump} onKlammer={onKlammer} onTest={onTest} />
      {balance && <YearBalance plan={plan} sections={sections} today={today} />}
    </div>
  );
}

export function YearPicture({ plan, sections, today, window: win, labels, onBlock, onJump, onKlammer, onTest }: {
  plan: PlanBlock[]; sections?: Section[]; today: string; window: Span; labels: boolean;
  onBlock?: (b: PlanBlock) => void; onJump?: (b: PlanBlock) => void; onKlammer?: (k: KlammerView) => void; onTest?: (b: PlanBlock) => void;
}) {
  const secs = sections ?? [];
  const lo = win.start, hi = win.end;
  const span = daysBetween(lo, hi) + 1;
  const root = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(358);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => { const x = es[0]?.contentRect.width; if (x) setW(x); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const px = (n: number) => (n / span) * w;
  const pct = (iso: string) => Math.min(100, Math.max(0, (daysBetween(lo, iso) / span) * 100));
  const ks = klammernOf(plan);
  const kSegs = fill(ks, lo, hi, (k) => k.meso);
  const tests = plan.filter((b) => isTestBlock(b) && b.end >= lo && b.start <= hi);
  const oSegs = fill(plan.filter((b) => !isTestBlock(b)), lo, hi, (b) => b.id);
  const loads = weekLoads(secs, plan, lo, hi);
  const inside = today >= lo && today <= hi;

  const months: { at: number; label: string; q: boolean; year?: string }[] = [];
  for (let d = new Date(parseIso(lo).getFullYear(), parseIso(lo).getMonth() + 1, 1, 12); d <= parseIso(hi); d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    months.push({ at: pct(iso), label: INITIAL[d.getMonth()], q: d.getMonth() % 3 === 0, year: d.getMonth() === 0 ? `’${String(d.getFullYear()).slice(2)}` : undefined });
  }
  const first = parseIso(lo);
  const lead = { at: 0, label: INITIAL[first.getMonth()], q: false, year: undefined as string | undefined };

  const k = open ? ks.find((x) => x.meso === open) : undefined;
  return (
    <div className="yp" ref={root} aria-label="Zeitstrahl">
      <div className="yp-months" aria-hidden>
        {[lead, ...months].map((m) => <span key={m.at} className={m.q ? "q" : ""} style={{ left: `${m.at}%` }}>{m.label}{m.year && <em>{m.year}</em>}</span>)}
      </div>
      <div className="yp-lanes">
        <div className="yp-lane yp-loads" aria-label="Last je Woche">
          {loads.map((x) => <i key={x.monday} className={`${x.load ? `load-${x.load}` : ""} ${x.dauer ? "dauer" : ""} ${addDays(x.monday, 6) < today ? "past" : ""}`} title={`${short(x.monday)}: ${x.load ? `Last ${LOAD_TXT[x.load]}` : "keine Phase"}${x.dauer ? " · Dauerlast" : ""}`} />)}
        </div>
        <div className="yp-lane" aria-label="Zeichen">
          {kSegs.map((s) => {
            const it = s.item;
            if (!it) return <div key={s.key} className="yp-seg yp-gap" style={{ flex: days(s) }} />;
            const wpx = px(days(s));
            return (
              <button key={s.key} className={`yp-seg yp-kl kl-${it.kind} ${it.end < today ? "past" : ""} ${open === it.meso ? "on" : ""}`} style={{ flex: days(s) }}
                onClick={() => setOpen(open === it.meso ? null : it.meso)} aria-expanded={open === it.meso}
                title={`${klammerName(it.kind)} · ${fmtDate(it.start)}–${fmtDate(it.end)}`} aria-label={`Zeichen: ${klammerName(it.kind)}`}>
                <KlammerIcon id={it.kind} size={14} />
                {wpx >= NAME_PX && <span className="yp-txt">{klammerName(it.kind)}</span>}
                {it.kcal && wpx > SIGN_PX && <span className="yp-kcal"><Sign kind={it.kcal} size={12} /></span>}
              </button>
            );
          })}
        </div>
        <div className="yp-lane yp-orders" aria-label="Orden">
          {oSegs.map((s) => {
            const b = s.item;
            if (!b) return <div key={s.key} className="yp-seg yp-gap" style={{ flex: days(s) }} />;
            const flags = flagsOf(b, secs);
            const wpx = px(days(s));
            return (
              <button key={s.key} className={`yp-seg yp-ord ${b.end < today ? "past" : ""}`} style={{ flex: days(s), ["--c" as string]: goalColor(b.focusId) }} onClick={() => onBlock?.(b)} title={`${focusName(b.focusId)} · ${fmtDate(b.start)}–${fmtDate(b.end)}`} aria-label={focusName(b.focusId) || "Phase ohne Orden"}>
                <OrderMark id={b.focusId} />
                {wpx >= (labels ? NAME_PX - 20 : NAME_PX) && <span className="yp-txt">{focusName(b.focusId)}</span>}
                {flags.length > 0 && wpx >= 28 && <span className="yp-flag"><FlagSign flags={flags} /></span>}
              </button>
            );
          })}
        </div>
        {tests.map((t) => {
          const s = t.start < lo ? lo : t.start, e = t.end > hi ? hi : t.end;
          return <button key={t.id} className="yp-notch" style={{ left: `${pct(s)}%`, width: `${((daysBetween(s, e) + 1) / span) * 100}%` }} onClick={() => onTest?.(t)} title={`Testwoche · ${fmtDate(t.start)}`} aria-label="Testwoche" />;
        })}
        {inside && <span className={`yp-now ${pct(today) < 8 ? "at-start" : pct(today) > 92 ? "at-end" : ""}`} style={{ left: `${pct(today)}%` }} aria-hidden><b>{short(today)}</b></span>}
      </div>
      {k && <Detail k={k} secs={secs} onJump={onJump ?? onBlock} onKlammer={onKlammer} onTest={onTest} />}
    </div>
  );
}

/** Detailstreifen eines Zeichens: Zeitraum, Orden darin (antippbar), Lebensabschnitte mit Last */
function Detail({ k, secs, onJump, onKlammer, onTest }: { k: KlammerView; secs: Section[]; onJump?: (b: PlanBlock) => void; onKlammer?: (k: KlammerView) => void; onTest?: (b: PlanBlock) => void }) {
  const weeks = k.parts.reduce((n, p) => n + blockWeeks(p), 0);
  const inSecs = secs.filter((s) => s.start <= k.end && s.end >= k.start).sort((a, b) => a.start.localeCompare(b.start));
  const dauer = k.parts.some((p) => dauerlast(secs, p));
  return (
    <div className={`yp-detail kl-${k.kind}`}>
      <div className="yp-dhead">
        <span className="yp-dname"><KlammerIcon id={k.kind} size={15} />{klammerName(k.kind)}</span>
        <span className="muted small">{fmtDate(k.start)} – {fmtDate(k.end)} · {weeks} Wochen{k.kcal ? ` · ${KCAL_TXT[k.kcal]}` : ""}</span>
      </div>
      <div className="yp-chips">
        {k.parts.map((p) => (
          <button key={p.id} className="yp-chip" disabled={!onJump} onClick={() => onJump?.(p)}><OrderMark id={p.focusId} />{focusName(p.focusId)} <span className="muted">{blockWeeks(p)} Wo.</span></button>
        ))}
        {k.test && <button className="yp-chip test" disabled={!onTest} onClick={() => onTest?.(k.test!)}>Testwoche</button>}
      </div>
      {(inSecs.length > 0 || dauer) && (
        <div className="muted small">
          {inSecs.length > 0 && <>Abschnitt: {inSecs.map((s) => `${s.name} (${LOAD_TXT[s.load]})`).join(", ")}</>}
          {dauer && <>{inSecs.length ? " · " : ""}Dauerlast</>}
        </div>
      )}
      {onKlammer && <div><button className="btn ghost small" onClick={() => onKlammer(k)}>Zeichen bearbeiten</button></div>}
    </div>
  );
}

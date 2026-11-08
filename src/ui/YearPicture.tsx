/* Jahresbild (1.0): das Jahr in drei Ebenen — Lebensabschnitte (Zeit und Last), Zeichen (Leitziel und Kalorien),
   Orden (Variation). Breite nach Tagen, Antippen öffnet Zeichen oder Phase. Warnungen als Zeichen am Orden,
   Text nur im title und im Phasenblatt. Ersetzt das alte Jahresband. */
import { useEffect, useRef } from "react";
import { FOCUS_BY_ID } from "../data";
import { flagsOf, klammerName, klammernOf, type KlammerView } from "../engine/klammer";
import { addDays, fmtDate, focusName, isTestBlock, parseIso } from "../engine/plan";
import type { Load, PlanBlock, Section } from "../types";
import { OrderMark } from "./OrderIcon";
import { FlagSign, KlammerIcon, Sign } from "./Signs";

const day = (iso: string) => parseIso(iso).getTime() / 864e5;
/** Breite einer Woche im Jahresbild (px): 52 Wochen ≈ 730 px, auf dem Handy waagerecht scrollbar */
const WEEK_PX = 14;
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const LOAD_N: Record<Load, number> = { low: 1, medium: 2, high: 3 };
const LOAD_TXT: Record<Load, string> = { low: "niedrige Last", medium: "mittlere Last", high: "hohe Last" };
const goalColor = (id: string) => `var(--goal-${FOCUS_BY_ID[id]?.goals.primary ?? "none"}, var(--border-lit))`;

type Seg<T> = { key: string; from: string; to: string; item?: T };

/** Lückenlose Folge über [lo, hi]: Elemente in Reihenfolge, Lücken als leere Segmente */
function fill<T extends { start: string; end: string }>(items: T[], lo: string, hi: string, key: (t: T) => string): Seg<T>[] {
  const out: Seg<T>[] = [];
  let at = lo;
  for (const t of [...items].sort((a, b) => a.start.localeCompare(b.start))) {
    if (t.end < lo || t.start > hi) continue;
    const s = t.start < lo ? lo : t.start, e = t.end > hi ? hi : t.end;
    if (s > at) out.push({ key: `gap-${at}`, from: at, to: addDays(s, -1) });
    if (s < at) continue;
    out.push({ key: key(t), from: s, to: e, item: t });
    at = addDays(e, 1);
  }
  if (at <= hi) out.push({ key: `gap-${at}`, from: at, to: hi });
  return out;
}
const flex = (s: { from: string; to: string }) => day(s.to) - day(s.from) + 1;

export function YearPicture({ plan, sections, today, onBlock, onKlammer, onTest }: {
  plan: PlanBlock[]; sections?: Section[]; today: string;
  onBlock?: (b: PlanBlock) => void; onKlammer?: (k: KlammerView) => void; onTest?: (b: PlanBlock) => void;
}) {
  const secs = sections ?? [];
  const all = [...plan.map((b) => [b.start, b.end]), ...secs.map((s) => [s.start, s.end])].flat().sort();
  if (!all.length) return null;
  return <Picture plan={plan} secs={secs} lo={all[0]} hi={all[all.length - 1]} today={today} onBlock={onBlock} onKlammer={onKlammer} onTest={onTest} />;
}

/** Das Bild selbst (Hooks hier, nie hinter einer frühen Rückkehr) */
function Picture({ plan, secs, lo, hi, today, onBlock, onKlammer, onTest }: {
  plan: PlanBlock[]; secs: Section[]; lo: string; hi: string; today: string;
  onBlock?: (b: PlanBlock) => void; onKlammer?: (k: KlammerView) => void; onTest?: (b: PlanBlock) => void;
}) {
  const span = day(hi) - day(lo) + 1;
  const nowPct = Math.min(100, Math.max(0, ((day(today) - day(lo)) / span) * 100));
  const ks = klammernOf(plan);
  const kSegs = fill(ks.map((k) => ({ ...k })), lo, hi, (k) => k.meso);
  const oSegs = fill(plan, lo, hi, (b) => b.id);
  const sSegs = fill(secs, lo, hi, (s) => s.id);

  // Feste Breite je Woche, damit Namen lesbar bleiben; das Bild scrollt waagerecht und springt auf heute
  const width = Math.ceil((span / 7) * WEEK_PX);
  const months: { at: number; label: string }[] = [];
  for (let d = parseIso(lo); d <= parseIso(hi); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const at = ((first.getTime() / 864e5 - day(lo)) / span) * 100;
    if (at >= 0) months.push({ at, label: MONTHS[first.getMonth()] + (first.getMonth() === 0 ? ` ${String(first.getFullYear()).slice(2)}` : "") });
  }
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, (nowPct / 100) * el.scrollWidth - el.clientWidth / 4);
  }, [nowPct, width]);
  return (
    <div className="yp" aria-label="Jahr in drei Ebenen">
      <div className="yp-scroll" ref={scroller}>
      <div className="yp-lanes" style={{ width, minWidth: "100%" }}>
        <div className="yp-months" aria-hidden>{months.map((m) => <span key={m.at} style={{ left: `${m.at}%` }}>{m.label}</span>)}</div>
        {secs.length > 0 && (
          <div className="yp-lane" aria-label="Lebensabschnitte">
            {sSegs.map((s) => s.item ? (
              <div key={s.key} className={`yp-seg yp-sec load-${s.item.load}`} style={{ flex: flex(s) }} title={`${s.item.name} · ${LOAD_TXT[s.item.load]} · ${fmtDate(s.item.start)}–${fmtDate(s.item.end)}${s.item.travel ? " · Reise" : ""}`}>
                <span className="yp-load" role="img" aria-label={LOAD_TXT[s.item.load]}>{[0, 1, 2].map((i) => <i key={i} className={i < LOAD_N[s.item!.load] ? "on" : ""} />)}</span>
                <span className="yp-txt">{s.item.name}</span>
              </div>
            ) : <div key={s.key} className="yp-seg yp-gap" style={{ flex: flex(s) }} />)}
          </div>
        )}
        <div className="yp-lane" aria-label="Zeichen">
          {kSegs.map((s) => s.item ? (
            <button key={s.key} className={`yp-seg yp-kl kl-${s.item.kind}`} style={{ flex: flex(s) }} onClick={() => onKlammer?.(s.item!)} title={`${klammerName(s.item.kind)} · ${fmtDate(s.item.start)}–${fmtDate(s.item.end)}`} aria-label={`Zeichen: ${klammerName(s.item.kind)}`}>
              <KlammerIcon id={s.item.kind} size={14} />
              <span className="yp-txt">{klammerName(s.item.kind)}</span>
              {s.item.kcal && <Sign kind={s.item.kcal} size={12} />}
            </button>
          ) : <div key={s.key} className="yp-seg yp-gap" style={{ flex: flex(s) }} />)}
        </div>
        <div className="yp-lane yp-orders" aria-label="Orden">
          {oSegs.map((s) => {
            const b = s.item;
            if (!b) return <div key={s.key} className="yp-seg yp-gap" style={{ flex: flex(s) }} />;
            if (isTestBlock(b)) return <button key={s.key} className="yp-seg yp-test" style={{ flex: flex(s) }} onClick={() => onTest?.(b)} title={`Testwoche · ${fmtDate(b.start)}`} aria-label="Testwoche" />;
            const flags = flagsOf(b, secs);
            const wide = flex(s) >= 28;
            return (
              <button key={s.key} className={`yp-seg yp-ord ${b.end < today ? "past" : ""}`} style={{ flex: flex(s), ["--c" as string]: goalColor(b.focusId) }} onClick={() => onBlock?.(b)} title={`${focusName(b.focusId)} · ${fmtDate(b.start)}–${fmtDate(b.end)}`} aria-label={focusName(b.focusId) || "Phase ohne Orden"}>
                <OrderMark id={b.focusId} />
                {wide && <span className="yp-txt">{focusName(b.focusId)}</span>}
                {b.pin?.focus && <Sign kind="pin" size={11} />}
                {flags.length > 0 && <span className="yp-flag"><FlagSign flags={flags} /></span>}
              </button>
            );
          })}
        </div>
        <span className="yp-now" style={{ left: `${nowPct}%` }} aria-hidden />
      </div>
      </div>
    </div>
  );
}

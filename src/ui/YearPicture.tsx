/* Jahresbild (1.0): das Jahr in drei Ebenen — Lebensabschnitte (Zeit und Last), Klammern (Leitziel und Kalorien),
   Orden (Variation). Breite nach Tagen, Antippen öffnet Klammer oder Phase. Warnungen als Zeichen am Orden,
   Text nur im title und im Phasenblatt. Ersetzt das alte Jahresband. */
import { FOCUS_BY_ID } from "../data";
import { flagsOf, klammerName, klammernOf, type KlammerView } from "../engine/klammer";
import { addDays, fmtDate, focusName, isTestBlock, parseIso } from "../engine/plan";
import type { Load, PlanBlock, Section } from "../types";
import { OrderMark } from "./OrderIcon";
import { FlagSign, KlammerIcon, Sign } from "./Signs";

const day = (iso: string) => parseIso(iso).getTime() / 864e5;
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
  const lo = all[0], hi = all[all.length - 1];
  const span = day(hi) - day(lo) + 1;
  const nowPct = Math.min(100, Math.max(0, ((day(today) - day(lo)) / span) * 100));
  const ks = klammernOf(plan);
  const kSegs = fill(ks.map((k) => ({ ...k })), lo, hi, (k) => k.meso);
  const oSegs = fill(plan, lo, hi, (b) => b.id);
  const sSegs = fill(secs, lo, hi, (s) => s.id);

  return (
    <div className="yp" aria-label="Jahr in drei Ebenen">
      <div className="yp-lanes">
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
        <div className="yp-lane" aria-label="Klammern">
          {kSegs.map((s) => s.item ? (
            <button key={s.key} className={`yp-seg yp-kl kl-${s.item.kind}`} style={{ flex: flex(s) }} onClick={() => onKlammer?.(s.item!)} title={`${klammerName(s.item.kind)} · ${fmtDate(s.item.start)}–${fmtDate(s.item.end)}`} aria-label={`Klammer ${klammerName(s.item.kind)}`}>
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
            const wide = flex(s) >= 35;
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
      <div className="yp-axis muted small"><span>{fmtDate(lo)}</span><span>{fmtDate(hi)}</span></div>
    </div>
  );
}

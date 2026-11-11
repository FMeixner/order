/* Jahresbilanz (1.23): wie viele Wochen jedes Zeichen im Trainingsjahr hat, hinter dir und vor dir. Darunter in
   Defizit- oder Reisephasen ein Satz, der das ganze Jahr zeigt — Halten heißt nicht, dass Kraft und Masse fehlen. */
import { KLAMMER_BY_ID } from "../data";
import { klammerName } from "../engine/klammer";
import { macroLine, signShare, yearWindow } from "../engine/yearview";
import type { PlanBlock, Section } from "../types";
import { KlammerIcon } from "./Signs";

const wo = (x: number) => (x >= 1 || x === 0 ? String(Math.round(x)) : String(x).replace(".", ","));

export function YearBalance({ plan, sections, today }: { plan: PlanBlock[]; sections?: Section[]; today: string }) {
  const win = yearWindow(plan, sections, today);
  const rows = signShare(plan, win.start, win.end, today);
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.past + r.ahead), 1);
  const line = macroLine(plan, today, rows);
  return (
    <div className="ybal" aria-label="Jahresbilanz">
      {rows.map((r) => {
        const total = r.past + r.ahead;
        const name = r.kind === "none" ? "ohne Zeichen" : klammerName(r.kind);
        return (
          <div key={r.kind} className={`ybal-row ${r.kind === "none" ? "none" : `kl-${r.kind}`}`} title={`${wo(r.past)} hinter dir, ${wo(r.ahead)} vor dir`}>
            <span className="ybal-name">{r.kind !== "none" && KLAMMER_BY_ID[r.kind] && <KlammerIcon id={r.kind} size={14} />}{name}</span>
            <span className="ybal-bar" aria-hidden>
              <i className="past" style={{ width: `${(r.past / max) * 100}%` }} />
              <i className="ahead" style={{ width: `${(r.ahead / max) * 100}%` }} />
            </span>
            <span className="ybal-weeks">{wo(total)} Wo.</span>
          </div>
        );
      })}
      {line && <div className="note small ybal-line">{line}</div>}
    </div>
  );
}

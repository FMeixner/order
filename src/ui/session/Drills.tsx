/* Warm-up und Cool-down: Listen zum Abhaken, eigene Änderungen je Tag. */
import { useEffect, useState } from "react";
import type { Session } from "../../types";
import { drillPool, type DrillView } from "../../engine/plan";
import { fmt, useTimer } from "../Timer";
import { Collapse, Desc } from "../common";
import type { SessionCtx } from "./ctx";

export function toggleDrill(s: Session, key: string, i: number): Session {
  const arr = [...(s.drills[key] ?? [])];
  arr[i] = !arr[i];
  return { ...s, drills: { ...s.drills, [key]: arr } };
}

/** Fertig: alle Sätze aller Übungen abgehakt. Die Länge muss mitzählen —
    ein kurzes oder leeres Häkchen-Array wäre sonst schon „fertig“ (slice .every über weniger Einträge ist true). */
export function allDrillsDone(drills: DrillView[], done: Record<string, boolean[]>, prefix: string): boolean {
  return drills.length > 0 && drills.every((d) => {
    const n = d.groups.reduce((x, g) => x + g.sets, 0);
    const arr = done[`${prefix}:${d.id}`] ?? [];
    return arr.length >= n && arr.slice(0, n).every((x) => x === true);
  });
}

/* ---------- Warm-up, Cool-down, Module ---------- */
/** Warm-up oder Cool-down mit eigenen Änderungen: Übungen entfernen und aus dem Katalog hinzufügen, dauerhaft für diesen Tag des Ordens */
export function DrillSection({ kind, drills, ctx, session, mut }: { kind: "wu" | "cd"; drills: DrillView[]; ctx: SessionCtx; session?: Session; mut: (fn: (s: Session) => Session) => void }) {
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const key = `${ctx.focus.id}:${ctx.roleKey}`;
  const ed = ctx.state.drillEdits?.[key]?.[kind];
  const changed = !!ed && (ed.off.length > 0 || ed.add.length > 0);
  const setEd = (fn: (e: { off: string[]; add: string[] }) => { off: string[]; add: string[] } | null) =>
    ctx.update((st) => {
      const all = { ...(st.drillEdits ?? {}) };
      const cur = { ...(all[key] ?? {}) };
      const next = fn(cur[kind] ?? { off: [], add: [] });
      if (next && (next.off.length || next.add.length)) cur[kind] = next; else delete cur[kind];
      if (cur.wu || cur.cd) all[key] = cur; else delete all[key];
      return { ...st, drillEdits: all };
    });
  const remove = (id: string) => setEd((e) => (e.add.includes(id) ? { ...e, add: e.add.filter((x) => x !== id) } : { ...e, off: [...e.off, id] }));
  const add = (id: string) => setEd((e) => (e.off.includes(id) ? { ...e, off: e.off.filter((x) => x !== id) } : { ...e, add: [...e.add, id] }));
  const shown = new Set(drills.map((d) => d.id));
  const pool = drillPool(kind, ctx.profile).filter((d) => !shown.has(d.id));
  const title = kind === "wu" ? "Warm-up" : "Cool-down";
  // Fertig: alles abgehakt — dann klappt die Karte nach kurzer Zeit ein wie eine Übungskarte
  const allDone = allDrillsDone(drills, session?.drills ?? {}, kind);
  useEffect(() => {
    if (!allDone || edit) return;
    const id = setTimeout(() => setOpen(false), 2500);
    return () => clearTimeout(id);
  }, [allDone, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Collapse title={title} meta={`${drills.length} Übungen${changed ? " · angepasst" : ""}`} tone="amber" open={open} onOpenChange={setOpen}
      extra={<button className={`pen-btn ${edit ? "on" : ""}`} onClick={() => { setEdit((o) => !o); setOpen(true); }} aria-pressed={edit} aria-label={`${title} bearbeiten`} title="Bearbeiten">✎</button>}>
      {edit && <span className="muted small">Änderungen gelten dauerhaft für {ctx.focus.roles[ctx.roleKey]?.name ?? "diesen Tag"}.</span>}
      <DrillList drills={drills} done={session?.drills ?? {}} prefix={kind} onToggle={(k, i) => mut((s) => toggleDrill(s, k, i))}
        onRemove={edit ? remove : undefined} />
      {edit && (
        <div className="stack">
          {pool.length > 0 && (
            <select value="" aria-label={`${title}: Übung hinzufügen`} onChange={(e) => e.target.value && add(e.target.value)}>
              <option value="">+ Übung hinzufügen …</option>
              {pool.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {changed && <button className="btn ghost small" onClick={() => setEd(() => null)}>Auf Vorgabe des Ordens zurücksetzen</button>}
        </div>
      )}
    </Collapse>
  );
}

export function DrillList({ drills, done, prefix, onToggle, onRemove }: { drills: DrillView[]; done: Record<string, boolean[]>; prefix: string; onToggle: (key: string, i: number) => void; onRemove?: (id: string) => void }) {
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
              {onRemove && <button className="btn ghost small drill-remove" onClick={() => onRemove(d.id)} aria-label={`${d.name} entfernen`}>✕</button>}
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

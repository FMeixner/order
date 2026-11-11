/* Ideenparkplatz (1.26): Neue Ideen bekommen einen Ort, an dem sie warten können — ohne Sperre, ohne Rückfrage.
   Notieren im Plan, abhaken oder löschen in „Ideen für später“; in der Testwoche und in „Jahr planen“ (Schritt 4)
   erinnern die offenen Ideen daran, dass jetzt der Moment ist, sie einzuplanen. */
import { useState } from "react";
import { fmtDate } from "../engine/plan";
import type { AppState } from "../types";
import { Collapse } from "./common";

export type Idea = NonNullable<AppState["ideas"]>[number];

/** Knopf „Idee notieren“, öffnet ein Textfeld; Enter oder „Merken“ speichert */
export function IdeaNote({ onAdd }: { onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const save = () => { const t = text.trim(); if (t) onAdd(t); setText(""); setOpen(false); };
  if (!open) return <button className="btn ghost small" onClick={() => setOpen(true)}>Idee notieren</button>;
  return (
    <div className="idea-new row">
      <input type="text" autoFocus value={text} maxLength={200} placeholder="Was willst du ausprobieren?" aria-label="Idee"
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }} />
      <button className="btn primary small" onClick={save} disabled={!text.trim()}>Merken</button>
    </div>
  );
}

/** Liste „Ideen für später“: abhaken, löschen; offene zuerst */
export function IdeasList({ ideas, onChange, defaultOpen, title = "Ideen für später", meta }: { ideas: Idea[]; onChange: (x: Idea[]) => void; defaultOpen?: boolean; title?: string; meta?: string }) {
  if (!ideas.length) return null;
  const open = ideas.filter((i) => !i.done).length;
  const order = ideas.map((x, i) => ({ x, i })).sort((a, b) => Number(!!a.x.done) - Number(!!b.x.done) || b.x.date.localeCompare(a.x.date));
  return (
    <Collapse title={title} meta={meta ?? (open ? `${open} offen` : "alle erledigt")} defaultOpen={defaultOpen}>
      <div className="idea-list">
        {order.map(({ x, i }) => (
          <div key={i} className={`idea-row ${x.done ? "done" : ""}`}>
            <label className="check">
              <input type="checkbox" checked={!!x.done} onChange={(e) => onChange(ideas.map((y, j) => (j === i ? { ...y, done: e.target.checked || undefined } : y)))} />
              <span>{x.text}</span>
            </label>
            <span className="muted small">{fmtDate(x.date)}</span>
            <button className="btn ghost small" aria-label={`Idee löschen: ${x.text}`} onClick={() => onChange(ideas.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
    </Collapse>
  );
}

/** Hinweis in Testwoche und Assistent: offene Ideen, jetzt einplanen */
export function IdeasWaiting({ ideas }: { ideas: Idea[] | undefined }) {
  const open = (ideas ?? []).filter((i) => !i.done);
  if (!open.length) return null;
  return (
    <div className="note small idea-wait">
      <div><strong>{open.length === 1 ? "1 Idee wartet." : `${open.length} Ideen warten.`}</strong> Jetzt ist der Moment, sie einzuplanen.</div>
      <ul>{open.map((x, i) => <li key={i}>{x.text}</li>)}</ul>
    </div>
  );
}

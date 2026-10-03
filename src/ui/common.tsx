import { useState, type ReactNode } from "react";

export function Collapse({ title, meta, children, defaultOpen = false, tone }: { title: ReactNode; meta?: ReactNode; children: ReactNode; defaultOpen?: boolean; tone?: "amber" | "teal" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`card collapse ${tone ?? ""}`}>
      <button className="collapse-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="collapse-title">{title}</span>
        {meta && <span className="collapse-meta">{meta}</span>}
        <span className={`chev ${open ? "open" : ""}`} aria-hidden>›</span>
      </button>
      {open && <div className="collapse-body">{children}</div>}
    </section>
  );
}


export function Modal({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Desc({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <>
      <button className="info-btn" onClick={() => setOpen((o) => !o)} aria-label="Beschreibung" aria-expanded={open}>i</button>
      {open && <div className="desc">{text}</div>}
    </>
  );
}

export const kg = (n: number | null | undefined) => (n == null ? "–" : `${String(n).replace(".", ",")} kg`);

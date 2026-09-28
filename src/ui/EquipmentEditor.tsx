import { useState } from "react";
import { formatWeightList, parseWeightList } from "../engine/loads";
import { EQUIPMENT_PRESETS } from "../store";
import type { EquipmentProfile, Tier } from "../types";
import { Check, Field, Seg } from "./common";

const TIER_LABEL: Record<Tier, string> = { gym: "Studio", home: "Zuhause", reise: "Unterwegs" };
const HAS_LABEL: Record<keyof EquipmentProfile["has"], string> = {
  bar: "Klimmzugstange", rings: "Ringe", bench: "Bank", rower: "Rudergerät", bike: "Rad/Ergometer",
  box: "Box/Stufe", sandbag: "Sandsack", cable: "Kabelzug", machines: "Maschinen", medball: "Medizinball 2 kg",
};

function ListInput({ value, onChange, placeholder }: { value: number[]; onChange: (v: number[]) => void; placeholder: string }) {
  const [text, setText] = useState(formatWeightList(value));
  const parsed = parseWeightList(text);
  return (
    <>
      <input type="text" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => { onChange(parsed); setText(formatWeightList(parsed)); }} />
      <span className="field-hint">{parsed.length ? `${parsed.length} Stufen: ${formatWeightList(parsed.slice(0, 8))}${parsed.length > 8 ? " …" : ""}` : "keine"}</span>
    </>
  );
}

export function ProfileForm({ p, onChange, onDelete }: { p: EquipmentProfile; onChange: (p: EquipmentProfile) => void; onDelete?: () => void }) {
  const set = (patch: Partial<EquipmentProfile>) => onChange({ ...p, ...patch });
  return (
    <div className="card profile-form">
      <div className="row">
        <Field label="Name"><input type="text" value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      </div>
      <Field label="Art des Orts" hint="Bestimmt, welche Übungsvariante zuerst gewählt wird.">
        <Seg value={p.tier} options={(Object.keys(TIER_LABEL) as Tier[]).map((t) => ({ value: t, label: TIER_LABEL[t] }))} onChange={(tier) => set({ tier })} />
      </Field>
      <Field label="Kurzhanteln (kg, je Hantel)">
        <ListInput value={p.dumbbells} onChange={(dumbbells) => set({ dumbbells })} placeholder="z. B. 2-24/2 oder 5; 7,5; 10" />
      </Field>
      <Field label="Kettlebells (kg)">
        <ListInput value={p.kettlebells} onChange={(kettlebells) => set({ kettlebells })} placeholder="z. B. 8; 12; 16; 24" />
      </Field>
      <div className="row">
        <Check checked={!!p.barbell} onChange={(v) => set({ barbell: v ? { bar: 20, smallestPlate: 1.25 } : null })} label="Langhantel mit Scheiben" />
      </div>
      {p.barbell && (
        <div className="row two">
          <Field label="Stange (kg)"><input type="number" inputMode="decimal" value={p.barbell.bar} onChange={(e) => set({ barbell: { ...p.barbell!, bar: parseFloat(e.target.value) || 0 } })} /></Field>
          <Field label="Kleinste Scheibe (kg)" hint="Steigerung = 2 × diese Scheibe"><input type="number" inputMode="decimal" step="0.25" value={p.barbell.smallestPlate} onChange={(e) => set({ barbell: { ...p.barbell!, smallestPlate: parseFloat(e.target.value) || 1.25 } })} /></Field>
        </div>
      )}
      <div className="grid-checks">
        {(Object.keys(HAS_LABEL) as (keyof EquipmentProfile["has"])[]).map((k) => (
          <Check key={k} checked={p.has[k]} onChange={(v) => set({ has: { ...p.has, [k]: v } })} label={HAS_LABEL[k]} />
        ))}
      </div>
      {(p.has.cable || p.has.machines) && (
        <div className="row two">
          {p.has.cable && <Field label="Kabelzug: Schritt (kg)"><input type="number" inputMode="decimal" step="0.25" value={p.cableStep} onChange={(e) => set({ cableStep: parseFloat(e.target.value) || 2.5 })} /></Field>}
          {p.has.machines && <Field label="Maschinen: Schritt (kg)"><input type="number" inputMode="decimal" step="0.5" value={p.machineStep} onChange={(e) => set({ machineStep: parseFloat(e.target.value) || 5 })} /></Field>}
        </div>
      )}
      <Field label="Gewichtsweste (kg)" hint="Leer lassen, wenn keine vorhanden">
        <ListInput value={p.vest} onChange={(vest) => set({ vest })} placeholder="z. B. 5; 10; 15; 20" />
      </Field>
      <Field label="Bänder" hint="Stärken, leicht nach schwer, mit Semikolon getrennt">
        <input type="text" defaultValue={p.bands.join("; ")} onBlur={(e) => set({ bands: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) })} placeholder="leicht; mittel; schwer" />
      </Field>
      {onDelete && <button className="btn danger small" onClick={onDelete}>Profil löschen</button>}
    </div>
  );
}

export function EquipmentEditor({ list, onChange }: { list: EquipmentProfile[]; onChange: (l: EquipmentProfile[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(list[0]?.id ?? null);
  return (
    <div className="stack">
      {list.map((p) => (
        <div key={p.id}>
          <button className={`list-row ${openId === p.id ? "on" : ""}`} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
            <span><strong>{p.name || "Ohne Namen"}</strong> <span className="muted">· {TIER_LABEL[p.tier]}</span></span>
            <span className="muted small">{summary(p)}</span>
          </button>
          {openId === p.id && (
            <ProfileForm p={p} onChange={(np) => onChange(list.map((x) => (x.id === p.id ? np : x)))}
              onDelete={list.length > 1 ? () => onChange(list.filter((x) => x.id !== p.id)) : undefined} />
          )}
        </div>
      ))}
      <div className="preset-row">
        <span className="muted small">Profil hinzufügen:</span>
        {EQUIPMENT_PRESETS.map((pr) => (
          <button key={pr.label} className="btn ghost small" onClick={() => { const np = pr.make(); onChange([...list, np]); setOpenId(np.id); }}>+ {pr.label}</button>
        ))}
      </div>
    </div>
  );
}

function summary(p: EquipmentProfile): string {
  const parts: string[] = [];
  if (p.barbell) parts.push("Langhantel");
  if (p.dumbbells.length) parts.push(`KH bis ${Math.max(...p.dumbbells)} kg`);
  if (p.kettlebells.length) parts.push(`KB bis ${Math.max(...p.kettlebells)} kg`);
  if (p.has.cable) parts.push("Kabel");
  if (p.has.machines) parts.push("Maschinen");
  if (p.bands.length) parts.push("Bänder");
  return parts.join(" · ") || "Körpergewicht";
}

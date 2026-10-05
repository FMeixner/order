/* Zustand der App: im Browser gespeichert (localStorage), exportier- und importierbar als JSON. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, EquipmentProfile } from "./types";

const KEY = "order:v1";

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export const EQUIPMENT_PRESETS: { label: string; make: () => EquipmentProfile }[] = [
  {
    label: "Studio komplett",
    make: () => ({
      id: uid("eq"), name: "Studio", tier: "gym",
      dumbbells: range(2.5, 50, 2.5), kettlebells: [8, 12, 16, 20, 24, 28, 32],
      barbell: { bar: 20, smallestPlate: 1.25 }, cableStep: 2.5, machineStep: 5, vest: [], bands: [],
      has: { bar: true, rings: false, bench: true, rower: true, bike: true, box: true, sandbag: false, cable: true, machines: true, medball: false, sword: false },
    }),
  },
  {
    label: "Zuhause: Kurzhanteln und Stange",
    make: () => ({
      id: uid("eq"), name: "Zuhause", tier: "home",
      dumbbells: range(2, 24, 2), kettlebells: [], barbell: null, cableStep: 2.5, machineStep: 5, vest: [],
      bands: ["leicht", "mittel", "schwer"],
      has: { bar: true, rings: false, bench: true, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false },
    }),
  },
  {
    label: "Unterwegs: nur Bänder",
    make: () => ({
      id: uid("eq"), name: "Unterwegs", tier: "reise",
      dumbbells: [], kettlebells: [], barbell: null, cableStep: 2.5, machineStep: 5, vest: [],
      bands: ["leicht", "mittel", "schwer"],
      has: { bar: false, rings: false, bench: false, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false },
    }),
  },
];

function range(a: number, b: number, s: number): number[] {
  const out: number[] = [];
  for (let w = a; w <= b + 1e-9; w = Math.round((w + s) * 100) / 100) out.push(w);
  return out;
}

export function emptyState(): AppState {
  return {
    version: 1, onboarded: false,
    user: { name: "", birthYear: null, sex: null, skills: null },
    equipment: [], schedule: {}, roleOrder: {}, plan: [], slots: {}, sessions: [], beastTimes: {},
    reduced: {}, menuChoice: {}, tests: {}, who5: [], feeling: [], swaps: {},
  };
}

/** Fehlende Felder aus älteren Ständen ergänzen */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = { ...base, ...(raw as Partial<AppState>) } as AppState;
  s.user = { ...base.user, ...(s.user ?? {}) };
  // 0.16: Asymmetrie-Korrektur entfernt
  delete s.user.asym;
  // 0.23: Skill-Training (verhexte Bestien als Übung) entfernt, Skills legen nur die Auswahl fest
  delete s.user.skillTraining;
  // 0.26: eine hexed-Id je Bestie („a~hex“), alle hexed-Varianten teilen sich die Bestzeit
  const hx = (id: string) => id.replace(/~hex:[^×+]*/g, "~hex");
  if (s.beastTimes) {
    const bt: AppState["beastTimes"] = {};
    for (const [id, t] of Object.entries(s.beastTimes)) bt[hx(id)] = [...(bt[hx(id)] ?? []), ...t];
    s.beastTimes = bt;
  }
  s.sessions = (s.sessions ?? []).map((se) => ({
    ...se,
    ...(se.beast ? { beast: { ...se.beast, id: hx(se.beast.id) } } : {}),
    ...(se.beastParts ? { beastParts: se.beastParts.map((pt) => ({ ...pt, id: hx(pt.id) })) } : {}),
    ...(se.beastRuns ? { beastRuns: Object.fromEntries(Object.entries(se.beastRuns).map(([k, r]) => [k, { ...(r.beast ? { beast: { ...r.beast, id: hx(r.beast.id) } } : {}), ...(r.parts ? { parts: r.parts.map((pt) => ({ ...pt, id: hx(pt.id) })) } : {}) }])) } : {}),
  }));
  s.equipment = (s.equipment ?? []).map((e) => ({ ...e, has: { ...base_has(), ...(e.has ?? {}) } }));
  // 0.1 → 0.2: Schalter „Doppelmesser“ wird zum Equipment „Schwert“ an den Heim-Profilen
  if (s.user.doppelmesser && !s.equipment.some((e) => e.has.sword)) {
    s.equipment = s.equipment.map((e) => (e.tier === "home" ? { ...e, has: { ...e.has, sword: true } } : e));
  }
  delete s.user.doppelmesser;
  return s;
}
function base_has(): EquipmentProfile["has"] {
  return { bar: false, rings: false, bench: false, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function useAppState(): [AppState, (fn: (s: AppState) => AppState) => void, (s: AppState) => void] {
  const [state, setState] = useState<AppState>(load);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher voll oder gesperrt */ }
  }, [state]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  const replace = useCallback((s: AppState) => setState(migrate(s)), []);
  return [state, update, replace];
}

export function exportState(s: AppState): void {
  const blob = new Blob([JSON.stringify(s, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `order-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

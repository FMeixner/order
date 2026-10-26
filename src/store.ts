/* Zustand der App: im Browser gespeichert (localStorage), exportier- und importierbar als JSON. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, EquipmentProfile, Weekday } from "./types";

const KEY = "order:v1";

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export const EQUIPMENT_PRESETS: { label: string; make: () => EquipmentProfile }[] = [
  {
    label: "Studio komplett",
    make: () => ({
      id: uid("eq"), name: "Studio",
      dumbbells: range(2.5, 50, 2.5), kettlebells: [8, 12, 16, 20, 24, 28, 32],
      barbell: { bar: 20, smallestPlate: 1.25 }, cableStep: 2.5, machineStep: 5, vest: [], bands: [],
      has: { bar: true, rings: false, bench: true, rower: true, bike: true, box: true, sandbag: false, cable: true, machines: true, medball: false, sword: false, handles: true, dip: true, wheel: true },
    }),
  },
  {
    label: "Zuhause: Kurzhanteln und Stange",
    make: () => ({
      id: uid("eq"), name: "Zuhause",
      dumbbells: range(2, 24, 2), kettlebells: [], barbell: null, cableStep: 2.5, machineStep: 5, vest: [],
      bands: ["leicht", "mittel", "schwer"],
      has: { bar: true, rings: false, bench: true, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false, handles: false, dip: false, wheel: true },
    }),
  },
  {
    label: "Unterwegs: nur Bänder",
    make: () => ({
      id: uid("eq"), name: "Unterwegs",
      dumbbells: [], kettlebells: [], barbell: null, cableStep: 2.5, machineStep: 5, vest: [],
      bands: ["leicht", "mittel", "schwer"],
      has: { bar: false, rings: false, bench: false, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false, handles: false, dip: false, wheel: false },
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
  s.equipment = s.equipment ?? [];
  // 0.1 → 0.2: Schalter „Doppelmesser“ wird zum Equipment „Schwert“ an den Heim-Profilen
  if (s.user.doppelmesser && !s.equipment.some((e) => e.has?.sword)) {
    s.equipment = s.equipment.map((e) => (e.tier === "home" ? { ...e, has: { ...e.has, sword: true } } : e));
  }
  delete s.user.doppelmesser;
  dropTiers(s);
  quietDays(s);
  s.equipment = s.equipment.map((e) => ({ ...e, has: { ...base_has(), ...(e.has ?? {}) } }));
  renameExercises(s);
  // 0.75: Orden „Witcher“ heißt jetzt „Slayer“ — Phasen, Einheiten und Drill-Änderungen heißen mit um
  renameFocus(s);
  return s;
}
/** 0.75: Umbenennung Witcher → Slayer. Gleicher Orden, gleiche Rollen; Slot-Ids (w-*), Weibelform „Amazon“ und alle Daten bleiben. */
function renameFocus(s: AppState): void {
  s.plan = (s.plan ?? []).map((b) => {
    if (b.focusId !== "witcher") return b;
    const old = b.frozen?.foci?.witcher;
    if (!old) return { ...b, focusId: "slayer" };
    const foci = { ...b.frozen!.foci, slayer: { ...old, id: "slayer", name: "Slayer" } };
    delete foci.witcher;
    return { ...b, focusId: "slayer", frozen: { ...b.frozen, foci } };
  });
  s.sessions = (s.sessions ?? []).map((se) => (se.focusId === "witcher" ? { ...se, focusId: "slayer" } : se));
  if (s.drillEdits) {
    const out: AppState["drillEdits"] = {};
    for (const [k, v] of Object.entries(s.drillEdits)) out[k.startsWith("witcher:") ? `slayer:${k.slice(8)}` : k] = v;
    s.drillEdits = out;
  }
}
/** 0.46: Schweißfrei ist kein Ort mehr, sondern „Leise“ an den Wochentagen, an denen dieser Ort im Wochenplan steht */
function quietDays(s: AppState): void {
  const sf = new Set(s.equipment.filter((e) => e.sweatFree).map((e) => e.id));
  if (!sf.size) return;
  const flags = { ...(s.dayFlags ?? {}) };
  for (const sch of [s.schedule ?? {}, ...(s.plan ?? []).map((b) => b.schedule ?? {})])
    for (const [d, pid] of Object.entries(sch) as [Weekday, string | null][]) if (pid && sf.has(pid)) flags[d] = { ...(flags[d] ?? {}), quiet: true };
  s.dayFlags = flags;
  s.equipment = s.equipment.map(({ sweatFree: _sf, ...e }) => e);
}
/** 0.45: Orte ohne Kategorie. Was die Kategorie stillschweigend annahm (Studio: Dip-Barren und Bauchroller,
    Zuhause: Bauchroller), wird zu Ausstattung; Tausche gelten je Ort statt je Kategorie. */
function dropTiers(s: AppState): void {
  const raw = s.equipment as (Omit<EquipmentProfile, "has"> & { has?: Partial<EquipmentProfile["has"]> })[];
  if (!raw.some((e) => e.tier)) return;
  if (s.swaps) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.swaps)) {
      const i = k.lastIndexOf(":");
      const t = k.slice(i + 1);
      if (t === "gym" || t === "home" || t === "reise") {
        for (const e of raw) if (e.tier === t) out[`${k.slice(0, i)}:${e.id}`] = v;
      } else out[k] = v;
    }
    s.swaps = out;
  }
  s.equipment = raw.map(({ tier, ...e }) => {
    if (!tier) return e;
    return { ...e, has: { ...e.has, dip: e.has?.dip ?? tier === "gym", wheel: e.has?.wheel ?? tier !== "reise" } };
  }) as EquipmentProfile[];
}
/** 0.39: eine Übung je Bewegung. Dosierung (Top-Satz, schwer) steht im Slot, Zusatzlast (Weste, Gürtel) ist keine eigene Übung mehr. */
export const RENAMED: Record<string, string> = {
  "Back Squat Top-Satz": "Back Squat", "Deadlift Top-Satz": "Deadlift", "KB Swing, schwer": "KB Swing",
  "Chin-Up + Weste": "Chin-Up", "Deficit Push-Up + Weste": "Deficit Push-Up", "Bulgarian Split Squat + Weste": "Bulgarian Split Squat",
  "Pull-Up + Weste": "Pull-Up", "Ring Dip + Weste": "Ring Dip", "Weighted Pull-Up": "Pull-Up", "Weighted Chin-Up": "Chin-Up", "Weighted Dip": "Dip",
  // 0.60: doppelte Einträge im Katalog zusammengeführt
  "Cable Biceps Curl": "Cable Curl", "Lat Pulldown (Overhand)": "Lat Pulldown", "Bent-Over Row": "Barbell Row", "Rope Crunch": "Cable Crunch", "Medizinball-Brustwurf": "Medicine Ball Chest Pass",
};
const renameKey = (k: string) => { const i = k.indexOf("|"); if (i < 0) return k; const n = k.slice(i + 1); return RENAMED[n] ? `${k.slice(0, i)}|${RENAMED[n]}` : k; };
function renameExercises(s: AppState): void {
  if (s.slots) {
    const out: AppState["slots"] = {};
    for (const [k, v] of Object.entries(s.slots)) { const nk = renameKey(k); if (!out[nk] || (v.updated ?? "") > (out[nk].updated ?? "")) out[nk] = v; }
    s.slots = out;
  }
  s.sessions = s.sessions.map((se) => {
    if (!Object.keys(se.entries ?? {}).some((k) => renameKey(k) !== k)) return se;
    const entries: typeof se.entries = {};
    for (const [k, e] of Object.entries(se.entries)) entries[renameKey(k)] = { ...e, key: renameKey(e.key), name: RENAMED[e.name] ?? e.name };
    return { ...se, entries };
  });
  if (s.swaps) s.swaps = Object.fromEntries(Object.entries(s.swaps).map(([k, v]) => [k, RENAMED[v] ?? v]));
  // Eingefrorene Orden: alte Übungsnamen im eingefrorenen Stand umbenennen (die Fassung selbst bleibt, kein stilles „Übernehmen“)
  s.plan = (s.plan ?? []).map((b) => {
    if (!b.frozen) return b;
    let txt = JSON.stringify(b.frozen);
    const before = txt;
    for (const [o, n] of Object.entries(RENAMED)) txt = txt.split(JSON.stringify(o)).join(JSON.stringify(n));
    return txt === before ? b : { ...b, frozen: JSON.parse(txt) };
  });
  if (s.oneRM) s.oneRM = Object.fromEntries(Object.entries(s.oneRM).map(([k, v]) => [RENAMED[k] ?? k, v]));
}
function base_has(): EquipmentProfile["has"] {
  return { bar: false, rings: false, bench: false, rower: false, bike: false, box: false, sandbag: false, cable: false, machines: false, medball: false, sword: false, handles: false, dip: false, wheel: false };
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

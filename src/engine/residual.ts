/* Residual-Uhren: Der Allround-Boden wird nicht geplant, sondern gemessen.
   Jede Uhr zählt die Tage, seit ihr Bereich den letzten wirksamen Reiz bekommen hat — abgeleitet
   aus erledigten Einheiten, ohne neue Eingaben. Die Budgets sind die Residualfenster (nach Issurin,
   gerundet): Sprungkraft und Schnelligkeit klingen in einer Woche ab, Kraft und Masse tragen einen
   Monat. Budgets garantieren nur Halten — Besserwerden kommt aus Akzenten und wird in der Testwoche
   gemessen. Bewusst Messung, kein Planer: Rote Uhren sind Lenkhilfe für die nächste Wahl. */
import { FOCUS_BY_ID, FLOWS, SHARPEN } from "../data";
import type { AppState, Beast, Block, Session, SlotKind } from "../types";
import { beastById, beastPartName, blockFocus, daysBetween } from "./plan";
import { allRuns, isHunt } from "./runs";

export type ClockId = "schnellkraft" | "ke" | "anaerob" | "aerob" | "kraft" | "mobility" | "sehnen";

export interface ClockDef {
  id: ClockId;
  name: string;
  /** Residualfenster in Tagen: Wie lange der Reiz wirkt, bevor die Uhr rot wird */
  budget: number;
}

/** Die sieben Uhren mit ihren Budgets. Masse läuft über Kraft mit, Skill hat keine Uhr. */
export const CLOCKS: ClockDef[] = [
  { id: "schnellkraft", name: "Sprungkraft & Schnelligkeit", budget: 7 },
  { id: "ke", name: "Kraftausdauer", budget: 14 },
  { id: "anaerob", name: "Anaerob", budget: 14 },
  { id: "aerob", name: "Ausdauer (aerob)", budget: 21 },
  { id: "mobility", name: "Beweglichkeit", budget: 21 },
  { id: "sehnen", name: "Sehnen & Bindegewebe", budget: 21 },
  { id: "kraft", name: "Kraft & Masse", budget: 30 },
];

export interface ResidualClock {
  id: ClockId;
  name: string;
  budget: number;
  /** Datum des letzten wirksamen Reizes */
  last: string | null;
  /** Tage seit dem letzten Reiz; null = noch nie */
  days: number | null;
  /** Uhr über Budget. „Noch nie“ zählt als über, sobald überhaupt eine Uhr Daten hat. */
  over: boolean;
}

/** Teilaufgabe einer Bestie mit Sprint- oder Sprunganteil (Zahlen und „Buy-in:“ vorher entfernt) */
const POWER_PART = /\b(sprints?|(box|squat|tuck|high|standup|broad|lateral)\s+jumps?|speed skaters?|skater jumps?)\b/i;

/** Hat die Bestie einen Sprint- oder Sprunganteil? (Serienteile zählen mit) */
function beastPowers(b: Beast): boolean {
  const names = [b.work, ...(b.parts?.map((p) => p.work) ?? [])]
    .flatMap((w) => w.split(" · "))
    .map(beastPartName);
  return names.some((n) => POWER_PART.test(n));
}

/** Schwerpunkt-Bereich → Uhr. Maximalkraft und Skill haben keine eigene Uhr. */
export function sharpenClock(d: string): ClockId | null {
  if (d === "speed" || d === "power") return "schnellkraft";
  if (d === "ke" || d === "anaerob" || d === "aerob" || d === "mobility") return d;
  return null;
}

/** Slot-Art → Uhr: Halteübungen belasten die Sehnen, Zeitblöcke sind aerob, Intervalle anaerob. */
function kindClock(k: SlotKind | undefined): ClockId {
  if (k === "timer") return "aerob";
  if (k === "interval") return "anaerob";
  if (k === "hold") return "sehnen";
  return "kraft";
}

/** Slot-Id → Uhr für alle Slots einer Rolle. Kontrast: Der Explosivteil zählt immer für die Sprungkraft. */
export function slotClocks(blocks: Block[]): Map<string, ClockId> {
  const m = new Map<string, ClockId>();
  for (const b of blocks) {
    if (b.type === "single") m.set(b.slot.id, kindClock(b.slot.kind));
    else if (b.type === "superset") for (const s of b.slots) m.set(s.id, kindClock(s.kind));
    else if (b.type === "contrast") {
      m.set(b.heavy.id, kindClock(b.heavy.kind));
      m.set(b.explosive.id, "schnellkraft");
    } else if (b.type === "module" && b.fallback) m.set(b.fallback.id, kindClock(b.fallback.kind));
  }
  return m;
}

/** Welche Uhren eine erledigte Einheit zurücksetzt. Bestien zählen immer, auch die freie Jagd. */
export function sessionHits(state: AppState, s: Session): Set<ClockId> {
  const hits = new Set<ClockId>();
  for (const r of allRuns(s)) {
    const b = beastById(r.id);
    if (!b) continue;
    hits.add("ke");
    hits.add("anaerob");
    if (beastPowers(b)) hits.add("schnellkraft");
  }
  if (isHunt(s)) return hits;
  const pb = state.plan.find((x) => x.id === s.blockId);
  const f = (pb ? blockFocus(pb, s.focusId) : FOCUS_BY_ID[s.focusId]) ?? undefined;
  const role = f?.roles[s.role];
  if (!role) return hits;
  const slots = slotClocks(role.blocks);
  for (const e of Object.values(s.entries)) {
    if (!e.sets.some((x) => x.done)) continue;
    const c = slots.get(e.slotId);
    if (c) hits.add(c);
  }
  for (const b of role.blocks) {
    if (b.type !== "module") continue;
    const drills = b.module === "flow" ? FLOWS[b.variant]?.drills : b.module === "sharpen" ? SHARPEN[b.variant]?.drills : undefined;
    if (!drills?.some((d) => s.drills[d.id]?.some(Boolean))) continue;
    if (b.module === "flow") hits.add("mobility");
    else {
      const c = sharpenClock(b.variant);
      if (c) hits.add(c);
    }
  }
  return hits;
}

/** Alle Uhren von heute aus: Tage seit dem letzten wirksamen Reiz, aus den erledigten Einheiten abgeleitet. */
export function residualClocks(state: AppState, today: string): ResidualClock[] {
  const last = new Map<ClockId, string>();
  for (const s of state.sessions) {
    if (!s.done || s.date > today) continue;
    for (const c of sessionHits(state, s)) {
      const d = last.get(c);
      if (!d || s.date > d) last.set(c, s.date);
    }
  }
  const any = last.size > 0;
  return CLOCKS.map((c) => {
    const l = last.get(c.id) ?? null;
    const days = l ? daysBetween(l, today) : null;
    return { id: c.id, name: c.name, budget: c.budget, last: l, days, over: any && (days === null || days > c.budget) };
  });
}

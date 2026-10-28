/* „Cardio erfassen“: Läufe und anderes Cardio außerhalb der Einheiten, eingetragen im
   ⚙-Menü „Anpassen“ (heute oder gestern, Minuten und Pace-Empfindung). Hart gewertet wird
   ein Lauf mit Pace „hart“ oder ab 60 Minuten. Kommt ein so gewerteter Lauf auf einen
   Beintag oder in die 24 Stunden davor, entlastet die App den Beintag: Waden und Beinbeuger
   einen Satz weniger (mindestens einer), Oberschenkel erst ab vier Sätzen, Gesäß bleibt
   unangetastet. Die frei werdende Zeit füllt eine leichte Bestie (Plage) oder, am Tag ohne
   Bestie, ein Mobility-Flow. Nie zusätzlich zu Wochen, die ohnehin leichter laufen, und
   nie auf bereits erledigte Einheiten. */
import type { AppState, Block, Choice, Focus, PlanBlock, Role, RunEntry, Slot, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { addDays, blockWeeks, dayRoleMap, followedByTest, isDeloadWeek, isTestWeek, mondayOf } from "./plan";
import { dayMods } from "./dayadj";
import { isDeloaded } from "./deload";
import { musclesOf } from "./volume";

export const PACE_LABEL: Record<RunEntry["pace"], string> = { locker: "Locker", zügig: "Zügig", hart: "Hart" };
/** Ab so vielen Minuten gilt auch ein lockerer Lauf als hart */
export const HARD_MIN = 60;

export const isHardRun = (r: RunEntry): boolean => r.pace === "hart" || r.minutes >= HARD_MIN;

/** Hart gewerteter Lauf am selben Tag oder am Tag davor („< 24 h vor dem Beintag“) */
export function hardRunNear(runs: RunEntry[] | undefined, date: string): RunEntry | null {
  const vor = addDays(date, -1);
  return (runs ?? []).filter(isHardRun).find((r) => r.date === date || r.date === vor) ?? null;
}

/* ---------- Wo ist der Tag ein Beintag ---------- */
const LEG = ["Quadrizeps", "Beinbeuger", "Gesäß", "Waden"] as const;
const shareOf = (name: string, m: string) => musclesOf(name)[m] ?? 0;
const legShareOf = (name: string) => LEG.reduce((s, m) => s + shareOf(name, m), 0);

/** Wo greift die Entlastung? Waden und Beinbeuger sicher, Oberschenkel nur leicht, Gesäß gar nicht. */
function slotEase(name: string): "wade" | "beuger" | "quad" | null {
  const w = shareOf(name, "Waden"), h = shareOf(name, "Beinbeuger"), q = shareOf(name, "Quadrizeps"), g = shareOf(name, "Gesäß");
  if (w >= 0.4) return "wade";
  if (h >= 0.4) return "beuger";
  if (q >= 0.4 && q > g) return "quad";
  return null;
}

/** Sätze der Kraft-Blöcke eines Tages (Menü zählt mit seiner ersten Option) */
function daySlots(r: Role): { s: Slot; n: number }[] {
  const out: { s: Slot; n: number }[] = [];
  for (const b of r.blocks) {
    if (b.type === "single" || b.type === "superset" || b.type === "contrast") {
      const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : [b.heavy, b.explosive];
      for (const s of slots) out.push({ s, n: s.sets ?? 3 });
    } else if (b.type === "menu") {
      const f = Object.values(b.options)[0];
      if (f) out.push({ s: f, n: f.sets ?? 3 });
    }
  }
  return out;
}

/** Beinanteil an den Kraft-Sätzen des Tages. Ab der Hälfte gilt der Tag als Beintag. */
export function legShare(r: Role): number {
  const slots = daySlots(r).filter(({ s }) => (s.kind ?? "strength") !== "timer" && (s.kind ?? "strength") !== "interval");
  const total = slots.reduce((a, x) => a + x.n, 0);
  if (!total) return 0;
  return slots.reduce((a, x) => a + x.n * legShareOf(x.s.name), 0) / total;
}

/* ---------- Umformung des Tages ---------- */
const less = (n: number | undefined): number | undefined => (n == null ? undefined : Math.max(1, n - 1));
const lessChoice = (c: Choice | string | null | undefined): Choice | string | null | undefined =>
  typeof c === "object" && c ? { ...c, sets: less(c.sets) } : c;

/** Ein Satz weniger, mit Grund in den Details. Oberschenkel erst ab vier Sätzen, sonst bleibt die Dosis. */
function lessSlot(s: Slot, why: string): Slot {
  const kind = slotEase(s.name);
  if (!kind || (kind === "quad" && (s.sets ?? 3) < 4)) return s;
  return { ...s, sets: less(s.sets), home: lessChoice(s.home), reise: lessChoice(s.reise), why: [...(s.why ?? []), why] };
}

/** Beintag entlasten: Sätze an Waden und Beinbeugern, Oberschenkel leicht, Bestie nur als Plage.
    Ohne Bestie am Tag hängt ein Mobility-Flow als Ausgleich an. */
function easeRole(r: Role, why: string): Role {
  const blocks = r.blocks.map((b): Block => {
    switch (b.type) {
      case "single": return { ...b, slot: lessSlot(b.slot, why) };
      case "superset": return { ...b, slots: b.slots.map((s) => lessSlot(s, why)), ...(b.finisher ? { finisher: { ...b.finisher, classes: ["plage"] } } : {}) };
      case "contrast": return { ...b, heavy: lessSlot(b.heavy, why), explosive: lessSlot(b.explosive, why) };
      case "menu": {
        const options: Record<string, Slot> = {};
        for (const [k, s] of Object.entries(b.options)) options[k] = lessSlot(s, why);
        return { ...b, options };
      }
      case "beast": return { ...b, classes: ["plage"], pool: undefined, strict: undefined, benchmark_every: undefined };
      default: return b;
    }
  });
  const hasBeast = r.blocks.some((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher));
  if (!hasBeast) blocks.push({ type: "module", module: "flow", variant: "mobility" });
  return { ...r, blocks };
}

/* ---------- Welche Tage der Woche ---------- */
export interface RunEase { day: Weekday; role: string; date: string; run: RunEntry }

/** Beintage dieser Woche, die wegen eines harten Laufs entlastet werden */
export function easeTargets(state: AppState, b: PlanBlock, week: number, f: Focus): RunEase[] {
  if (!state.runs?.length) return [];
  // Keine doppelte Entlastung: Entlastungswoche und Wochen, die ohnehin mit −1 Satz laufen, bleiben, wie sie sind
  if (isDeloaded(state, b, week) || isDeloadWeek(f, week) || isTestWeek(f, b, week) || isTestWeek(f, b, week + 1)
    || (followedByTest(state.plan, b) && week === blockWeeks(b))) return [];
  const weekStart = addDays(mondayOf(b.start), (week - 1) * 7);
  const done = new Set(state.sessions.filter((s) => s.blockId === b.id && s.week === week && s.done).map((s) => s.role));
  const out: RunEase[] = [];
  for (const d of dayRoleMap(state, b, f, week)) {
    const r = f.roles[d.role];
    if (!r || done.has(d.role)) continue;
    const mods = dayMods(state, b, week, d.role, d.day);
    if (mods.light || mods.intense) continue;
    const date = addDays(weekStart, WEEKDAYS.indexOf(d.day));
    const run = hardRunNear(state.runs, date);
    if (!run || legShare(r) < 0.5) continue;
    out.push({ day: d.day, role: d.role, date, run });
  }
  return out;
}

/** Wochenform mit entlasteten Beintagen. Verändert das Original nicht. */
export function runEaseShape(state: AppState, b: PlanBlock, week: number, f: Focus): Focus {
  const targets = easeTargets(state, b, week, f);
  if (!targets.length) return f;
  const roles = { ...f.roles };
  for (const t of targets) {
    const why = t.run.date === t.date
      ? "Harter Lauf am selben Tag: ein Satz weniger, die Beine entlasten sich mit."
      : "Harter Lauf am Vortag: ein Satz weniger, die Beine erholen sich besser.";
    if (roles[t.role]) roles[t.role] = easeRole(roles[t.role], why);
  }
  return { ...f, roles };
}

/* Lastbestien (Morgenland): ein Item, fester Timecap, Leistungsindex = Gewicht (oder Band), mit dem man die Bestie im Timecap bezwingt.
   Alle Lastübungen einer Bestie laufen mit demselben Gewicht (je Hantel) bzw. demselben Band.
   Prozentangaben (Bench Press 50 %) beziehen sich auf das 1RM der Übung: selbst eingetragen oder aus dem Log geschätzt. */
import { BANDS, BEAST_BY_ID } from "../data";
import type { AppState, Beast, BeastTime, EquipmentProfile } from "../types";
import { beastFamily, beastNeeds, beastRegion } from "./plan";

export type LoadKind = "barbell" | "kettlebell" | "dumbbell" | "band";
export const LOAD_LABEL: Record<LoadKind, string> = { barbell: "Langhantel", kettlebell: "Kettlebell", dumbbell: "Kurzhantel", band: "Band" };

const base = (b: Beast): Beast => BEAST_BY_ID[beastFamily(b.id)[0]] ?? b;
export const isLoadBeast = (b: Beast): boolean => !b.parts && beastRegion(base(b)) === "sued";
export const capOf = (b: Beast): number | null => (isLoadBeast(b) ? (base(b).cap ?? Math.ceil(base(b).minutes * 1.25)) * (b.repeat ?? 1) : null);

const KB_RX = /\bkb\b|kettlebell|swing|halo|goblet|sumo pull|side bend/i;
export function loadKind(b: Beast): LoadKind | null {
  const n = beastNeeds(base(b));
  if (n.has("barbell")) return "barbell";
  if (n.has("kb_db")) return KB_RX.test(b.work) && !/thruster|db |chest fl|reverse fl|curl|triceps|shrug/i.test(b.work) ? "kettlebell" : "dumbbell";
  if (n.has("band") || n.has("band_or_cable")) return "band";
  return null;
}

/** Übung mit Prozentangabe → Übung der Bibliothek, deren 1RM zählt */
const PCT_LIFT: [RegExp, string][] = [[/bench press/i, "Bench Press"], [/deadlift/i, "Deadlift"], [/squat/i, "Back Squat"]];
export function pctLift(b: Beast): { exercise: string; pct: number } | null {
  for (const part of b.work.split(" · ")) {
    const m = part.match(/(\d+)\s?%/);
    if (!m) continue;
    const lift = PCT_LIFT.find(([rx]) => rx.test(part));
    if (lift) return { exercise: lift[1], pct: parseInt(m[1]) / 100 };
  }
  return null;
}

/** Epley: kg × (1 + Wdh/30), nur Sätze bis 12 Wiederholungen */
export const epley = (kg: number, reps: number) => kg * (1 + reps / 30);

/** 1RM: selbst eingetragen hat Vorrang, sonst die beste Schätzung aus dem Log */
export function oneRM(state: AppState, exercise: string): { kg: number; source: "manuell" | "geschätzt"; date: string } | null {
  const own = state.oneRM?.[exercise];
  if (own) return { ...own, source: "manuell" };
  let best: { kg: number; date: string } | null = null;
  for (const s of state.sessions) if (s.done) for (const e of Object.values(s.entries)) {
    if (e.name !== exercise && !e.name.startsWith(`${exercise} `)) continue;
    for (const x of e.sets) if (x.done && x.weight && x.reps && x.reps <= 12) {
      const est = epley(x.weight, x.reps);
      if (!best || est > best.kg) best = { kg: Math.round(est * 2) / 2, date: s.date };
    }
  }
  return best ? { ...best, source: "geschätzt" } : null;
}

const bandRank = (band: string, p?: EquipmentProfile) => {
  const i = BANDS.levels.indexOf(band.toLowerCase());
  return i >= 0 ? i : p ? p.bands.indexOf(band) : -1;
};

/** Rekord: schwerstes Gewicht bzw. stärkstes Band, mit dem die Bestie im Timecap bezwungen wurde */
export function loadRecord(b: Beast, times: BeastTime[] | undefined): BeastTime | null {
  const cap = capOf(b);
  if (cap == null) return null;
  const ok = (times ?? []).filter((t) => t.seconds <= cap * 60 && (t.kg != null || t.band));
  if (!ok.length) return null;
  return ok.reduce((a, c) => ((c.kg ?? -1) > (a.kg ?? -1) || (c.band && a.band && bandRank(c.band) > bandRank(a.band)) ? c : a), ok[0]);
}

/** Vorschlag fürs Gewicht: zuletzt benutzt → Prozent vom 1RM → Startwert der Bestie. null = selbst festlegen. */
export function suggestLoad(state: AppState, b: Beast, p: EquipmentProfile): { kg?: number; band?: string; why: string } | null {
  const kind = loadKind(b);
  if (!kind) return null;
  const last = [...(state.beastTimes[b.id] ?? [])].reverse().find((t) => t.kg != null || t.band);
  const start = base(b).start;
  if (kind === "band") {
    if (last?.band) return { band: last.band, why: "wie zuletzt" };
    if (!p.bands.length) return null;
    // Startstufe auf die Bänder im Profil legen (eigene Namen: Reihenfolge leicht → schwer)
    const want = BANDS.levels.indexOf(start?.band ?? "mittel");
    const band = p.bands.find((x) => x.toLowerCase() === start?.band) ?? p.bands[Math.min(p.bands.length - 1, Math.max(0, want))];
    return { band, why: "Startwert" };
  }
  if (last?.kg != null) return { kg: last.kg, why: "wie zuletzt" };
  const pl = pctLift(b);
  if (pl) {
    const rm = oneRM(state, pl.exercise);
    return rm ? { kg: Math.round((rm.kg * pl.pct) / 2.5) * 2.5, why: `${Math.round(pl.pct * 100)} % von ${rm.kg} kg (1RM ${pl.exercise})` } : null;
  }
  return start?.kg != null ? { kg: start.kg, why: "Startwert" } : null;
}

/* Lenkung (Baustein „Wizard-Empfehlungen“): Rote Residual-Uhren fließen in die Vorschläge der
   App ein — als Empfehlung, nie als Einplanung. Die Eskalationsleiter hat drei Stufen:
   1. Blockfolge und Meso-Wizard ziehen Orden vor, deren Bereiche die roten Uhren halten.
   2. Schwerpunkt 2 priorisiert die rote Domäne als Vertiefungs-Kandidatin (sharpen.ts).
   3. Die Uhr-Karte empfiehlt eine Gelegenheit aus dem Bestand, etwa eine Bestie mit Sprintanteil.
   Die Uhr zeigt, der Wizard schlägt vor, du entscheidest — nichts wird gesperrt oder eingeplant. */
import { BEASTS } from "../data";
import type { AxisId } from "./balance";
import { beastPowers, type ClockId, type ResidualClock } from "./residual";
import type { DeficitWeights } from "./sequence";

/** Uhr → Achsen der Jahresbalance. Kraft & Masse hält zwei Achsen, Sehnen läuft über Kraft mit. */
export const CLOCK_AXES: Record<ClockId, AxisId[]> = {
  schnellkraft: ["schnellkraft"],
  ke: ["kondition"],
  anaerob: ["kondition"],
  aerob: ["ausdauer"],
  mobility: ["beweglichkeit"],
  sehnen: ["kraft"],
  kraft: ["kraft", "muskel"],
};

/** Uhr → Schwerpunkt-Bereiche mit Slot-Modul (Stufe 2). Kraft, Sehnen und Skill haben kein Modul:
    Sie brauchen einen Orden mit eigenen Blöcken, keinen kleinen Slot. */
export const CLOCK_SHARPEN: Record<ClockId, string[]> = {
  schnellkraft: ["speed", "power"],
  ke: ["ke"],
  anaerob: ["anaerob"],
  aerob: ["aerob"],
  mobility: ["mobility"],
  sehnen: [],
  kraft: [],
};

/** Rote Uhren, dringendste zuerst: „noch nie“ zählt am längsten, sonst Tage über Budget. */
export function hotClocks(clocks: ResidualClock[]): ResidualClock[] {
  return clocks.filter((c) => c.over).sort((a, b) => (b.days ?? 1e9) / b.budget - (a.days ?? 1e9) / a.budget);
}

/** Rote Uhren als Gewichte für die Blockfolge (Stufe 1): Die dringendste Uhr zählt am meisten,
    jede Achse bekommt das höchste Gewicht ihrer Uhren — wie die Defizite aus der Testwoche. */
export function steerWeights(clocks: ResidualClock[]): DeficitWeights {
  const ws = [1, 0.7, 0.5, 0.35];
  const out = new Map<AxisId, number>();
  hotClocks(clocks).forEach((c, i) => {
    for (const axis of CLOCK_AXES[c.id]) out.set(axis, Math.max(out.get(axis) ?? 0, ws[i] ?? 0.2));
  });
  return [...out].map(([axis, w]) => ({ axis, w }));
}

export interface Opportunity {
  clock: ClockId;
  /** Klartext: wie du den Bereich ohne Einplanung frisch hältst */
  text: string;
}

/** Gelegenheiten aus dem Bestand (Stufe 3): je roter Uhr ein Weg, den Bereich zu bedienen. */
export function opportunities(clocks: ResidualClock[]): Opportunity[] {
  const sprints = BEASTS.filter(beastPowers).slice(0, 2).map((b) => b.name);
  const TXT: Record<ClockId, string> = {
    schnellkraft: sprints.length
      ? `Eine Bestie mit Sprint- oder Sprunganteil, z. B. ${sprints.join(" oder ")} — der Sprints-Schalter bei der Tageswahl läuft ohnehin mit.`
      : "Ein Orden mit Sprungkraft als Ziel oder der Explosivteil eines Kontrastpaars.",
    ke: `Eine Bestie (z. B. ${BEASTS[0]?.name ?? "aus dem Bestand"}) oder die freie Jagd.`,
    anaerob: "Intervalle in einer Einheit oder eine Bestie.",
    aerob: "Ein Zeitblock: Laufen, Rudern oder Bestien-Cardio.",
    mobility: "Die Flows im Warm-up und Cool-down laufen ohnehin mit — einmal einen ganzen Flow bewusst langsam.",
    sehnen: "Eine Halteübung am Ende des Kraftteils: Zeit unter Spannung statt Sätzen.",
    kraft: "Ein Orden mit schweren Grund-Sätzen — Smith hält Kraft und Masse zusammen.",
  };
  return hotClocks(clocks).map((c) => ({ clock: c.id, text: TXT[c.id] }));
}

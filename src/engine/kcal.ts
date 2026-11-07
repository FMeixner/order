/* Kalorien-Layer (Baustein „Kalorien“): Energiezufuhr und geplante Last koppeln.
   Die Architektur plant Reize — hier kommt die Energie dazu. Der Nutzer setzt einen Modus
   je Mesozyklus-Teil (Defizit, Erhaltung, Überschuss), die App schätzt den Burn des Ordens
   nach seinen Übungen und warnt, wenn die Kombination nicht trägt:
   - Hochlastphasen und Aufbau-Akzente vertragen kein Defizit — erst recht nicht mit einem
     High-Burn-Orden (mehr verbrannt als gegessen auf hohem Lastniveau).
   - Ein anstrengender Orden läuft auch mal sechs Wochen, aber im Maintenance oder Überschuss.
   - Defizit-Fenster gehören in niedriglastige Phasen mit Ordnern, die im Defizit arbeiten können.
   Wie überall: Vorschlag und Warnung, nie Sperre oder Einplanung. */
import { AXES } from "./balance";
import type { AxisId } from "../types";
import type { Block, Focus, Kcal, Load, PlanBlock, SlotKind } from "../types";

/** Burn je Slot-Art: Intervalle und Timer verbrennen am meisten, reine Kraftsätze mit Pausen wenig, Halts fast nichts. */
const SLOT_BURN: Record<SlotKind, number> = { interval: 0.85, timer: 0.8, strength: 0.3, hold: 0.1 };

/** Burn je Block, nach seinen Übungen: Bestien verbrennen am meisten, Kontrastpaare und Supersets liegen dahinter, Module/Skill kaum. */
function blockBurn(b: Block): number {
  if (b.type === "beast") return 1;
  if (b.type === "contrast") return 0.65;
  if (b.type === "module") return 0.15;
  const slots = b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : [];
  if (!slots.length) return 0.3;
  return slots.reduce((s, x) => s + SLOT_BURN[x.kind ?? "strength"], 0) / slots.length;
}

/** Burn-Schätzung eines Ordens nach seinen Übungen (0 bis 1), gemittelt über die Rollen der Trainingswoche.
    A- und B-Wochen zählen beide (nur die B-Fassung wird nicht doppelt gewertet). Bestien zählen doppelt:
    Sie tragen die meiste verbrannte Zeit. Hohe Alltagslast senkt den Wert — ab dann läuft etwa die Hälfte
    der Kraftübungen geführt an Maschine oder Kabel (resolve.ts, guidedKeys), und Maschinenarbeit verbrennt
    weniger als freie Gewichte. */
export function burnOf(f: Focus, load: Load = "medium"): number {
  const roles = Object.values(f.roles).filter((r) => !r.optional);
  if (!roles.length) return 0;
  const per = roles.map((r) => {
    const blocks = r.blocks.filter((b) => b.rotation !== "B");
    let score = 0, weight = 0;
    for (const b of blocks) {
      const w = b.type === "beast" ? 2 : 1;
      score += blockBurn(b) * w;
      weight += w;
    }
    return weight ? score / weight : 0;
  });
  let out = per.reduce((a, c) => a + c, 0) / per.length;
  if (load === "high") out *= 0.8;
  return out;
}

/** Ab hier gilt ein Orden als anstrengend im Kalorien-Sinn (High-Burn). */
export const HIGH_BURN = 0.5;
export function burnLabel(x: number): string {
  return x >= HIGH_BURN ? "hoher Burn" : x >= 0.3 ? "mittlerer Burn" : "niedriger Burn";
}

export const KCAL_LABEL: Record<Kcal, string> = { deficit: "Defizit", maintenance: "Erhaltung", surplus: "Überschuss" };

/** Achsen-Name für Hinweistexte */
export const axisName = (a: AxisId): string => AXES.find((x) => x.id === a)?.name ?? a;

/** Verträglichkeit des Kalorien-Modus mit der Phase: je Konflikt ein Satz, Warnung statt Sperre. */
export function kcalCheck(b: PlanBlock, f: Focus | null): string[] {
  if (!b.kcal || !f) return [];
  const out: string[] = [];
  if (b.kcal === "deficit") {
    if (f.nutrition === "surplus") out.push(`${f.name} ist auf Kalorienüberschuss ausgelegt — im Defizit leidet, was der Orden aufbauen soll.`);
    if (f.nutrition !== "deficit" && burnOf(f, b.load) >= HIGH_BURN) out.push(`${f.name} verbrennt viel (${burnLabel(burnOf(f, b.load))}) — ein anstrengender Orden läuft höchstens über einige Wochen, und dann im Maintenance oder Überschuss.`);
    if (b.accent === "muskel" || b.accent === "kraft") out.push(`Der Akzent auf ${axisName(b.accent)} baut auf — im Defizit läuft er ins Leere.`);
  }
  if (b.kcal === "surplus" && f.nutrition === "deficit") out.push(`${f.name} ist auf Abnehmen ausgelegt — im Überschuss läuft er nicht besser.`);
  return out;
}

/** Welche Ziel-Domäne trägt der Orden als Hauptziel? (null: Hauptziel liegt auf keiner Achse) */
export function primaryAxis(f: Focus): AxisId | null {
  return AXES.find((a) => (a.goals as readonly string[]).includes(f.goals.primary))?.id ?? null;
}

/** Trägt ein Orden die Ziel-Domäne als Akzent? Hauptziel auf der Achse — und genug Volumen, um sie zu tragen:
    Zeitoptimierte Orden (kurze Einheiten) halten eine Domäne nicht über einen ganzen Akzent-Teil (Friedrichs Herald-Entscheidung). */
export function carriesAccent(f: Focus, axis: AxisId): boolean {
  return primaryAxis(f) === axis && f.session_min >= 35;
}

/** Wizard-Empfehlung für den Kalorien-Modus eines Teils. null: kein Grund für einen Vorschlag. */
export function recKcalOf(b: PlanBlock, f: Focus | null): { mode: Kcal; why: string } | null {
  if (!f) return null;
  const aufbau = b.accent === "muskel" || b.accent === "kraft" || f.goals.primary === "hypertrophy" || f.goals.primary === "strength";
  if (aufbau) return b.kcal === "surplus" ? null : { mode: "surplus", why: `Aufbau (${axisName(b.accent ?? primaryAxis(f) ?? "kraft")}) braucht Energie — Überschuss oder mindestens Erhaltung.` };
  if (b.load === "low" && f.nutrition !== "surplus") return b.kcal === "deficit" ? null : { mode: "deficit", why: "Niedrige Alltagslast — ein gutes Fenster für ein Defizit." };
  if (b.load === "high") return b.kcal === "maintenance" ? null : { mode: "maintenance", why: "Hohe Alltagslast — der Alltag kostet schon genug." };
  return null;
}

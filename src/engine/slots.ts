/* Gemeinsame Helfer für Orden-Rollen und Slots (Wochenform, Kurztag). */
import { EQUIPMENT_PRESETS } from "../store";
import type { EquipmentProfile, Role, Slot } from "../types";
import { estimateRole } from "./duration";
import { parseReps } from "./resolve";

export const isStrength = (s: Slot) => (s.kind ?? "strength") === "strength";
/** Schwer: lange Pause, Top-Satz oder höchstens 6 Wiederholungen */
export const isHeavy = (s: Slot) => (s.rest ?? 90) >= 150 || s.prog === "topset" || (parseReps(s.reps ?? "").hi ?? 99) <= 6;

let presets: Record<Role["location"], EquipmentProfile> | null = null;
/** Geschätzte Dauer einer Rolle mit dem Standard-Equipment ihres Orts (zum Planen, nicht für die Anzeige) */
export const planMinutes = (r: Role) => estimateRole(r, (presets ??= { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() })[r.location]).total;

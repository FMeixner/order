/* Seiten ausgleichen (1.51, Friedrich): spezifische Ausnahme zur globalen Vorliebe für beidseitige Übungen.
   Ist die Option beim Ordensstart gewählt, wird je Einheit und Körperhälfte die erste beidseitige Nebenübung mit
   einseitiger Variante (data/modules/unilateral.json) getauscht. Hauptübungen bleiben beidseitig. Einseitiges Training
   gleicht Seitenunterschiede aus, ohne beidseitige Kraft zu kosten (Speirs et al., 2016). */
import uniJson from "../../data/modules/unilateral.json";

const U = uniJson as unknown as { upper: Record<string, string>; lower: Record<string, string> };
export type Half = "upper" | "lower";
/** Einseitige Variante und Körperhälfte, falls es eine gibt */
export function uniFor(name: string): { name: string; half: Half } | null {
  if (U.upper[name]) return { name: U.upper[name], half: "upper" };
  if (U.lower[name]) return { name: U.lower[name], half: "lower" };
  return null;
}
export const UNI_NOTE = "Seiten ausgleichen: schwächere Seite zuerst, die stärkere macht nicht mehr Wiederholungen.";

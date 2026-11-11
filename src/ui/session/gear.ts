/* Was der Tag an Ausrüstung braucht: aus den aufgelösten Übungen (am Ort), den Bestien und den Waffenblöcken.
   Für die Fokuszeile zwischen Tagesknöpfen und Warm-up. Körpergewicht und Strecke werden nicht genannt. */
import { EXERCISES } from "../../data";
import { beastNeeds, MODULE_LABEL } from "../../engine/plan";
import type { Equip } from "../../types";
import type { Item } from "./items";

const EQUIP: Partial<Record<Equip, string>> = { barbell: "Langhantel", dumbbell: "Kurzhanteln", kettlebell: "Kettlebell", cable: "Kabelzug", machine: "Maschinen", band: "Band", sandbag: "Sandsack", vest: "Weste" };
const NEED: Record<string, string> = { bar: "Stange", rings: "Ringe", bench: "Bank", box: "Box", rower: "Rudergerät", bike: "Rad", medball: "Medizinball", rope: "Springseil", dip: "Dip-Barren", wheel: "Bauchroller", sword: "Schwert" };
const BEAST: Record<string, string> = { rings: "Ringe", bar: "Stange", band: "Band", band_or_cable: "Band", barbell: "Langhantel", kb_db: "Kurzhantel oder Kettlebell", sandbag: "Sandsack", rower: "Rudergerät", bike: "Rad" };
/** Reihenfolge der Anzeige: große Geräte zuerst */
const ORDER = ["Langhantel", "Kurzhanteln", "Kettlebell", "Kurzhantel oder Kettlebell", "Sandsack", "Kabelzug", "Maschinen", "Stange", "Ringe", "Dip-Barren", "Bank", "Box", "Band", "Weste", "Medizinball", "Bauchroller", "Springseil", "Rudergerät", "Rad", "Schwert", "Langschwert", "Stab"];

export function dayGear(items: Item[]): string[] {
  const out = new Set<string>();
  for (const it of items) {
    for (const r of it.resolved) {
      const e = r.equip === "plate" ? "Weste" : EQUIP[r.equip];
      if (e) out.add(e);
      for (const n of EXERCISES[r.name]?.needs ?? []) if (NEED[n]) out.add(NEED[n]);
    }
    if (it.beast) for (const n of beastNeeds(it.beast)) if (BEAST[n]) out.add(BEAST[n]);
    if (it.block.type === "module" && it.block.module in MODULE_LABEL && it.drills?.length) out.add(MODULE_LABEL[it.block.module as keyof typeof MODULE_LABEL]);
  }
  // „Kurzhantel oder Kettlebell“ fällt weg, wenn Kurzhanteln oder Kettlebell ohnehin dabei sind
  if (out.has("Kurzhanteln") || out.has("Kettlebell")) out.delete("Kurzhantel oder Kettlebell");
  return [...out].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

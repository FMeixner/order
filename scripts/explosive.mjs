/* Explosives vor Ausdauer (1.32): In keiner Rolle steht ein Lauf-, Intervall- oder Bestienblock vor einer Sprung-,
   Wurf- oder Sprintübung (Schumann et al., 2022: Ausdauer stört vor allem die Explosivkraft). Geprüft je Rolle und
   A/B-Woche, auch in den Rollen für hohe Last. Genutzt von validate.mjs und explosive.test.ts. */

/** Sprung, Wurf, Sprint (als Übung mit Sätzen, nicht als Intervall) */
export const EXPLOSIVE = /jump|sprung|sprint|shuttle|throw|wurf|slam|hop\b|hops\b|bound|clap|plyo|skater|medicine ball|medizinball|chest pass|broad|depth|tuck jump/i;
/** Läufe und Zeitblöcke für Ausdauer (Rudern, Rad, Auslaufen); andere Zeitblöcke (Landungen, Atmung, freie Linie) zählen nicht */
export const ENDURANCE = /lauf|run\b|running|jog|rudern|row \d|rowing|bike|rad\b|auslaufen|grundlage/i;

const slotsOf = (b) => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const isEndurance = (b) => b.type === "beast" || (b.type === "superset" && !!b.finisher)
  || slotsOf(b).some((s) => s.kind === "interval" || (ENDURANCE.test(s.name) && !EXPLOSIVE.test(s.name)));
const isExplosive = (b) => slotsOf(b).some((s) => s.kind !== "interval" && s.kind !== "timer" && EXPLOSIVE.test(s.name));
const label = (b) => (b.type === "beast" ? "Bestie" : b.type === "superset" && b.finisher ? `Finisher (${b.slots.map((s) => s.name).join(" + ")})` : slotsOf(b).map((s) => s.name).join(" + "));

/** Verstöße eines Ordens: [{ role, week, endurance, explosive }] — role mit „(hohe Last)“ für die Hochlast-Rollen */
export function explosiveViolations(order) {
  const roles = [...Object.entries(order.roles ?? {})];
  for (const side of ["odd", "even"]) for (const [k, r] of Object.entries(order.high_load?.[side] ?? {})) roles.push([`${k} (hohe Last, ${side === "odd" ? "ungerade" : "gerade"} Wochen)`, r]);
  const out = [];
  const ends = [];
  for (const [role, r] of roles) for (const ab of ["A", "B"]) {
    const bs = (r.blocks ?? []).filter((b) => !b.rotation || b.rotation === ab);
    const firstE = bs.findIndex(isEndurance);
    if (firstE < 0) continue;
    const lateIx = bs.findIndex((b, i) => i > firstE && isExplosive(b));
    if (lateIx < 0) continue;
    const late = bs[lateIx];
    // Kraftvolles Ende (Entscheidung 11.11.2026): ein kurzes explosives Stück ganz am Schluss ist erlaubt, wenn die Rolle
    // explosiv beginnt (Sprung, Wurf oder Sprint-Intervall) – höchstens eine solche Rolle je Orden
    if (lateIx === bs.length - 1 && isShort(late) && startsExplosive(bs)) { if (!ends.includes(role)) ends.push(role); continue; }
    const key = `${role}: ${label(bs[firstE])} vor ${label(late)}`;
    if (!out.some((o) => o.key === key)) out.push({ role, week: ab, key, endurance: label(bs[firstE]), explosive: label(late) });
  }
  if (ends.length > 1) out.push({ role: ends.join(", "), week: "A", key: `mehr als ein kraftvolles Ende: ${ends.join(", ")}`, endurance: "", explosive: "" });
  return out;
}

/** Kurz: eine Übung, höchstens 3 Sätze, höchstens 20 Wiederholungen oder eine Strecke */
const isShort = (b) => b.type === "single" && (b.slot.sets ?? 1) <= 3 && (/\bm\b/.test(b.slot.reps ?? "") || (parseInt(b.slot.reps ?? "0") || 0) <= 20);
const startsExplosive = (bs) => !!bs[0] && (isExplosive(bs[0]) || slotsOf(bs[0]).some((s) => s.kind === "interval" && /sprint/i.test(s.name)));

/** Bekannte Verstöße: Ordensinhalt kuratiert der Nutzer (Entscheidung 10.11.2026). Nicht still umstellen, sondern hier
    auflisten und den Nutzer fragen. Neue Verstöße und veraltete Einträge sind Fehler. Format: "<orden> | <Befund>". */
export const KNOWN = [];

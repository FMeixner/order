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
  for (const [role, r] of roles) for (const ab of ["A", "B"]) {
    const bs = (r.blocks ?? []).filter((b) => !b.rotation || b.rotation === ab);
    const firstE = bs.findIndex(isEndurance);
    if (firstE < 0) continue;
    const late = bs.slice(firstE + 1).find(isExplosive);
    if (!late) continue;
    const key = `${role}: ${label(bs[firstE])} vor ${label(late)}`;
    if (!out.some((o) => o.key === key)) out.push({ role, week: ab, key, endurance: label(bs[firstE]), explosive: label(late) });
  }
  return out;
}

/** Bekannte Verstöße: Ordensinhalt kuratiert der Nutzer (Entscheidung 10.11.2026). Nicht still umstellen, sondern hier
    auflisten und den Nutzer fragen. Neue Verstöße und veraltete Einträge sind Fehler. Format: "<orden> | <Befund>". */
export const KNOWN = [
  "huntsman | bestie_rotation: Bestie vor Shuttle Runs 6 × 20 m",
  "olympian | bonus: Seilspringen vor Pogo Hops",
  "scout | seil: Seilsprints vor Pogo Hops",
  "skirmisher | bonus: Bestie vor Pogo Hops",
];

// Prüft alle Daten in /data. Läuft mit `npm run validate` und in der CI.
// Meldet Fehler (Build bricht ab) und Hinweise (nur Ausgabe).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);

const exercises = read("exercises.json");
const beasts = read("beasts.json");
const correctives = read("modules/correctives.json").lists;
const dm = read("modules/sword.json").variants;
const beastIds = new Set(beasts.map((b) => b.id));
const guided = read("modules/guided.json").map;
for (const [free, g] of Object.entries(guided)) {
  if (!exercises[free]) err("guided.json", `freie Übung "${free}" fehlt in exercises.json`);
  if (!exercises[g]) err("guided.json", `geführte Übung "${g}" fehlt in exercises.json`);
  else if (!["machine", "cable"].includes(exercises[g].equip)) err("guided.json", `"${g}" ist keine Maschine und kein Kabel`);
}

const EQUIPS = new Set(["barbell", "dumbbell", "kettlebell", "cable", "machine", "plate", "vest", "band", "bodyweight", "cardio", "skill", "sandbag", "none", "other"]);
const PROGS = new Set(["double", "weight", "reps", "hold", "minutes", "ladder", "topset", "none"]);
const TIERS = new Set(["gym", "home", "reise"]);
const CLASSES = new Set(["plage", "bestie", "ungeheuer", "uralte", "verfluchte"]);
const GOALS = new Set(["hypertrophy", "strength", "power", "speed", "conditioning", "endurance", "fatloss", "skill", "mobility", "wellbeing", "test"]);

for (const [name, e] of Object.entries(exercises)) {
  if (!EQUIPS.has(e.equip)) err("exercises.json", `${name}: unbekanntes equip "${e.equip}"`);
}
for (const b of beasts) {
  if (!b.id || !b.name || !b.rounds || !b.minutes) err("beasts.json", `unvollständig: ${JSON.stringify(b).slice(0, 60)}`);
}

const files = readdirSync(join(root, "orders")).filter((f) => f.endsWith(".json"));
const focusIds = new Set();
const allFoci = files.map((f) => [f, read(join("orders", f))]);
for (const [f, d] of allFoci) focusIds.add(d.id);

for (const [f, d] of allFoci) {
  if (d.schema !== 1) err(f, "schema muss 1 sein");
  if (`${d.id}.json` !== f) err(f, `Dateiname passt nicht zur id "${d.id}"`);
  for (const k of ["name", "tagline", "description", "nutrition", "load_fit", "level", "session_min", "weeks", "week_4", "week_3", "roles", "goals"]) {
    if (d[k] === undefined) err(f, `Feld fehlt: ${k}`);
  }
  if (d.goals && !GOALS.has(d.goals.primary)) err(f, `unbekanntes Ziel ${d.goals.primary}`);
  for (const s of d.successors || []) if (!focusIds.has(s)) warn(f, `Nachfolger "${s}" existiert nicht`);
  for (const r of [...(d.week_4 || []), ...(d.week_3 || [])]) if (!d.roles[r]) err(f, `Rolle "${r}" fehlt in roles`);
  if ((d.week_3 || []).length < 3) err(f, "week_3 braucht mindestens 3 Rollen");

  const slotIds = new Map();
  const checkSlot = (s, ctx) => {
    if (!s.id || !s.name) return err(f, `${ctx}: Slot ohne id oder name`);
    const prev = slotIds.get(s.id);
    if (prev && prev !== s.name) err(f, `${ctx}: Slot-ID ${s.id} doppelt mit anderer Übung (${prev} / ${s.name})`);
    slotIds.set(s.id, s.name);
    if (s.prog && !PROGS.has(s.prog)) err(f, `${ctx} ${s.id}: unbekannte prog "${s.prog}"`);
    const names = [s.name];
    for (const t of ["home", "reise"]) {
      const v = s[t];
      if (typeof v === "string") names.push(v);
      else if (v && typeof v === "object") { names.push(v.name); if (v.prog && !PROGS.has(v.prog)) err(f, `${s.id}.${t}: prog`); }
    }
    for (const l of s.ladder || []) names.push(l);
    if (s.prog === "ladder" && !(s.ladder && s.ladder.length >= 2)) err(f, `${s.id}: ladder braucht mindestens 2 Stufen`);
    for (const n of names) if (!exercises[n]) err(f, `${s.id}: Übung "${n}" fehlt in exercises.json`);
    const kind = s.kind || "strength";
    if (kind === "strength" && !(s.sets && s.reps)) err(f, `${s.id}: sets und reps fehlen`);
    if (kind === "hold" && !(s.sets && s.hold)) err(f, `${s.id}: hold braucht sets und hold`);
    if (kind === "timer" && !s.minutes) err(f, `${s.id}: timer braucht minutes`);
    if (kind === "interval" && !s.interval) err(f, `${s.id}: interval fehlt`);
  };

  for (const [rk, r] of Object.entries(d.roles || {})) {
    const ctx = `${rk}`;
    if (!TIERS.has(r.location)) err(f, `${ctx}: location muss gym, home oder reise sein`);
    for (const w of [...(r.warmup || []), ...(r.cooldown || [])]) if (!correctives[w]) err(f, `${ctx}: Liste "${w}" fehlt in correctives.json`);
    for (const b of r.blocks || []) {
      switch (b.type) {
        case "single": checkSlot(b.slot, ctx); break;
        case "superset": b.slots.forEach((s) => checkSlot(s, ctx)); break;
        case "contrast": checkSlot(b.heavy, ctx); checkSlot(b.explosive, ctx); break;
        case "menu": Object.values(b.options).forEach((s) => checkSlot(s, `${ctx}/${b.id}`)); break;
        case "module":
          if (b.module !== "sword" || !dm[b.variant]) err(f, `${ctx}: Modul-Variante ${b.variant} unbekannt`);
          if (b.fallback) checkSlot(b.fallback, ctx);
          break;
        case "beast":
          for (const id of b.pool || []) if (!beastIds.has(id)) err(f, `${ctx}: Bestie ${id} unbekannt`);
          for (const c of b.classes || []) if (!CLASSES.has(c)) err(f, `${ctx}: Klasse ${c} unbekannt`);
          if (!b.pool && !b.classes) err(f, `${ctx}: Bestie braucht pool oder classes`);
          break;
        default: err(f, `${ctx}: unbekannter Blocktyp ${b.type}`);
      }
    }
  }
}

for (const w of warns) console.log("Hinweis:", w);
if (errors.length) {
  for (const e of errors) console.error("Fehler:", e);
  console.error(`\n${errors.length} Fehler in den Daten.`);
  process.exit(1);
}
console.log(`Daten ok: ${allFoci.length} Orden, ${Object.keys(exercises).length} Übungen, ${beasts.length} Bestien.`);

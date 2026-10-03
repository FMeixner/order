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
const flows = read("modules/flows.json").variants;
const sharpen = read("modules/sharpen.json").domains;
for (const [k, d] of Object.entries(sharpen)) {
  if (!d.name || !["start", "end"].includes(d.place) || !["all", 1, 2].includes(d.days) || !d.drills?.length) err("sharpen.json", `${k}: name, place (start/end), days (all/1/2) und drills nötig`);
  for (const x of d.drills ?? []) if (!x.id || !x.name || !["reps", "hold"].includes(x.mode) || !(x.value > 0) || (x.mode === "reps" && !x.rep_s)) err("sharpen.json", `${k}/${x.id}: id, name, mode, value und bei reps rep_s nötig`);
}
for (const [v, fl] of Object.entries(flows)) {
  if (!fl.name) err("flows.json", `${v}: name fehlt`);
  for (const d of fl.drills) {
    if (!d.id || !d.name || !["reps", "hold"].includes(d.mode) || !(d.value > 0)) err("flows.json", `${v}/${d.id}: id, name, mode (reps/hold) und value nötig`);
    if (d.mode === "reps" && !d.rep_s) err("flows.json", `${v}/${d.id}: rep_s fehlt (Sekunden pro Wiederholung)`);
  }
}
const beastIds = new Set(beasts.map((b) => b.id));
const skillsFile = read("modules/skills.json");
const groupIds = new Set(skillsFile.groups.map((g) => g.id));
for (const sk of skillsFile.skills) {
  const w = `skills.json ${sk.id}`;
  if (!groupIds.has(sk.group)) err(w, `Gruppe "${sk.group}" fehlt`);
  for (const n of [...sk.exercises, ...(sk.start ?? [])]) if (!exercises[n]) err(w, `"${n}" fehlt in exercises.json`);
  for (const [from, list] of Object.entries(sk.regress)) {
    if (!sk.exercises.includes(from)) err(w, `regress für "${from}", die Übung steht nicht in exercises`);
    for (const n of list) if (!exercises[n]) err(w, `Ersatz "${n}" fehlt in exercises.json`);
  }
  try { new RegExp(sk.beast, "i"); } catch { err(w, "beast ist kein gültiger Suchausdruck"); }
}
const swaps = read("modules/swaps.json").groups;
for (const [g, members] of Object.entries(swaps)) {
  for (const m of members) if (!exercises[m]) err("swaps.json", `Gruppe "${g}": "${m}" fehlt in exercises.json`);
  if (new Set(members).size !== members.length) err("swaps.json", `Gruppe "${g}" enthält doppelte Übungen`);
}
const normsFile = read("modules/norms.json");
const testIds = new Set(read("modules/testweek.json").cups.flatMap((c) => c.tests.map((t) => t.id)));
const testVariants = Object.fromEntries(read("modules/testweek.json").cups.flatMap((c) => c.tests.map((t) => [t.id, (t.variants ?? []).map((v) => v.id)])));
for (const n of normsFile.norms) {
  const where = `norms.json ${n.test}${n.variant ? "/" + n.variant : ""}`;
  if (!testIds.has(n.test)) err(where, "Test gibt es in testweek.json nicht");
  if (n.variant && !testVariants[n.test]?.includes(n.variant)) err(where, `Variante "${n.variant}" fehlt am Test`);
  if (!["m", "w"].includes(n.sex)) err(where, "sex muss m oder w sein");
  if (!Array.isArray(n.age) || n.age.length !== 2 || n.age[0] > n.age[1]) err(where, "age muss [von, bis] sein");
  if (!["A", "B"].includes(n.tier)) err(where, "tier muss A oder B sein");
  if (n.type === "pct" && !(n.anchors?.length >= 2)) err(where, "pct braucht mindestens zwei anchors");
  if (n.type === "bands" && n.bands?.length !== 3) err(where, "bands braucht drei Werte");
  if (n.type === "ms" && !(n.mean > 0 && n.sd > 0)) err(where, "ms braucht mean und sd");
  if (n.type === "cat" && !n.cats?.length) err(where, "cat braucht cats");
}
for (const d of normsFile.domains) for (const t of d.tests) if (!testIds.has(t)) err("norms.json", `Bereich ${d.id}: Test ${t} fehlt in testweek.json`);
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
  if (d.medley) for (const m of d.medley) if (!focusIds.has(m) || m === d.id) err(f, `medley: Orden "${m}" gibt es nicht`);
  if (!d.medley) if ((d.week_3 || []).length < 3) err(f, "week_3 braucht mindestens 3 Rollen");

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
          if (b.module === "flow" ? !flows[b.variant] : b.module === "sharpen" ? !sharpen[b.variant] : b.module !== "sword" || !dm[b.variant]) err(f, `${ctx}: Modul-Variante ${b.variant} unbekannt`);
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

// Erzähler: jede Orden-Datei braucht eine Szene, jede Szene Inhalt, keine unbekannten Platzhalter
{
  const f = "narrative/generic.json";
  const pack = read(f);
  const tokens = new Set(["held", "sie", "ihn", "ihm", "ihr", "die", "in", "feind", "feind_dat", "feind_akk", "feind_gen", "desc", "weak", "fp", "ort", "schar", "bestie", "bestie_zwei", "n", "von", "stellen", "mal", "beiname", "vorsieg", "vorfeind_akk", "vorfeind_dat", "klinge"]);
  const check = (ctx, t) => {
    for (const m of t.matchAll(/\{([A-Za-z_]+)\}/g)) if (!tokens.has(m[1][0].toLowerCase() + m[1].slice(1))) err(f, `${ctx}: unbekannter Platzhalter {${m[1]}}`);
  };
  if (!pack.scenes[pack.default]) err(f, `Standard-Szene "${pack.default}" fehlt`);
  for (const [, fo] of allFoci) if (!pack.orders[fo.id]) warn(f, `Orden ${fo.id} hat keine Szene, nimmt "${pack.default}"`);
  for (const [o, sc] of Object.entries(pack.orders)) if (!pack.scenes[sc]) err(f, `Orden ${o}: Szene "${sc}" fehlt`);
  for (const [id, sc] of Object.entries(pack.scenes)) {
    for (const k of ["setting", "foes", "schar", "epithets"]) if (!sc[k]?.length) err(f, `Szene ${id}: ${k} leer`);
    for (const fo of sc.foes ?? []) if (!fo.nom || !fo.dat || !fo.akk || !["er", "sie"].includes(fo.pro) || !pack.weak[fo.weak]) err(f, `Szene ${id}: Widersacher ${fo.nom} unvollständig`);
    [...sc.setting, ...sc.epithets].forEach((t, i) => check(`${id}/${i}`, t));
  }
  for (const [k, list] of Object.entries(pack.tables)) { if (!list.length) err(f, `Tabelle ${k} leer`); list.forEach((t, i) => check(`${k}/${i}`, t)); }
}

for (const w of warns) console.log("Hinweis:", w);
if (errors.length) {
  for (const e of errors) console.error("Fehler:", e);
  console.error(`\n${errors.length} Fehler in den Daten.`);
  process.exit(1);
}
console.log(`Daten ok: ${allFoci.length} Orden, ${Object.keys(exercises).length} Übungen, ${beasts.length} Bestien.`);

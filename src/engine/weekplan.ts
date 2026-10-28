/* Wochenform: vier Tage sind die Basis.
   Drei Tage: Der vierte Tag wird eingearbeitet, nicht gestrichen. Doppelte Bewegungsmuster fallen weg,
   der Rest wandert auf die übrigen Tage; damit es in die Zeit passt, werden Übungen zu Supersets gepaart
   und Pausen um 15 s gekürzt. Schwere Grundübungen bleiben unangetastet.
   Fünf Tage: Der Zusatztag (Rolle außerhalb von week_4, meist „bonus“) kommt zwischen die schweren Tage.
   Harlequin: Orden mit "medley" nehmen jede Woche einen anderen Orden. */
import { SWAP_GROUPS } from "../data";
import type { AppState, Block, Focus, PlanBlock, Role, Slot, Weekday } from "../types";
import { isHeavy, isStrength, planMinutes } from "./slots";
import { applyDrillEdits, blockFocus, canServe, dayRoleMap, defaultRoles, setWeekFocus, trainingDays } from "./plan";
import { canShorten, pairToFit, shortDay } from "./shortday";
import { dayMods, remembered } from "./dayadj";
import { applySlot } from "./sharpen";
import { deloadShape, isDeloaded } from "./deload";
import { runEaseShape } from "./runadj";

const est = planMinutes;

const groupOf = (name: string) => Object.entries(SWAP_GROUPS).find(([, m]) => m.includes(name))?.[0] ?? name;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy] : []);
const TIER_RANK = { gym: 2, home: 1, reise: 0 } as const;

/** Drei-Tage-Woche: Rollen aus week_3, angereichert mit dem Wichtigsten aus dem gestrichenen Tag */
function compress(f: Focus): Focus {
  const kept = f.week_3.slice(0, 3);
  const dropped = f.week_4.filter((k) => !kept.includes(k));
  if (!dropped.length) return f;
  const roles: Record<string, Role> = JSON.parse(JSON.stringify(f.roles));
  const covered: Record<string, number> = {};
  for (const k of kept) for (const b of roles[k].blocks) for (const s of slotsOf(b)) covered[groupOf(s.name)] = (covered[groupOf(s.name)] ?? 0) + 1;
  const touched = new Set<string>();
  const added: { role: string; id: string }[] = [];
  const names = new Set(kept.flatMap((k) => roles[k].blocks.flatMap(slotsOf).map((s) => s.name)));
  const hasBeast = () => kept.some((k) => roles[k].blocks.some((b) => b.type === "beast"));
  const lightest = (loc?: Role["location"]) => [...kept]
    .filter((k) => !loc || TIER_RANK[roles[k].location] >= TIER_RANK[loc])
    .sort((a, b) => est(roles[a]) - est(roles[b]))[0] ?? kept[0];

  for (const d of dropped) {
    const src = f.roles[d];
    for (const b of src.blocks) {
      if (b.type === "beast") {
        if (!hasBeast()) {
          const k = lightest();
          const r = roles[k];
          const beast = { ...b };
          r.blocks.push(beast);
          // Lange Bestie passt nicht: eine Klasse kürzer, bis es in die Zeit passt
          const order = ["plage", "bestie", "ungeheuer", "uralte", "verfluchte"] as const;
          let guard = 4;
          while (est(r) > Math.max(r.minutes, 60) + 2 && guard-- && beast.classes?.length) {
            const lo = Math.min(...beast.classes.map((c) => order.indexOf(c)));
            if (lo <= 0) break;
            beast.classes = [order[lo - 1]];
            beast.pool = undefined;
          }
          touched.add(k);
        }
        continue;
      }
      if (b.type === "module" || b.type === "menu") continue;
      for (const s of slotsOf(b)) {
        if (!isStrength(s) && s.kind !== "hold") continue;
        const g = groupOf(s.name);
        if ((covered[g] ?? 0) >= 2 || names.has(s.name)) continue; // Redundanz: Muster schon zweimal oder Übung schon in der Woche
        covered[g] = (covered[g] ?? 0) + 1;
        names.add(s.name);
        const k = lightest(src.location);
        roles[k].blocks.push({ type: "single", slot: { ...s, rest: Math.max(45, (s.rest ?? 90) - 15) } });
        added.push({ role: k, id: s.id });
        touched.add(k);
      }
    }
  }

  for (const k of touched) {
    const r = roles[k];
    const budget = Math.max(r.minutes, 60) + 2;
    // Pausen: −15 s bei allem, was nicht schwer ist
    r.blocks = r.blocks.map((b, i) => (b.type === "single" && i > 0 && isStrength(b.slot) && !isHeavy(b.slot) ? { ...b, slot: { ...b.slot, rest: Math.max(45, (b.slot.rest ?? 90) - 15) } } : b));
    // Supersets bilden, bis es in die Zeit passt
    let guard = 20;
    while (est(r) > budget && guard--) {
      const i = r.blocks.findIndex((b, j) => j > 0 && b.type === "single" && isStrength(b.slot) && !isHeavy(b.slot)
        && r.blocks[j + 1]?.type === "single" && isStrength((r.blocks[j + 1] as Extract<Block, { type: "single" }>).slot) && !isHeavy((r.blocks[j + 1] as Extract<Block, { type: "single" }>).slot));
      if (i >= 0) {
        const a = r.blocks[i] as Extract<Block, { type: "single" }>, b = r.blocks[i + 1] as Extract<Block, { type: "single" }>;
        const { rest: _ra, ...sa } = a.slot; const { rest: _rb, ...sb } = b.slot;
        void _ra; void _rb;
        r.blocks.splice(i, 2, { type: "superset", rest: 75, slots: [sa, sb] });
        continue;
      }
      // Passt immer noch nicht: zuletzt Hinzugefügtes wieder heraus
      const has = (id: string) => r.blocks.some((b) => slotsOf(b).some((x) => x.id === id));
      const last = [...added].reverse().find((x) => x.role === k && has(x.id));
      if (!last) break;
      r.blocks = r.blocks.flatMap((b): Block[] => {
        if (b.type === "single") return b.slot.id === last.id ? [] : [b];
        if (b.type === "superset" && b.slots.some((x) => x.id === last.id)) {
          const rest = b.slots.filter((x) => x.id !== last.id);
          return rest.length > 1 ? [{ ...b, slots: rest }] : rest.length ? [{ type: "single", slot: { ...rest[0], rest: 60 } }] : [];
        }
        return [b];
      });
    }
    r.note = `${r.note ? r.note + " " : ""}Drei-Tage-Woche: Das Wichtigste aus dem vierten Tag ist eingearbeitet, dichter mit Supersets und 15 s kürzeren Pausen.`;
    r.minutes = Math.round(est(r) / 5) * 5;
  }
  return { ...f, roles, week_3: kept };
}

const cache = new WeakMap<Focus, Focus>();
/** Orden in der Form für n Trainingstage (Cache je Datenstand: eingefrorene Phasen haben eigene Objekte) */
export function shapeFocus(f: Focus, nDays: number): Focus {
  if (nDays !== 3) return f;
  if (!cache.has(f)) cache.set(f, compress(f));
  return cache.get(f)!;
}

/** Orden einer Woche: Harlequin nimmt jede Woche einen anderen, danach die Form für die Zahl der Trainingstage */
/** Leise: Die Bestie des leisen Tages wandert auf einen anderen Tag dieser Woche, wenn dort Zeit ist.
    Fixiert (gemerkt): jeder andere Tag; spontan: nur die Tage danach. Nie auf erledigte, kurze oder leise Tage;
    Tage ohne eigene Bestie zuerst. Passt sie nirgends, entfällt sie. */
function quietMoves(state: AppState, b: PlanBlock, week: number, f: Focus, days: { day: Weekday; role: string }[], shortened: Set<string>): Focus {
  const mods = days.map((d, i) => ({ ...d, i, m: dayMods(state, b, week, d.role, d.day) }));
  // Nur Bestien ohne passende Fassung (etwa ein Pool nur aus Sprungbestien) wandern
  const unfit = (m: { quiet: boolean; tight: boolean }) => (x: Block) => x.type === "beast" && !canServe(x, m);
  const quiet = mods.filter((d) => (d.m.quiet || d.m.tight) && f.roles[d.role]?.blocks.some(unfit(d.m)));
  if (!quiet.length) return f;
  const done = new Set(state.sessions.filter((s) => s.blockId === b.id && s.week === week && s.done).map((s) => s.role));
  const roles = { ...f.roles };
  const limit = (k: string) => Math.max(roles[k].cap ?? Math.max(roles[k].minutes, f.session_min), planMinutes(f.roles[k]));
  for (const q of quiet) {
    if (done.has(q.role)) continue;
    const fixed = (["quiet", "tight"] as const).some((k) => q.m[k] && remembered(state, b, q.role, q.day)[k] && state.dayAdj?.[`${b.id}:${week}:${q.role}`]?.[k] === undefined);
    const loud = unfit(q.m);
    const beasts = roles[q.role].blocks.filter((x): x is Extract<Block, { type: "beast" }> => loud(x));
    roles[q.role] = { ...roles[q.role], blocks: roles[q.role].blocks.filter((x) => !loud(x)) };
    for (const beast of beasts) {
      const cands = mods.filter((d) => d.role !== q.role && (fixed || d.i > q.i) && !d.m.quiet && !d.m.tight && !shortened.has(d.role) && !done.has(d.role) && roles[d.role])
        .sort((x, y) => Number(roles[x.role].blocks.some((z) => z.type === "beast")) - Number(roles[y.role].blocks.some((z) => z.type === "beast"))
          || (limit(y.role) - planMinutes(roles[y.role])) - (limit(x.role) - planMinutes(roles[x.role])));
      // Erst in voller Länge, sonst Klasse für Klasse kürzer (bis zur Plage)
      const order = ["plage", "bestie", "ungeheuer", "uralte", "verfluchte"] as const;
      const lo = Math.min(...(beast.classes ?? ["bestie"]).map((x) => order.indexOf(x)));
      const tries = [beast, ...(beast.pool?.length ? [{ ...beast, pool: undefined }] : []), ...order.slice(0, Math.max(0, lo)).reverse().map((x) => ({ ...beast, classes: [x], pool: undefined }))];
      // Je Zieltag: erst ohne Eingriff, dann mit Supersets und höchstens QUIET_EXTRA Minuten mehr
      outer: for (const c of cands) for (const dense of [false, true]) for (const t of tries) {
        const moved: Block = { ...t, note: [beast.note, `Vom ${q.m.quiet ? "leisen" : "engen"} ${DAY_LONG[q.day]} hierher.`].filter(Boolean).join(" ") };
        const next: Role = JSON.parse(JSON.stringify({ ...roles[c.role], blocks: [...roles[c.role].blocks, moved] }));
        if (!dense) { if (planMinutes(next) <= limit(c.role) + 0.5) { roles[c.role] = next; break outer; } continue; }
        const why = `Als Superset gepaart, damit die Bestie vom ${q.m.quiet ? "leisen" : "engen"} ${DAY_LONG[q.day]} Platz hat.`;
        if (pairToFit(next, limit(c.role) + QUIET_EXTRA, (a, b) => { a.why = [...(a.why ?? []), why]; b.why = [...(b.why ?? []), why]; })) { roles[c.role] = next; break outer; }
      }
    }
  }
  return { ...f, roles };
}
/** So viel länger darf ein Tag werden, der die Bestie eines leisen Tages aufnimmt (nach dem Verdichten) */
const QUIET_EXTRA = 5;
const DAY_LONG: Record<Weekday, string> = { Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch", Do: "Donnerstag", Fr: "Freitag", Sa: "Samstag", So: "Sonntag" };

export function focusFor(state: AppState, b: PlanBlock, week: number): Focus | null {
  const base = blockFocus(b);
  if (!base) return null;
  const f = base.medley?.length ? blockFocus(b, base.medley[(week - 1) % base.medley.length]) ?? base : base;
  const n = trainingDays(state, b).length;
  let shaped = shapeFocus(f, n);
  // Kurz: gekürzte Rolle; die übrigen Tage gleichen aus, wenn das Ziel des Ordens leidet.
  // Gemerkter Kurztag: die ganze Woche gleicht aus. Spontan: nur die Tage danach.
  if (!base.medley?.length) {
    const weekRoles = defaultRoles(shaped, n);
    const days = dayRoleMap(state, b, shaped, week);
    const shorts = days.map((d, i) => ({ ...d, i, mods: dayMods(state, b, week, d.role, d.day) }))
      .filter((d) => d.mods.short && shaped.roles[d.role] && canShorten(shaped.roles[d.role]))
      .map((d) => ({ ...d, planned: remembered(state, b, d.role, d.day).short && state.dayAdj?.[`${b.id}:${week}:${d.role}`]?.short === undefined }))
      .sort((x, y) => Number(y.planned) - Number(x.planned) || x.i - y.i);
    const shortened = new Set<string>();
    for (const d of shorts) {
      const targets = (d.planned ? weekRoles : days.slice(d.i + 1).map((x) => x.role)).filter((r) => !shortened.has(r) && r !== d.role);
      shaped = shortDay(shaped, d.role, state.user, weekRoles, targets).focus;
      shortened.add(d.role);
    }
    shaped = quietMoves(state, b, week, shaped, days, shortened);
  }
  // Entlastungswoche: halbe Sätze, keine Bestien (auch beim Harlequin). Gewichte, Übungen und Tage bleiben.
  // Sonst: hart gewertetes Cardio (⚙ „Cardio erfassen“) entlastet den betroffenen Beintag — nie beides gleichzeitig.
  if (isDeloaded(state, b, week)) shaped = deloadShape(shaped);
  else shaped = runEaseShape(state, b, week, shaped);
  return applyDrillEdits(applySlot(shaped, state, b), state.drillEdits);
}

setWeekFocus(focusFor);

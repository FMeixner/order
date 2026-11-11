/* Wochenform: vier Tage sind die Basis.
   Drei Tage: Der vierte Tag wird eingearbeitet, nicht gestrichen. Doppelte Bewegungsmuster fallen weg,
   der Rest wandert auf die übrigen Tage; damit es in die Zeit passt, werden Übungen zu Supersets gepaart
   und Pausen um 15 s gekürzt. Schwere Grundübungen bleiben unangetastet.
   Fünf Tage: Der Zusatztag (Rolle außerhalb von week_4, meist „bonus“) kommt zwischen die schweren Tage.
   Harlequin: Orden mit "medley" nehmen jede Woche einen anderen Orden. */
import { KLAMMERN, SWAP_GROUPS } from "../data";
import type { AppState, BeastClass, Block, Focus, PlanBlock, Role, Section, Slot, Weekday } from "../types";
import { WEEKDAYS } from "../types";
import { skipDay } from "./skipweek";
import { doseMode, wavePos } from "./dose";
import { isHeavy, isStrength, planMinutes } from "./slots";
import { applyDrillEdits, blockFocus, blockWeeks, CLASS_ORDER, followedByTest, isTestBlock, isTestWeek, parseIso, canServe, dayRoleMap, defaultRoles, setWeekFocus, trainingDays } from "./plan";
import { pairToFit, shortDay, shortDeload } from "./shortday";
import { dayMods, remembered } from "./dayadj";
import { applySlots } from "./sharpen";
import { deloadShape, isDeloaded } from "./deload";

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
      if (b.type === "module") continue;
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

/** Hohe Alltagslast: Ersatzrollen des Ordens (Pilgrim: Intervalle kürzer, jede zweite Woche Grundlage) */
export function highLoadShape(f: Focus, b: PlanBlock, week: number): Focus {
  if (b.load !== "high" || !f.high_load) return f;
  const swap = week % 2 === 1 ? f.high_load.odd : f.high_load.even;
  if (!swap) return f;
  const roles = { ...f.roles };
  for (const [k, r] of Object.entries(swap)) if (roles[k]) roles[k] = r;
  return { ...f, roles };
}

/** Alltagslast formt die Sätze: Bei hoher Last bleiben Satzende-Techniken (Myo-Reps, Drop-Sets) nur an Ergänzungsübungen —
    Nähe zum Muskelversagen kostet Erholung, an kleinen Übungen am wenigsten. Cluster-Sätze mit when "high" gelten nur
    bei hoher Last (weniger Ermüdung bei schweren Grundübungen), sonst laufen die Sätze am Stück. */
export function highLoadFinish(f: Focus, b: PlanBlock): Focus {
  const high = b.load === "high";
  let hit = false;
  const fix = (sl: Slot): Slot => {
    let x = sl;
    if (high && x.core && x.finish) { x = { ...x, finish: undefined }; hit = true; }
    if (!high && x.cluster?.when === "high") { x = { ...x, cluster: undefined }; hit = true; }
    return x;
  };
  const roles: Focus["roles"] = {};
  for (const [k, r] of Object.entries(f.roles)) {
    roles[k] = { ...r, blocks: r.blocks.map((x) => (x.type === "single" ? { ...x, slot: fix(x.slot) } : x)) };
  }
  return hit ? { ...f, roles } : f;
}

/** Fällt aus: Kernübungen und Erhaltung wandern auf die offenen Tage danach (Woche verdichten, skipweek.ts) */
function applySkips(state: AppState, b: PlanBlock, week: number, f: Focus, n: number): Focus {
  const days = dayRoleMap(state, b, f, week);
  const done = new Set(state.sessions.filter((x) => x.blockId === b.id && x.week === week && x.done).map((x) => x.role));
  const skips = days.map((d, i) => ({ ...d, i, mods: dayMods(state, b, week, d.role, d.day) })).filter((d) => d.mods.skip && f.roles[d.role] && !done.has(d.role));
  if (!skips.length) return f;
  const weekRoles = defaultRoles(f, n);
  const dayOf = Object.fromEntries(days.map((d) => [d.role, WEEKDAYS.indexOf(d.day)]));
  const skipped = new Set(skips.map((d) => d.role));
  for (const d of skips) {
    const targets = days.slice(d.i + 1).filter((x) => !skipped.has(x.role) && !done.has(x.role) && f.roles[x.role]).map((x) => ({ role: x.role, day: WEEKDAYS.indexOf(x.day) }));
    f = skipDay(f, state.user, { role: d.role, weekRoles, targets, dayOf, grow: d.mods.grow });
  }
  return f;
}

import { weekLoad } from "./weekload";
export { weekLoad };
/** Dauerlast (1.19): Mittlere Last am Stück wird zur hohen — aber erst für den Orden, der nach mindestens
    DAUER_START Wochen mittlerer Last beginnt. Der erste Orden eines mittleren Abschnitts läuft normal, der nächste
    wechselt auf geführt (5 + 5 Wochen: der zweite). Ein ruhiger Abschnitt dazwischen setzt zurück. */
export const DAUER_START = 5;
export function dauerlast(sections: Section[] | undefined, b: PlanBlock): boolean {
  if (!sections?.length || b.load === "high") return false;
  const secs = [...sections].sort((a, c) => a.start.localeCompare(c.start));
  let i = secs.findIndex((x) => x.start <= b.start && x.end >= b.start);
  if (i < 0 || secs[i].load !== "medium") return false;
  while (i > 0 && secs[i - 1].load === "medium") i--;
  return (parseIso(b.start).getTime() - parseIso(secs[i].start).getTime()) / (7 * 864e5) >= DAUER_START;
}

/** Wie stark ein Tag auf geführte Übungen wechselt: 0 gar nicht, 1 etwa die Hälfte (hohe Last oder Dauerlast),
    2 eine Übung mehr — ab der Mitte eines Ordens, der mindestens acht Wochen in hoher Last läuft.
    Nie alles: Der erste freie Lift des Tages bleibt frei (guidedKeys). */
export function guidedLevel(sections: Section[] | undefined, b: PlanBlock, week: number): 0 | 1 | 2 {
  if (weekLoad(sections, b, week) === "high") {
    const total = blockWeeks(b);
    let hi = 0;
    for (let w = 1; w <= total; w++) if (weekLoad(sections, b, w) === "high") hi++;
    return hi >= 8 && week > total / 2 ? 2 : 1;
  }
  return dauerlast(sections, b) ? 1 : 0;
}

/** Die Phase, wie sie in dieser Woche belastet ist (für alles, was auf hohe Last reagiert) */
export const blockInWeek = (state: Pick<AppState, "sections">, b: PlanBlock, week: number): PlanBlock => {
  const load = weekLoad(state.sections, b, week);
  return load === b.load ? b : { ...b, load };
};

/** Feste Konditionsslots wachsen mit der Welle (1.22): Intervalle bekommen bis zu zwei Runden mehr, Schritt für Schritt
    über die Welle, nach der Entlastung wieder die kuratierte Zahl. Nur wenn die Kondition steigt (progress oder soft),
    nicht in Entlastungs- oder Hochlastwochen, und nie über das Zeitlimit des Tages. Zeitblöcke (Grundlage) steigen
    schon über ihre eigene Progression (Minuten). */
function growIntervals(state: AppState, b: PlanBlock, week: number, f: Focus): Focus {
  if (doseMode(f, b).cardio === "maintain" || isDeloaded(state, b, week) || weekLoad(state.sections, b, week) === "high") return f;
  const w = wavePos(state.plan, b, week);
  if (w.deload || w.len < 2) return f;
  const extra = Math.round((2 * w.pos) / (w.len - 1));
  if (!extra) return f;
  let changed = false;
  const roles: Record<string, Role> = {};
  for (const [k, r] of Object.entries(f.roles)) {
    if (!r.blocks.some((x) => x.type === "single" && x.slot.kind === "interval" && x.slot.interval)) { roles[k] = r; continue; }
    const limit = Math.max(r.cap ?? Math.max(r.minutes, f.session_min), planMinutes(r));
    let best = r;
    for (let e = extra; e >= 1; e--) {
      const cand: Role = { ...r, blocks: r.blocks.map((x) => (x.type === "single" && x.slot.kind === "interval" && x.slot.interval
        ? { ...x, slot: { ...x.slot, interval: { ...x.slot.interval, rounds: x.slot.interval.rounds + e }, name: x.slot.name.replace(/^(Intervalle )(\d+)( ×)/, (_m, a: string, n: string, c: string) => `${a}${Number(n) + e}${c}`), why: [...(x.slot.why ?? []), `Die Kondition steigt mit der Welle: +${e} ${e === 1 ? "Runde" : "Runden"} diese Woche.`] } }
        : x)) };
      if (planMinutes(cand) <= limit + 0.5) { best = cand; changed = true; break; }
    }
    roles[k] = best;
  }
  return changed ? { ...f, roles } : f;
}

/* ---------- Zuspitzung vor der Testwoche (1.31) ---------- */
/** Sprünge, Würfe und Sprints: bleiben in der Zuspitzung vollständig (wenige, frische Versuche) */
export const POWER = /jump|sprung|sprint|shuttle|throw|wurf|slam|hop|bound|clap|plyo|skater|medball|medizinball|brustpass|chest pass|broad|depth/i;
/** Woche direkt vor einer Testwoche (eigene Testwoche dahinter oder Testwoche im Orden) */
export function isTaperWeek(state: Pick<AppState, "plan">, b: PlanBlock, week: number): boolean {
  const f = blockFocus(b);
  if (!f || isTestBlock(b)) return false;
  return followedByTest(state.plan, b) ? week === blockWeeks(b) : isTestWeek(f, b, week + 1);
}
/** Sätze auf etwa 60 % (aufgerundet, mindestens zwei, nie mehr als vorher); Gewichte und Wiederholungen bleiben */
const taperSets = (n: number | undefined) => (n == null ? n : Math.min(n, Math.max(2, Math.ceil(n * 0.6))));
const taperChoice = (c: Slot["home"]): Slot["home"] => (typeof c === "object" && c ? { ...c, sets: taperSets(c.sets) } : c);
const taperSlot = (s: Slot): Slot => (POWER.test(s.name) || s.kind === "timer" || s.kind === "interval"
  ? s
  : { ...s, sets: taperSets(s.sets), home: taperChoice(s.home), reise: taperChoice(s.reise), finish: undefined });
const shorter = (cs: BeastClass[]) => cs.map((c) => CLASS_ORDER[Math.max(0, CLASS_ORDER.indexOf(c) - 1)]);
/** Zuspitzung (Bosquet et al., 2007): Volumen runter, Intensität halten. Satzende-Techniken aus, Bestien eine Klasse
    kürzer, Sprünge und Sprints unverändert. */
export function taperShape(f: Focus): Focus {
  const roles: Record<string, Role> = {};
  for (const [k, r] of Object.entries(f.roles)) roles[k] = { ...r, blocks: r.blocks.map((b): Block => {
    switch (b.type) {
      case "single": return { ...b, slot: taperSlot(b.slot) };
      case "superset": return { ...b, slots: b.slots.map(taperSlot), ...(b.finisher ? { finisher: { ...b.finisher, classes: shorter(b.finisher.classes ?? ["plage", "bestie"]) } } : {}) };
      case "contrast": return { ...b, heavy: taperSlot(b.heavy) };
      case "beast": return { ...b, classes: shorter(b.classes?.length ? b.classes : ["bestie", "ungeheuer"]) };
      default: return b;
    }
  }) };
  return { ...f, roles };
}

const medMemo = new WeakMap<AppState, Map<string, string[]>>();
/** Harlequin (Orden mit „medley“): Zu Beginn jeder Phase wählt die App so viele Orden, wie die Phase Wochen hat –
    zuerst die, die in früheren Harlequin-Phasen am längsten nicht (oder nie) dran waren, bei Gleichstand die, die zum
    Zeichen der Phase passen (früh/spät in klammern.json), dann die Reihenfolge der Liste. Gespielt wird in der Reihenfolge
    der Liste, damit die gewollte Abwechslung bleibt. So wiederholt sich nichts, auch wenn die Phasen kurz sind. */
export function medleySequence(state: AppState, b: PlanBlock): string[] {
  const base = blockFocus(b);
  const list = base?.medley ?? [];
  if (!list.length) return [];
  let m = medMemo.get(state);
  if (!m) medMemo.set(state, (m = new Map()));
  const key = `${b.id}|${b.start}|${b.end}|${b.klammer ?? ""}`;
  const hit = m.get(key);
  if (hit) return hit;
  // Frühere Phasen desselben Ordens: wann welcher Orden zuletzt dran war (laufender Wochenzähler)
  const prior = state.plan.filter((x) => x.focusId === b.focusId && x.id !== b.id && x.start < b.start).sort((x, y) => x.start.localeCompare(y.start));
  const last = new Map<string, number>();
  let t = 0;
  for (const p of prior) {
    const seq = medleySequence(state, p);
    const n = blockWeeks(p);
    for (let w = 0; w < n; w++) last.set(seq[w % seq.length], t++);
  }
  const k = KLAMMERN.find((x) => x.id === b.klammer);
  const fit = (id: string) => (k && [...(k.early ?? []), ...(k.late ?? [])].includes(id) ? 1 : 0);
  const n = Math.max(1, Math.min(list.length, blockWeeks(b)));
  const chosen = [...list].sort((x, y) => (last.get(x) ?? -1) - (last.get(y) ?? -1) || fit(y) - fit(x) || list.indexOf(x) - list.indexOf(y)).slice(0, n);
  const out = list.filter((id) => chosen.includes(id));
  m.set(key, out);
  return out;
}

export function focusFor(state: AppState, b: PlanBlock, week: number): Focus | null {
  const base = blockFocus(b);
  if (!base) return null;
  const bw = blockInWeek(state, b, week);
  const med = base.medley?.length ? medleySequence(state, b) : null;
  const f = highLoadFinish(highLoadShape(med?.length ? blockFocus(b, med[(week - 1) % med.length]) ?? base : base, bw, week), bw);
  const n = trainingDays(state, b).length;
  let shaped = shapeFocus(f, n);
  // Kurz: gekürzte Rolle (die vier Kernübungen, Bestie eine Klasse kürzer, Schwertübungen einen Satz weniger, Ziel 35 Minuten); an jedem Tag möglich.
  // Die übrigen Tage gleichen aus, wenn das Ziel des Ordens leidet.
  // Gemerkter Kurztag: die ganze Woche gleicht aus. Spontan: nur die Tage danach.
  if (!base.medley?.length) {
    const weekRoles = defaultRoles(shaped, n);
    const days = dayRoleMap(state, b, shaped, week);
    const shorts = days.map((d, i) => ({ ...d, i, mods: dayMods(state, b, week, d.role, d.day) }))
      .filter((d) => d.mods.short && shaped.roles[d.role])
      .map((d) => ({ ...d, planned: remembered(state, b, d.role, d.day).short && state.dayAdj?.[`${b.id}:${week}:${d.role}`]?.short === undefined }))
      .sort((x, y) => Number(y.planned) - Number(x.planned) || x.i - y.i);
    const shortened = new Set<string>();
    // Entlastungswoche: erst halbieren, dann kürzt Kurz nur noch (keine Verdichtung, kein Ausgleich an anderen Tagen)
    const deload = isDeloaded(state, b, week);
    if (deload) shaped = deloadShape(shaped);
    for (const d of shorts) {
      const targets = (d.planned ? weekRoles : days.slice(d.i + 1).map((x) => x.role)).filter((r) => !shortened.has(r) && r !== d.role);
      shaped = deload ? shortDeload(shaped, d.role) : shortDay(shaped, d.role, state.user, weekRoles, targets).focus;
      shortened.add(d.role);
    }
    shaped = quietMoves(state, b, week, shaped, days, shortened);
  } else if (isDeloaded(state, b, week)) shaped = deloadShape(shaped);
  if (isTaperWeek(state, b, week) && !isDeloaded(state, b, week)) shaped = taperShape(shaped);
  shaped = growIntervals(state, b, week, shaped);
  shaped = applySkips(state, b, week, shaped, n);
  // Entlastungswoche: halbe Sätze, keine Bestien (auch beim Harlequin). Gewichte, Übungen und Tage bleiben.
  return applyDrillEdits(applySlots(shaped, state, b), state.drillEdits);
}

setWeekFocus(focusFor);

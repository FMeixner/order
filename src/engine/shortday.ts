/* Kurztag: Ein Tag der Woche fällt kürzer aus, nur drei Kernübungen.
   Danach wird geprüft, ob das Ziel des Ordens leidet (Sätze je Muskel und Woche):
   - Aufbau-Muskeln (im Orden schon im Zielbereich) bleiben mindestens an der unteren Grenze des Volumenbereichs,
   - alle anderen mindestens bei der Erhaltung (4 Sätze, etwa ein Drittel).
   Leidet nichts, bleiben die anderen Tage, wie sie sind. Sonst, vom kleinsten Eingriff zum größten:
   1. +1 Satz auf eine Übung, die den Muskel an einem anderen Tag trainiert (höchstens 5 Sätze, +2 je Tag),
   2. weggefallene Kernübungen (oder die einzige Übung für einen Muskel) wandern auf einen anderen Tag derselben Körperhälfte,
   3. passt es nicht in die Zeit: Supersets aus Übungen, die sich nicht in die Quere kommen.
   Kein Tag überschreitet dabei sein Zeitlimit. Was nicht reicht, wird offen gemeldet. */
import { EQUIPMENT_PRESETS } from "../store";
import type { Block, Focus, Role, Slot, UserProfile } from "../types";
import { estimateRole } from "./duration";
import { parseReps } from "./resolve";
import { musclesOf, volumeRange } from "./volume";
import { halfOf } from "./warmup";

export const SHORT_KEEP = 3;
/** Taugt als Kurztag: mehr als drei Kraftübungen */
export const shortEligible = (r: Role) => r.blocks.flatMap((b) => slotsOf(b)).filter((s) => (s.kind ?? "strength") === "strength").length > SHORT_KEEP;
const MUSCLES = ["Brust", "Rücken", "Schultern", "Quadrizeps", "Gesäß", "Beinbeuger", "Bizeps", "Trizeps"];
const MAINTAIN = 4;
const MAX_SETS = 5;
const MAX_ADDS = 2;

let presets: Record<Role["location"], ReturnType<(typeof EQUIPMENT_PRESETS)[0]["make"]>> | null = null;
const P = () => (presets ??= { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() });
const est = (r: Role) => estimateRole(r, P()[r.location]).total;

type Share = Record<string, number>;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : b.type === "menu" ? Object.values(b.options).slice(0, 1) : []);
const isStrength = (s: Slot) => (s.kind ?? "strength") === "strength";
const isHeavy = (s: Slot) => (s.rest ?? 90) >= 150 || s.prog === "topset" || (parseReps(s.reps ?? "").hi ?? 99) <= 6;
const strengthBlock = (b: Block) => (b.type === "single" && (isStrength(b.slot) || b.slot.kind === "hold")) || b.type === "superset" || b.type === "contrast" || b.type === "menu";
const primary = (s: Slot) => Object.entries(musclesOf(s.name)).sort((a, c) => c[1] - a[1])[0]?.[0];

/** Rang einer Übung für den Kurztag: im Orden als Kern markiert, dann schwer, dann Mehrgelenk, dann der Rest */
function rank(b: Block): number {
  const ss = slotsOf(b);
  if (ss.some((s) => s.core)) return 100;
  if (b.type === "contrast") return 60;
  if (b.type === "single") {
    const s = b.slot;
    if (!isStrength(s)) return 5;
    return (halfOf(s.name) ? 40 : 10) + (isHeavy(s) ? 10 : 0);
  }
  if (b.type === "superset") return Math.max(...b.slots.map((x) => rank({ type: "single", slot: x }))) - 5;
  return 5;
}

/** Sätze je Muskel und Woche (A/B gemittelt) */
function weekVolume(roles: Role[]): Share {
  const v: Share = {};
  for (const ab of ["A", "B"]) for (const r of roles) for (const b of r.blocks) {
    if (b.rotation && b.rotation !== ab) continue;
    for (const s of slotsOf(b)) {
      if (!isStrength(s) || (s.rotation && s.rotation !== ab)) continue;
      for (const [m, x] of Object.entries(musclesOf(s.name))) v[m] = (v[m] ?? 0) + (x * (s.sets ?? 3)) / 2;
    }
  }
  return v;
}

export interface ShortDayReport {
  role: string;
  kept: string[];
  dropped: string[];
  changes: string[];
  unresolved: string[];
  volume: Record<string, [number, number]>;
}

const memo = new Map<string, { focus: Focus; report: ShortDayReport }>();

/** Orden mit Kurztag: gekürzte Rolle und, wenn nötig, ausgeglichene übrige Tage */
export function shortDay(f: Focus, roleKey: string, user: UserProfile, weekRoles: string[]): { focus: Focus; report: ShortDayReport } {
  const lo = volumeRange(user)[0];
  const key = `${f.id}:${roleKey}:${lo}:${weekRoles.join(",")}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const roles: Record<string, Role> = JSON.parse(JSON.stringify(f.roles));
  const short = roles[roleKey];
  const others = weekRoles.filter((k) => k !== roleKey && roles[k]);
  const before = weekVolume(weekRoles.map((k) => f.roles[k]).filter(Boolean));

  // 1. Kurztag: die drei Kernübungen, sonst nichts (keine Bestie, kein Modul), kurzes Warm-up
  const ranked = short.blocks.map((b, i) => ({ b, i, r: strengthBlock(b) ? rank(b) : -1 })).filter((x) => x.r >= 0);
  // A- und B-Woche getrennt: je drei Kernübungen
  const keep = new Set<Block>();
  for (const ab of ["A", "B"]) ranked.filter((x) => !x.b.rotation || x.b.rotation === ab).sort((a, c) => c.r - a.r || a.i - c.i).slice(0, SHORT_KEEP).forEach((x) => keep.add(x.b));
  const droppedBlocks = ranked.filter((x) => !keep.has(x.b)).map((x) => x.b);
  short.blocks = short.blocks.filter((b) => keep.has(b));
  short.warmup = ["short_base", ...(short.warmup ?? []).filter((l) => !/base|run|jump|sword/.test(l)).slice(0, 2)];
  short.cooldown = (short.cooldown ?? []).slice(0, 1);
  short.name = `${short.name} (Kurztag)`;
  short.note = `Kurztag: nur die drei Kernübungen.`;
  short.minutes = Math.max(15, Math.round(est(short) / 5) * 5);

  const changes: string[] = [];
  const unresolved: string[] = [];
  const limit = (k: string) => Math.max(f.roles[k].cap ?? Math.max(f.roles[k].minutes, f.session_min), est(f.roles[k]));
  const adds: Record<string, number> = {};
  const noteFor: Record<string, string[]> = {};
  const note = (k: string, t: string) => { (noteFor[k] ??= []).push(t); changes.push(`${roles[k].name.replace(/ \(Kurztag\)$/, "")}: ${t}`); };

  // Supersets aus Übungen, die sich nicht in die Quere kommen (nie die erste schwere Übung, nie zwei schwere)
  const densify = (k: string) => {
    const r = roles[k];
    let guard = 10;
    while (est(r) > limit(k) + 0.5 && guard--) {
      const first = r.blocks.findIndex(strengthBlock);
      // Große Grundübungen (Mehrgelenk mit langer Pause) und Kernübungen bleiben allein
      const big = (x: Slot) => isHeavy(x) || !!x.core || (!!halfOf(x.name) && (x.rest ?? 90) >= 120);
      const cands = r.blocks.map((b, i) => ({ b, i })).filter(({ b, i }) => i > first && b.type === "single" && isStrength(b.slot) && !big(b.slot)) as { b: Extract<Block, { type: "single" }>; i: number }[];
      let pair: [number, number] | null = null;
      for (let x = 0; x < cands.length && !pair; x++) for (let y = x + 1; y < cands.length && !pair; y++) {
        const a = cands[x].b.slot, c = cands[y].b.slot;
        if (primary(a) && primary(a) === primary(c)) continue;
        pair = [cands[x].i, cands[y].i];
      }
      if (!pair) return false;
      const a = (r.blocks[pair[0]] as Extract<Block, { type: "single" }>).slot, c = (r.blocks[pair[1]] as Extract<Block, { type: "single" }>).slot;
      const { rest: _a, ...sa } = a; const { rest: _c, ...sc } = c; void _a; void _c;
      r.blocks.splice(pair[1], 1);
      r.blocks.splice(pair[0], 1, { type: "superset", rest: 75, slots: [sa, sc] });
      note(k, `${a.name} + ${c.name} als Superset`);
    }
    return est(r) <= limit(k) + 0.5;
  };

  // Übung auf einen anderen Tag derselben Körperhälfte (vor Bestie und Finisher)
  const place = (s: Slot): boolean => {
    const half = halfOf(s.name) ?? (Object.keys(musclesOf(s.name)).some((m) => ["Quadrizeps", "Beinbeuger", "Gesäß", "Waden"].includes(m)) ? "unten" : "oben");
    const fit = (k: string) => roles[k].blocks.flatMap(slotsOf).filter((x) => (halfOf(x.name) ?? "") === half).length;
    const order = [...others].sort((a, c) => fit(c) - fit(a) || (limit(c) - est(roles[c])) - (limit(a) - est(roles[a])));
    for (const k of order) {
      const snapshot = JSON.stringify(roles[k]);
      const at = roles[k].blocks.findIndex((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher));
      const blk: Block = { type: "single", slot: { ...s } };
      if (at < 0) roles[k].blocks.push(blk); else roles[k].blocks.splice(at, 0, blk);
      const saved = noteFor[k]?.length ?? 0;
      if (est(roles[k]) <= limit(k) + 0.5 || densify(k)) { note(k, `${s.name} vom Kurztag hierher`); return true; }
      roles[k] = JSON.parse(snapshot);
      if (noteFor[k]) { const extra = noteFor[k].splice(saved); changes.splice(changes.length - extra.length, extra.length); }
    }
    return false;
  };

  // 2. Weggefallene Kernübungen müssen bleiben
  for (const b of droppedBlocks) for (const s of slotsOf(b)) if (s.core && isStrength(s) && !place(s)) unresolved.push(`${s.name} passt an keinem anderen Tag in die Zeit`);

  // 3. Volumen prüfen und ausgleichen
  const need = (m: string) => ((before[m] ?? 0) >= lo ? lo : Math.min(MAINTAIN, before[m] ?? 0));
  const cur = () => weekVolume(weekRoles.map((k) => roles[k]).filter(Boolean));
  const droppedSlots = droppedBlocks.flatMap(slotsOf).filter(isStrength);
  for (const m of MUSCLES) {
    let guard = 12;
    while ((cur()[m] ?? 0) < need(m) - 0.25 && guard--) {
      // a) +1 Satz auf eine passende Übung an einem anderen Tag
      // Schwere Grundübungen zuletzt: lieber ein Satz mehr an einer Ergänzungsübung
      const heavyOf = (k: string, id: string) => { const x = slotIn(k, id); return x && (isHeavy(x) || x.core) ? 1 : 0; };
      const slotIn = (k: string, id: string) => roles[k].blocks.flatMap((b) => (b.type === "single" || b.type === "superset" ? slotsOf(b) : [])).find((x) => x.id === id);
      const cands = others.flatMap((k) => roles[k].blocks.flatMap((b) => (b.type === "single" || b.type === "superset" ? slotsOf(b) : [])).map((s) => ({ k, id: s.id, name: s.name, sets: s.sets ?? 3, ok: isStrength(s) })))
        .filter((c) => c.ok && (musclesOf(c.name)[m] ?? 0) >= 0.5 && c.sets < MAX_SETS && (adds[c.k] ?? 0) < MAX_ADDS)
        .sort((a, c) => (musclesOf(c.name)[m] ?? 0) - (musclesOf(a.name)[m] ?? 0) || heavyOf(a.k, a.id) - heavyOf(c.k, c.id) || (limit(c.k) - est(roles[c.k])) - (limit(a.k) - est(roles[a.k])));
      let done = false;
      for (const { k, id } of cands) {
        if ((adds[k] ?? 0) >= MAX_ADDS) continue;
        const snapshot = JSON.stringify(roles[k]);
        const saved = noteFor[k]?.length ?? 0;
        const s = slotIn(k, id);
        if (!s) continue;
        s.sets = (s.sets ?? 3) + 1;
        if (est(roles[k]) <= limit(k) + 0.5 || densify(k)) { adds[k] = (adds[k] ?? 0) + 1; note(k, `+1 Satz ${s.name}`); done = true; break; }
        roles[k] = JSON.parse(snapshot);
        if (noteFor[k]) { const extra = noteFor[k].splice(saved); changes.splice(changes.length - extra.length, extra.length); }
      }
      if (done) continue;
      // b) die weggefallene Übung, die den Muskel am stärksten trifft, auf einen anderen Tag
      const mv = droppedSlots.filter((s) => (musclesOf(s.name)[m] ?? 0) >= 0.5 && !others.some((k) => roles[k].blocks.flatMap(slotsOf).some((x) => x.id === s.id)))
        .sort((a, c) => (musclesOf(c.name)[m] ?? 0) - (musclesOf(a.name)[m] ?? 0))[0];
      if (mv && place(mv)) continue;
      break;
    }
    const v = cur()[m] ?? 0;
    if (v < need(m) - 0.25) unresolved.push(`${m}: ${Math.round(v)} statt ${need(m)} Sätze pro Woche`);
  }

  const merge = (ns: string[]) => {
    const c = new Map<string, number>();
    for (const n of ns) c.set(n, (c.get(n) ?? 0) + 1);
    return [...c].map(([n, k]) => (k > 1 && n.startsWith("+1 Satz ") ? `+${k} Sätze ${n.slice(8)}` : n));
  };
  changes.length = 0;
  for (const [k, ns] of Object.entries(noteFor)) for (const n of merge(ns)) changes.push(`${roles[k].name}: ${n}`);
  for (const [k, ns] of Object.entries(noteFor)) if (ns.length) {
    roles[k].note = `${roles[k].note ? roles[k].note + " " : ""}Ausgleich für den Kurztag: ${merge(ns).join(", ")}.`;
    roles[k].minutes = Math.round(est(roles[k]) / 5) * 5;
  }
  const after = cur();
  const report: ShortDayReport = {
    role: roleKey,
    kept: short.blocks.flatMap(slotsOf).map((s) => s.name),
    dropped: droppedBlocks.flatMap(slotsOf).map((s) => s.name),
    changes, unresolved,
    volume: Object.fromEntries(MUSCLES.map((m) => [m, [Math.round(before[m] ?? 0), Math.round(after[m] ?? 0)]])),
  };
  const out = { focus: { ...f, roles }, report };
  memo.set(key, out);
  return out;
}

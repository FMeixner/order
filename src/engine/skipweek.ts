/* Woche verdichten (Ausfall-Fallback): Eine Einheit fällt aus („Fällt aus“ im Anpassen-Menü, keine automatische Erkennung).
   Ihr Wichtigstes wandert auf die übrigen offenen Tage der Woche danach, in dieser Reihenfolge:
   1. Kernübungen des Ordens (oder, wenn keine markiert sind, die zwei wichtigsten Kraftübungen des Tages),
   2. Muskeln, die ohne den Tag unter die Erhaltung fallen (4 harte Sätze pro Woche, etwa ein Drittel des üblichen
      Volumens; Bickel et al., 2011): erst +1 Satz auf eine passende Übung, dann die Übung selbst,
   3. der Rest entfällt. Bestien, Schwert- und andere Module fallen als Erstes weg.
   Regeln: Schwere Grundübungen kommen nie ins Superset (nur Gegenspieler oder getrennte Körperhälften, pairToFit).
   Kein Tag überschreitet sein Zeitlimit; erlaubt man es beim Auslösen, dürfen Tage bis zu 15 Minuten länger werden.
   Nie zwei Beintage direkt hintereinander: Unterkörper wandert nicht auf einen Oberkörpertag neben einem Beintag.
   Bleibt nur eine Einheit: Ganzkörper aus den Kernübungen beider Tage, je zwei Sätze. */
import type { Block, Focus, Role, Slot, UserProfile } from "../types";
import { isHeavy, isStrength, planMinutes as est } from "./slots";
import { musclesOf } from "./volume";
import { halfOf } from "./warmup";
import { MAINTAIN, MUSCLES, pairToFit, rank, slotsOf, weekVolume } from "./shortday";

const LOWER = ["Quadrizeps", "Beinbeuger", "Gesäß", "Waden"];
const MAX_SETS = 5;
const MAX_ADDS = 2;
const MODULE: Record<string, string> = { sword: "Schwert", stab: "Stab", longsword: "Langschwert", flow: "Flow", sharpen: "Schärfen", call: "Ansage" };
const lower = (s: Slot) => (halfOf(s.name) ?? (Object.keys(musclesOf(s.name)).some((m) => LOWER.includes(m)) ? "unten" : "oben")) === "unten";
/** Beintag: mindestens eine Kraftübung für den Unterkörper */
const legDay = (r: Role) => r.blocks.flatMap(slotsOf).some((s) => isStrength(s) && lower(s));

export interface SkipInput {
  /** Rolle, die ausfällt */
  role: string;
  /** Rollen der Woche (für das Wochenvolumen) */
  weekRoles: string[];
  /** offene Tage, die übernehmen dürfen, mit Wochentag-Index (0 = Montag) */
  targets: { role: string; day: number }[];
  /** Wochentag-Index aller Trainingstage dieser Woche (für die Beintag-Regel) */
  dayOf: Record<string, number>;
  /** bis zu 15 Minuten länger erlaubt */
  grow?: boolean;
}

export function skipDay(f: Focus, user: UserProfile, inp: SkipInput): Focus {
  void user;
  const roles: Record<string, Role> = JSON.parse(JSON.stringify(f.roles));
  const gone = roles[inp.role];
  if (!gone) return f;
  const others = inp.targets.map((t) => t.role).filter((k) => k !== inp.role && roles[k]);
  const before = weekVolume(inp.weekRoles.map((k) => f.roles[k]).filter(Boolean));
  const strength = gone.blocks.filter((b) => b.type === "single" || b.type === "superset" || b.type === "contrast");
  const flat = strength.flatMap(slotsOf).filter(isStrength);
  // Kern: markierte Kernübungen, sonst die zwei wichtigsten Kraftübungen (A- und B-Woche getrennt)
  let core = flat.filter((s) => s.core);
  if (!core.length) {
    const pick = new Set<Slot>();
    for (const ab of ["A", "B"]) strength.filter((b) => !b.rotation || b.rotation === ab).map((b, i) => ({ b, i, r: rank(b) })).sort((a, c) => c.r - a.r || a.i - c.i).slice(0, 2)
      .forEach((x) => slotsOf(x.b).filter(isStrength).forEach((s) => pick.add(s)));
    core = [...pick];
  }
  const moved: string[] = [];
  const unresolved: string[] = [];
  const placed = new Set<string>();
  const label = (k: string) => roles[k].name;

  // Bleibt nur eine Einheit: Ganzkörper aus den Kernübungen beider Tage, je zwei Sätze
  if (others.length === 1) {
    const k = others[0];
    const r = roles[k];
    const own = r.blocks.flatMap(slotsOf).filter((s) => isStrength(s) && s.core);
    const ownCore = own.length ? own : r.blocks.filter((b) => b.type === "single" || b.type === "superset" || b.type === "contrast").map((b, i) => ({ b, i, r: rank(b) })).sort((a, c) => c.r - a.r || a.i - c.i).slice(0, 2).flatMap((x) => slotsOf(x.b).filter(isStrength));
    const names = new Set(ownCore.map((s) => s.name));
    const why = "Woche verdichtet: Ganzkörper aus den Kernübungen, je zwei Sätze.";
    const two = (s: Slot): Slot => ({ ...s, sets: Math.min(2, s.sets ?? 3), why: [...(s.why ?? []), why] });
    const blocks: Block[] = [...ownCore.map((s) => ({ type: "single" as const, slot: two(s) })), ...core.filter((s) => !names.has(s.name)).map((s) => ({ type: "single" as const, slot: two(s) }))];
    const limit = limitOf(f.roles[k], f, inp.grow);
    r.blocks = blocks;
    r.name = `${r.name} (Ganzkörper)`;
    if (est(r) > limit + 0.5 && !pairToFit(r, limit)) unresolved.push(`${label(k)} liegt bei ${Math.round(est(r))} statt ${Math.round(limit)} Minuten`);
    r.minutes = Math.round(est(r) / 5) * 5;
    for (const s of core) if (!names.has(s.name)) moved.push(`${s.name} → ${label(k)}`);
    finish(gone, moved, flat.filter((s) => !core.includes(s)).map((s) => s.name), unresolved);
    return { ...f, roles };
  }

  const limit = (k: string) => limitOf(f.roles[k], f, inp.grow);
  const adds: Record<string, number> = {};
  const isLeg = (k: string) => legDay(roles[k]);
  /** Unterkörper auf einen Oberkörpertag direkt neben einem Beintag? Dann nicht. */
  const legClash = (k: string) => {
    if (isLeg(k)) return false;
    const d = inp.dayOf[k];
    return Object.entries(inp.dayOf).some(([o, x]) => o !== k && o !== inp.role && roles[o] && Math.abs(x - d) === 1 && isLeg(o));
  };
  const cur = () => weekVolume(inp.weekRoles.filter((k) => k !== inp.role).map((k) => roles[k]).filter(Boolean));
  const need = (m: string) => Math.min(MAINTAIN, before[m] ?? 0);
  const made: string[] = [];
  /** Verschobene und aufgestockte Übungen: geben beim Platzschaffen keinen Satz ab */
  const guarded = new Set<string>();
  /** Platz schaffen, bis der Tag in sein Limit passt: erst Supersets (nie schwere Grundübungen), dann fällt die Bestie
      des Tages, dann Ergänzungsübungen einen Satz weniger (mindestens zwei), zuletzt ein Modul (Schwert, Flow). */
  const room = (k: string, keep: string, notes: string[]): boolean => {
    const r = roles[k];
    let guard = 30;
    while (est(r) > limit(k) + 0.5 && guard--) {
      if (pairToFit(r, limit(k))) return true;
      const bi = r.blocks.findIndex((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher));
      if (bi >= 0) { r.blocks.splice(bi, 1); notes.push(`${label(k)}: Bestie entfällt`); continue; }
      const acc = r.blocks.filter((b) => (b.type === "single" || b.type === "superset") && !slotsOf(b).some((x) => guarded.has(x.id) || x.id === keep)).flatMap(slotsOf)
        .filter((x) => isStrength(x) && !x.core && !isHeavy(x) && x.id !== keep && !guarded.has(x.id) && (x.sets ?? 3) > 2)
        // Nur, wenn kein Hauptmuskel dadurch unter die Erhaltung fällt
        .filter((x) => !slotsOf(r.blocks.find((b) => slotsOf(b).includes(x))!).some((y) => Object.entries(musclesOf(y.name)).some(([m, v]) => v >= 0.5 && (cur()[m] ?? 0) - v < need(m) - 0.25)))
        .sort((a, c) => (halfOf(a.name) ? 1 : 0) - (halfOf(c.name) ? 1 : 0) || (c.sets ?? 3) - (a.sets ?? 3))[0];
      if (acc) {
        // Supersets: beide Teile behalten dieselbe Satzanzahl
        const blk = r.blocks.find((b) => slotsOf(b).includes(acc))!;
        for (const x of slotsOf(blk)) if ((x.sets ?? 3) > 2) x.sets = (x.sets ?? 3) - 1;
        notes.push(`${label(k)}: −1 Satz ${acc.name}`); continue;
      }
      const mi = r.blocks.findIndex((b) => b.type === "module");
      if (mi >= 0) { const m = r.blocks[mi]; r.blocks.splice(mi, 1); notes.push(`${label(k)}: ${m.type === "module" ? MODULE[m.module] ?? m.module : "Modul"} entfällt`); continue; }
      return false;
    }
    return est(r) <= limit(k) + 0.5;
  };
  const tryOn = (k: string, keep: string, edit: () => void, ok: string): boolean => {
    const snap = JSON.stringify(roles[k]);
    const notes: string[] = [];
    edit();
    if (room(k, keep, notes)) { moved.push(ok); made.push(...notes); guarded.add(keep); return true; }
    roles[k] = JSON.parse(snap);
    return false;
  };
  const place = (s: Slot): boolean => {
    const half = lower(s) ? "unten" : "oben";
    // Dieselbe Übung steht schon an einem Tag: dort +1 Satz statt doppelt
    for (const k of others) {
      const same = roles[k].blocks.flatMap((b) => (b.type === "single" || b.type === "superset" ? slotsOf(b) : [])).find((x) => x.name === s.name);
      if (same && (same.sets ?? 3) < MAX_SETS && (adds[k] ?? 0) < MAX_ADDS && tryOn(k, same.id, () => { same.sets = (same.sets ?? 3) + 1; same.why = [...(same.why ?? []), "+1 Satz als Ausgleich für den ausgefallenen Tag."]; }, `+1 Satz ${s.name} (${label(k)})`)) {
        adds[k] = (adds[k] ?? 0) + 1; placed.add(s.id); return true;
      }
    }
    const fit = (k: string) => roles[k].blocks.flatMap(slotsOf).filter((x) => isStrength(x) && (lower(x) ? "unten" : "oben") === half).length;
    const order = others.filter((k) => !roles[k].blocks.flatMap(slotsOf).some((x) => x.name === s.name) && !(half === "unten" && legClash(k)))
      .sort((a, c) => fit(c) - fit(a) || (limit(c) - est(roles[c])) - (limit(a) - est(roles[a])));
    for (const k of order) {
      const ok = tryOn(k, s.id, () => {
        const at = roles[k].blocks.findIndex((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher) || b.type === "module");
        const blk: Block = { type: "single", slot: { ...s, why: [...(s.why ?? []), "Vom ausgefallenen Tag hierher verschoben, damit die Woche ihr Ziel hält."] } };
        if (at < 0) roles[k].blocks.push(blk); else roles[k].blocks.splice(at, 0, blk);
      }, `${s.name} → ${label(k)}`);
      if (ok) { placed.add(s.id); return true; }
    }
    return false;
  };

  // 1. Kernübungen
  for (const s of core) if (!place(s)) unresolved.push(`${s.name} passt an keinem anderen Tag in die Zeit`);

  // 2. Erhaltung je Muskel
  const slotIn = (k: string, id: string) => roles[k].blocks.flatMap((b) => (b.type === "single" || b.type === "superset" ? slotsOf(b) : [])).find((x) => x.id === id);
  for (const m of MUSCLES) {
    let guard = 12;
    while ((cur()[m] ?? 0) < need(m) - 0.25 && guard--) {
      const cands = others.flatMap((k) => roles[k].blocks.flatMap((b) => (b.type === "single" || b.type === "superset" ? slotsOf(b) : [])).map((s) => ({ k, s })))
        .filter(({ k, s }) => isStrength(s) && (musclesOf(s.name)[m] ?? 0) >= 0.5 && (s.sets ?? 3) < MAX_SETS && (adds[k] ?? 0) < MAX_ADDS)
        .sort((a, c) => (musclesOf(c.s.name)[m] ?? 0) - (musclesOf(a.s.name)[m] ?? 0) || (limit(c.k) - est(roles[c.k])) - (limit(a.k) - est(roles[a.k])));
      let done = false;
      for (const { k, s: s0 } of cands) {
        const s = slotIn(k, s0.id);
        if (!s) continue;
        if (tryOn(k, s0.id, () => { s.sets = (s.sets ?? 3) + 1; s.why = [...(s.why ?? []), "+1 Satz als Ausgleich für den ausgefallenen Tag."]; }, `+1 Satz ${s.name} (${label(k)})`)) {
          adds[k] = (adds[k] ?? 0) + 1; done = true; break;
        }
      }
      if (done) continue;
      const mv = flat.filter((s) => !placed.has(s.id) && (musclesOf(s.name)[m] ?? 0) >= 0.5).sort((a, c) => (musclesOf(c.name)[m] ?? 0) - (musclesOf(a.name)[m] ?? 0))[0];
      if (mv && place(mv)) continue;
      break;
    }
    const v = cur()[m] ?? 0;
    if (v < need(m) - 0.25) unresolved.push(`${m}: ${String(Math.round(v * 2) / 2).replace(".", ",")} statt ${need(m)} Sätze pro Woche`);
  }
  for (const k of others) if (JSON.stringify(roles[k]) !== JSON.stringify(f.roles[k])) roles[k].minutes = Math.round(est(roles[k]) / 5) * 5;
  const dropped = [
    ...flat.filter((s) => !placed.has(s.id)).map((s) => s.name),
    ...gone.blocks.filter((b) => b.type === "beast").map(() => "Bestie"),
    ...gone.blocks.filter((b) => b.type === "module").map((b) => (b.type === "module" ? MODULE[b.module] ?? b.module : "")).filter(Boolean),
  ];
  void made;
  finish(gone, diffReport(f, roles, others), dropped, unresolved);
  return { ...f, roles };
}

/** Zeitlimit: normale Obergrenze des Tages; mit „länger erlaubt“ bis zu 15 Minuten über seiner Dauer */
function limitOf(r: Role, f: Focus, grow?: boolean): number {
  const base = Math.max(r.cap ?? Math.max(r.minutes, f.session_min), est(r));
  return grow ? Math.max(base, est(r) + 15) : base;
}

function finish(r: Role, moved: string[], dropped: string[], unresolved: string[]) {
  r.skipped = { moved, dropped, unresolved };
  r.blocks = [];
  r.warmup = [];
  r.cooldown = [];
}

/** Was sich an den übrigen Tagen geändert hat, netto: neue Übungen, Sätze mehr oder weniger, entfallene Bestien und Module */
function diffReport(f: Focus, roles: Record<string, Role>, others: string[]): string[] {
  const out: string[] = [];
  const lose: string[] = [];
  for (const k of others) {
    const o = f.roles[k], n = roles[k];
    const day = o.name;
    const sets = (r: Role) => new Map(r.blocks.flatMap(slotsOf).filter(isStrength).map((x) => [x.id, x] as const));
    const so = sets(o), sn = sets(n);
    for (const [id, x] of sn) {
      const y = so.get(id);
      if (!y) out.push(`${x.name} → ${day}`);
      else {
        const d = (x.sets ?? 3) - (y.sets ?? 3);
        if (d > 0) out.push(`${d === 1 ? "+1 Satz" : `+${d} Sätze`} ${x.name} (${day})`);
        if (d < 0) lose.push(`${day}: ${d === -1 ? "−1 Satz" : `${d} Sätze`.replace("-", "−")} ${x.name}`);
      }
    }
    const beasts = (r: Role) => r.blocks.filter((b) => b.type === "beast" || (b.type === "superset" && !!b.finisher)).length;
    if (beasts(n) < beasts(o)) lose.push(`${day}: Bestie entfällt`);
    for (const m of o.blocks) if (m.type === "module" && !n.blocks.some((x) => x.type === "module" && x.module === m.module)) lose.push(`${day}: ${MODULE[m.module] ?? m.module} entfällt`);
  }
  return [...out, ...lose];
}

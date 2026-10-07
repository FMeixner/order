/* Wochenform: vier Tage sind die Basis.
   Drei Tage: Der vierte Tag wird eingearbeitet, nicht gestrichen. Doppelte Bewegungsmuster fallen weg,
   der Rest wandert auf die übrigen Tage; damit es in die Zeit passt, werden Übungen zu Supersets gepaart
   und Pausen um 15 s gekürzt. Schwere Grundübungen bleiben unangetastet.
   Fünf Tage: Der Zusatztag (Rolle außerhalb von week_4, meist „bonus“) kommt zwischen die schweren Tage.
   Harlequin: Orden mit "medley" nehmen jede Woche einen anderen Orden. */
import { FOCUS_BY_ID, SWAP_GROUPS } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import type { AppState, Block, Focus, PlanBlock, Role, Slot } from "../types";
import { estimateRole } from "./duration";
import { parseReps } from "./resolve";
import { defaultRoles, setWeekFocus, trainingDays } from "./plan";
import { shortDay } from "./shortday";
import { applySlot } from "./sharpen";

let presets: Record<Role["location"], ReturnType<(typeof EQUIPMENT_PRESETS)[0]["make"]>> | null = null;
const P = () => (presets ??= { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() });
const est = (r: Role) => estimateRole(r, P()[r.location]).total;

const groupOf = (name: string) => Object.entries(SWAP_GROUPS).find(([, m]) => m.includes(name))?.[0] ?? name;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy] : []);
const isStrength = (s: Slot) => (s.kind ?? "strength") === "strength";
const isHeavy = (s: Slot) => (s.rest ?? 90) >= 150 || s.prog === "topset" || (parseReps(s.reps ?? "").hi ?? 99) <= 6;
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

const cache = new Map<string, Focus>();
/** Orden in der Form für n Trainingstage */
export function shapeFocus(f: Focus, nDays: number): Focus {
  if (nDays !== 3) return f;
  const key = `${f.id}:3`;
  if (!cache.has(key)) cache.set(key, compress(f));
  return cache.get(key)!;
}

/** Orden einer Woche: Harlequin nimmt jede Woche einen anderen, danach die Form für die Zahl der Trainingstage */
export function focusFor(state: AppState, b: PlanBlock, week: number): Focus | null {
  const base = FOCUS_BY_ID[b.focusId];
  if (!base) return null;
  const f = base.medley?.length ? FOCUS_BY_ID[base.medley[(week - 1) % base.medley.length]] ?? base : base;
  const n = trainingDays(state, b).length;
  let shaped = shapeFocus(f, n);
  // Kurztag: gekürzte Rolle, die übrigen Tage gleichen aus, wenn das Ziel des Ordens leidet
  if (b.shortRole && shaped.roles[b.shortRole] && !base.medley?.length) shaped = shortDay(shaped, b.shortRole, state.user, defaultRoles(shaped, n)).focus;
  return applySlot(shaped, state, b);
}

setWeekFocus(focusFor);

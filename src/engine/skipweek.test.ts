import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { Block, Role, Slot } from "../types";
import { defaultRoles } from "./plan";
import { isHeavy, isStrength, planMinutes } from "./slots";
import { musclesOf } from "./volume";
import { halfOf } from "./warmup";
import { MAINTAIN, MUSCLES, weekVolume } from "./shortday";
import { skipDay } from "./skipweek";

const user = emptyState().user;
const slotsOf = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const lower = (s: Slot) => (halfOf(s.name) ?? (Object.keys(musclesOf(s.name)).some((m) => ["Quadrizeps", "Beinbeuger", "Gesäß", "Waden"].includes(m)) ? "unten" : "oben")) === "unten";
const leg = (r: Role) => r.blocks.flatMap(slotsOf).some((s) => isStrength(s) && lower(s));
// Mo Di Do Fr: zwei Paare direkt hintereinander, damit die Beintag-Regel greift
const DAYS = [0, 1, 3, 4];

describe("Woche verdichten (Fällt aus)", () => {
  for (const f of Object.values(FOCUS_BY_ID)) {
    if (f.medley?.length) continue;
    const wr = defaultRoles(f, 4);
    const dayOf = Object.fromEntries(wr.map((k, i) => [k, DAYS[i]]));
    for (const [si, rk] of wr.entries()) {
      if (si === wr.length - 1) continue;
      for (const grow of [false, true]) it(`${f.id}: ${rk} fällt aus${grow ? " (+15 Min erlaubt)" : ""}`, () => {
        const targets = wr.slice(si + 1).map((k) => ({ role: k, day: dayOf[k] }));
        const out = skipDay(f, user, { role: rk, weekRoles: wr, targets, dayOf, grow });
        const gone = out.roles[rk];
        expect(gone.blocks).toEqual([]);
        expect(gone.skipped).toBeTruthy();
        const rep = gone.skipped!;
        for (const t of targets) {
          const o = f.roles[t.role], n = out.roles[t.role];
          // Zeitlimit: normal nie darüber, mit Erlaubnis bis 15 Minuten über der normalen Dauer
          const base = Math.max(o.cap ?? Math.max(o.minutes, f.session_min), planMinutes(o));
          const lim = grow ? Math.max(base, planMinutes(o) + 15) : base;
          expect(planMinutes(n), `${t.role}`).toBeLessThanOrEqual(lim + 0.6);
          if (targets.length === 1) {
            // Bleibt nur eine Einheit: Ganzkörper aus Kernübungen, je zwei Sätze
            for (const s of n.blocks.flatMap(slotsOf).filter(isStrength)) expect(s.sets ?? 3).toBeLessThanOrEqual(2);
            continue;
          }
          // Schwere Grundübungen nie in einem neuen Superset
          const ids = (x: Slot[]) => x.map((y) => y.id).join("+");
          const orig = new Set(o.blocks.flatMap((x) => (x.type === "superset" ? [ids(x.slots)] : [])));
          for (const bl of n.blocks) if (bl.type === "superset" && !orig.has(ids(bl.slots))) for (const s of bl.slots) expect(isHeavy(s), `${t.role}: ${s.name} im Superset`).toBe(false);
          // Nie zwei Beintage hintereinander: Ein Oberkörpertag neben einem Beintag bekommt keinen Unterkörper dazu
          const neighbourLeg = wr.some((k) => k !== rk && k !== t.role && Math.abs(dayOf[k] - t.day) === 1 && leg(f.roles[k]));
          if (!leg(o) && neighbourLeg) expect(leg(n), `${t.role} wird Beintag`).toBe(false);
        }
        if (targets.length === 1) return;
        // Kernübungen: auf einem anderen Tag oder offen gemeldet
        const cores = f.roles[rk].blocks.flatMap(slotsOf).filter((s) => s.core && isStrength(s));
        const has = (s: Slot) => targets.some((t) => out.roles[t.role].blocks.flatMap(slotsOf).some((x) => x.name === s.name));
        for (const s of cores) expect(has(s) || rep.unresolved.some((u) => u.startsWith(s.name)), s.name).toBe(true);
        // Erhaltung: jeder Muskel mindestens 4 Sätze (oder wie vorher, wenn weniger), sonst offen gemeldet
        const before = weekVolume(wr.map((k) => f.roles[k]));
        const after = weekVolume(wr.filter((k) => k !== rk).map((k) => out.roles[k]));
        for (const m of MUSCLES) {
          const need = Math.min(MAINTAIN, before[m] ?? 0);
          if ((after[m] ?? 0) < need - 0.25) expect(rep.unresolved.some((u) => u.startsWith(m)), `${m}: ${after[m]} < ${need}`).toBe(true);
        }
      });
    }
  }

  it("Ohne Erlaubnis bleibt mehr offen als mit +15 Minuten (Stichprobe über alle Orden)", () => {
    let a = 0, b = 0;
    for (const f of Object.values(FOCUS_BY_ID)) {
      if (f.medley?.length) continue;
      const wr = defaultRoles(f, 4);
      const dayOf = Object.fromEntries(wr.map((k, i) => [k, DAYS[i]]));
      const targets = wr.slice(1).map((k) => ({ role: k, day: dayOf[k] }));
      a += skipDay(f, user, { role: wr[0], weekRoles: wr, targets, dayOf }).roles[wr[0]].skipped!.unresolved.length;
      b += skipDay(f, user, { role: wr[0], weekRoles: wr, targets, dayOf, grow: true }).roles[wr[0]].skipped!.unresolved.length;
    }
    expect(b).toBeLessThanOrEqual(a);
  });
});

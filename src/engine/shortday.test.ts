import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState, EQUIPMENT_PRESETS } from "../store";
import { estimateRole } from "./duration";
import { defaultRoles } from "./plan";
import { shortDay, shortEligible } from "./shortday";

const P = { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() };
const user = emptyState().user;

describe("Kurztag", () => {
  for (const f of Object.values(FOCUS_BY_ID)) {
    if (f.medley?.length) continue;
    for (const n of [3, 4, 5]) {
      const wr = defaultRoles(f, n);
      for (const rk of wr.filter((k) => shortEligible(f.roles[k]))) it(`${f.id}.${rk} (${n} Tage): drei Kernübungen, kein Tag über seinem Zeitlimit, Kernübungen bleiben in der Woche`, () => {
        const { focus, report } = shortDay(f, rk, user, wr);
        const short = focus.roles[rk];
        expect(short.blocks.every((b) => b.type !== "beast" && b.type !== "module")).toBe(true);
        for (const k of wr.filter((x) => x !== rk)) {
          const lim = Math.max(f.roles[k].cap ?? Math.max(f.roles[k].minutes, f.session_min), estimateRole(f.roles[k], P[f.roles[k].location]).total);
          expect(estimateRole(focus.roles[k], P[focus.roles[k].location]).total, `${k}`).toBeLessThanOrEqual(lim + 0.6);
        }
        // Kernübungen: am Kurztag oder an einem anderen Tag, sonst offen gemeldet
        const all = new Set(wr.flatMap((k) => JSON.stringify(focus.roles[k].blocks).match(/"id":"[^"]+"/g) ?? []));
        const cores = (JSON.stringify(f.roles[rk].blocks).match(/"id":"[^"]+","core":true/g) ?? []).map((x) => x.replace(/,"core":true/, ""));
        const missing = cores.filter((c) => !all.has(c));
        expect(missing.length <= report.unresolved.filter((u) => u.includes("passt an keinem")).length).toBe(true);
      });
    }
  }
  it("leidet das Ziel nicht, bleiben die anderen Tage unverändert", () => {
    const f = FOCUS_BY_ID.smith;
    const wr = defaultRoles(f, 4);
    const { focus, report } = shortDay(f, "kraft_1", user, wr);
    expect(report.changes).toEqual([]);
    for (const k of wr.filter((x) => x !== "kraft_1")) expect(focus.roles[k]).toEqual(f.roles[k]);
  });
  it("Assassin: Kurztag am Dienstag behält Schulterdrücken, Schrägbank-Brustpresse und Curl", () => {
    const f = FOCUS_BY_ID.assassin;
    const { report } = shortDay(f, "arme_schultern", user, defaultRoles(f, 4));
    expect(report.kept).toEqual(["Shoulder Press Machine", "Incline Chest Press Machine", "Cable Biceps Curl"]);
  });
});

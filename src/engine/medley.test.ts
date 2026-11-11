import { describe, expect, it } from "vitest";
import { FOCUS_BY_ID } from "../data";
import { emptyState } from "../store";
import type { PlanBlock } from "../types";
import { focusFor, medleySequence } from "./weekplan";

const blk = (id: string, start: string, end: string, klammer?: PlanBlock["klammer"]): PlanBlock => ({ id, focusId: "harlequin", label: "", start, end, load: "medium", travel: false, ...(klammer ? { klammer } : {}) });

describe("Harlequin: Auswahl je Phase", () => {
  it("drei 4-Wochen-Phasen bringen alle zwölf Orden, keiner doppelt", () => {
    const plan = [blk("h1", "2026-09-28", "2026-10-25"), blk("h2", "2027-01-04", "2027-01-31"), blk("h3", "2027-05-03", "2027-05-30")];
    const st = { ...emptyState(), plan };
    const all = plan.flatMap((b) => medleySequence(st, b));
    expect(all.length).toBe(12);
    expect(new Set(all).size).toBe(12);
    expect(new Set(all)).toEqual(new Set(FOCUS_BY_ID.harlequin.medley));
  });
  it("im Wolf bei Gleichstand die Orden des Zeichens zuerst; Woche für Woche ein anderer Orden", () => {
    const b = blk("h1", "2026-09-28", "2026-10-25", "gpp");
    const st = { ...emptyState(), plan: [b] };
    const seq = medleySequence(st, b);
    expect(seq.length).toBe(4);
    for (const id of ["pilgrim", "conqueror", "pugilist", "assassin"]) expect(seq).toContain(id);
    const weeks = [1, 2, 3, 4].map((w) => focusFor(st, b, w)!.roles);
    expect(new Set(weeks.map((r) => Object.keys(r).join())).size).toBe(4);
  });
  it("12 Wochen: alle zwölf in der Reihenfolge der Liste", () => {
    const b = blk("h1", "2026-09-28", "2026-12-20");
    expect(medleySequence({ ...emptyState(), plan: [b] }, b)).toEqual(FOCUS_BY_ID.harlequin.medley);
  });
});

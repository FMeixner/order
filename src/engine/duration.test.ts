import { describe, expect, it } from "vitest";
import { FOCI } from "../data";
import { EQUIPMENT_PRESETS } from "../store";
import { estimateRole } from "./duration";

/* Jede Einheit soll ungefähr so lange dauern, wie ihre Orden-Datei angibt (A- und B-Woche).
   Tabelle ausgeben: REPORT=1 npx vitest run src/engine/duration.test.ts */
const TOLERANCE = 8;
/** Bewusst offen, mit Begründung */
const OPEN: Record<string, string> = {};

describe("Dauer der Einheiten", () => {
  const P = { gym: EQUIPMENT_PRESETS[0].make(), home: EQUIPMENT_PRESETS[1].make(), reise: EQUIPMENT_PRESETS[2].make() };
  const rows: string[] = [];
  for (const f of FOCI) for (const [k, r] of Object.entries(f.roles)) {
    const est = Math.max(estimateRole(r, P[r.location], undefined, 1).total, estimateRole(r, P[r.location], undefined, 2).total);
    rows.push(`${`${f.id}.${k}`.padEnd(32)} ${String(r.minutes).padStart(3)} Min angegeben, ${est.toFixed(0).padStart(3)} geschätzt`);
    if (OPEN[`${f.id}.${k}`]) continue;
    it(`${f.id}.${k}: ${r.minutes} Min`, () => expect(Math.abs(est - r.minutes)).toBeLessThanOrEqual(TOLERANCE));
  }
  if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.REPORT) it("Tabelle", () => console.log(rows.join("\n")));
});

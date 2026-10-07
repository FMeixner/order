/* Ausgangszustand für die Durchklick-Tests: allgemeine Daten, keine echten Personendaten. */
import type { Page } from "@playwright/test";
import { emptyState, EQUIPMENT_PRESETS } from "../src/store";
import type { AppState } from "../src/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function monday(): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}
const add = (s: string, n: number) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

export function fixture(focusId = "assassin"): AppState {
  const s = emptyState();
  const g = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
  const h = { ...EQUIPMENT_PRESETS[1].make(), id: "h" };
  const start = monday();
  return {
    ...s, onboarded: true, user: { ...s.user, name: "Test" }, equipment: [g, h],
    schedule: { Mo: "g", Di: "g", Mi: "g", Do: "h", Fr: "g", Sa: "g", So: "g" },
    plan: [{ id: "b1", focusId, label: "Test", start, end: add(start, 69), load: "medium", travel: false }],
  };
}

/** Zustand vor dem ersten Laden in den Speicher legen (nur beim ersten Aufruf, Neuladen behält den Stand) */
export async function seed(page: Page, st: AppState = fixture()) {
  await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("order:v1", s); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(st));
}
export const stored = (page: Page): Promise<AppState> => page.evaluate(() => JSON.parse(localStorage.getItem("order:v1") ?? "{}"));

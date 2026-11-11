/* Befinden (1.24): Feeling Scale −5 … +5 (Hardy & Rejeski, 1989) nach jeder Einheit. Auswertung für den Stand:
   Mittel der letzten vier Wochen, je Tagestyp der laufenden Phase die letzten Werte, ein Hinweis bei zähen Tagen.
   Nur Hinweise, nie eine automatische Änderung am Training. */
import type { AppState } from "../types";
import { addDays, blockAt, blockFocus, isTestBlock } from "./plan";

export interface AffectRole { role: string; name: string; values: number[]; mean: number }
export interface AffectSummary { mean4w: number | null; n: number; byRole: AffectRole[]; flag: string | null }

/** Ab so vielen Werten insgesamt zeigt der Stand die Auswertung */
export const AFFECT_MIN = 5;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Wort zum Mittelwert: unter −1 zäh, −1 bis +1 neutral, darüber gut */
export const affectWord = (m: number) => (m < -1 ? "zäh" : m > 1 ? "gut" : "neutral");
export const affectTone = (v: number) => (v < -1 ? "low" : v > 1 ? "high" : "mid");

export function affectSummary(state: AppState, today: string): AffectSummary {
  const log = [...(state.feeling ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const recent = log.filter((x) => x.date > addDays(today, -28) && x.date <= today).map((x) => x.value);
  const out: AffectSummary = { mean4w: recent.length ? r1(mean(recent)) : null, n: log.length, byRole: [], flag: null };
  const b = blockAt(state.plan, today);
  const f = b && !isTestBlock(b) ? blockFocus(b) : undefined;
  if (!f) return out;
  const byId = new Map(state.sessions.map((s) => [s.id, s]));
  for (const [key, role] of Object.entries(f.roles)) {
    const values = log.filter((x) => { const s = byId.get(x.sessionId); return s && s.focusId === f.id && s.role === key; }).map((x) => x.value).slice(-6);
    if (values.length) out.byRole.push({ role: key, name: role.name, values, mean: r1(mean(values)) });
  }
  out.byRole.sort((a, c) => c.mean - a.mean);
  const zaeh = [...out.byRole].reverse().find((r) => r.values.length >= 3 && mean(r.values.slice(-3)) < -1);
  if (zaeh) out.flag = `${zaeh.name} fühlt sich seit drei Einheiten zäh an. Unter Anpassen lässt er sich kürzen oder tauschen.`;
  return out;
}

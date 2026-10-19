/* Kontext einer Einheit: was Ansicht, Karten und Logik gemeinsam brauchen. */
import type { ReactNode } from "react";
import type { AppState, EquipmentProfile, Focus, PlanBlock } from "../../types";

type Update = (fn: (s: AppState) => AppState) => void;

export interface SessionCtx {
  state: AppState;
  update: Update;
  block: PlanBlock;
  focus: Focus;
  week: number;
  roleKey: string;
  profile: EquipmentProfile;
  date: string;
  reduced: boolean;
  /** Aktive Tagesanpassung für die Kopfzeile, z. B. „Kurz · Leise“ */
  modsLabel?: string;
  /** Knopf neben der Überschrift (⚙ Anpassen) und die aufgeklappte Karte darunter */
  headAction?: ReactNode;
  headPanel?: ReactNode;
}

/** Was eine Bestienkarte braucht: auch außerhalb einer Einheit (freie Jagd im Almanach) */
export type BeastCtx = Pick<SessionCtx, "state" | "update" | "profile">;

export const sessionId = (blockId: string, week: number, role: string) => `${blockId}:${week}:${role}`;

/** Viel Energie heute: Bestien eine Klasse länger, Schwertübungen +1 Satz (nicht bei −1 Satz) */
export const boostOf = (ctx: Pick<SessionCtx, "state" | "block" | "week" | "roleKey" | "reduced">) => !ctx.reduced && !!ctx.state.energy?.[sessionId(ctx.block.id, ctx.week, ctx.roleKey)];

/** Skills aus dem Skillcheck; null, solange keiner gemacht wurde */
export const skillSet = (st: AppState): Set<string> | null => (st.user.skills ? new Set(st.user.skills) : null);

/** Laufen ersetzen in dieser Einheit (alt: noRun = Bestie statt Lauf) */
export const runSubOf = (st: AppState, sid: string): "row" | "bike" | "rope" | "stair" | "beast" | undefined => st.runSub?.[sid] ?? (st.noRun?.[sid] ? "beast" : undefined);

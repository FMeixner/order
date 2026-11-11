import type { Focus } from "../src/types";
export const EXPLOSIVE: RegExp;
export const ENDURANCE: RegExp;
export const KNOWN: string[];
export function explosiveViolations(order: Focus): { role: string; week: "A" | "B"; key: string; endurance: string; explosive: string }[];

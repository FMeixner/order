import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState, migrate } from "../store";
import type { AppState, Block, Focus, Slot } from "../types";
import { dayMods, rememberMod, toggleMod } from "./dayadj";
import { dayRoleMap } from "./plan";
import { focusFor } from "./weekplan";

const gym = { ...EQUIPMENT_PRESETS[0].make(), id: "g" };
function st(extra: Partial<AppState> = {}): AppState {
  return {
    ...emptyState(), equipment: [gym], schedule: { Mo: "g", Di: "g", Do: "g", Fr: "g" },
    plan: [{ id: "b1", focusId: "assassin", label: "x", start: "2026-09-21", end: "2026-11-29", load: "medium", travel: false }],
    ...extra,
  };
}
const slots = (b: Block): Slot[] => (b.type === "single" ? [b.slot] : b.type === "superset" ? b.slots : b.type === "contrast" ? [b.heavy, b.explosive] : []);
const sets = (s: AppState, role: string) => focusFor(s, s.plan[0], 2)!.roles[role].blocks.flatMap(slots).reduce((a, x) => a + (x.sets ?? 3), 0);
const days = (s: AppState) => dayRoleMap(s, s.plan[0], focusFor(s, s.plan[0], 2)!, 2);

describe("Tagesanpassung", () => {
  it("Intensiv steht allein, Kurz/Leicht/Leise lassen sich kombinieren", () => {
    const s0 = st();
    const [d] = days(s0);
    let s = toggleMod(s0, s0.plan[0], 2, d.role, d.day, "short");
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "quiet");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toMatchObject({ short: true, quiet: true, intense: false });
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "intense");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toEqual({ short: false, light: false, quiet: false, tight: false, intense: true });
    s = toggleMod(s, s.plan[0], 2, d.role, d.day, "light");
    expect(dayMods(s, s.plan[0], 2, d.role, d.day)).toMatchObject({ light: true, intense: false });
  });
  it("Spontan Kurz am letzten Tag: kein Ausgleich; am ersten Tag gleichen nur die Tage danach aus", () => {
    const s0 = st();
    const ds = days(s0);
    const last = ds[ds.length - 1];
    const sLast = toggleMod(s0, s0.plan[0], 2, last.role, last.day, "short");
    for (const d of ds.slice(0, -1)) expect(sets(sLast, d.role)).toBe(sets(s0, d.role));
    expect(sets(sLast, last.role)).toBeLessThan(sets(s0, last.role));
    const first = ds[0];
    const sFirst = toggleMod(s0, s0.plan[0], 2, first.role, first.day, "short");
    expect(sets(sFirst, first.role)).toBeLessThan(sets(s0, first.role));
  });
  it("Gemerktes Kurz je Wochentag wirkt wie der alte Kurztag der Phase und ersetzt ihn", () => {
    const s0 = st();
    const fr = days(s0).find((d) => d.day === "Fr")!;
    const legacy = st({ plan: [{ ...s0.plan[0], shortRole: fr.role }] });
    const s = rememberMod(legacy, legacy.plan[0], 2, fr.role, "Fr", "short", true);
    expect(s.plan[0].shortRole).toBeUndefined();
    expect(s.dayFlags?.Fr?.short).toBe(true);
    expect(JSON.stringify(focusFor(s, s.plan[0], 2))).toBe(JSON.stringify(focusFor(legacy, legacy.plan[0], 2)));
    // heute aus, gemerkt bleibt
    const off = toggleMod(s, s.plan[0], 2, fr.role, "Fr", "short");
    expect(dayMods(off, off.plan[0], 2, fr.role, "Fr").short).toBe(false);
    expect(dayMods(off, off.plan[0], 3, fr.role, "Fr").short).toBe(true);
  });
  it("Schweißfrei am Ort wird Leise an dessen Wochentagen", () => {
    const office = { ...EQUIPMENT_PRESETS[2].make(), id: "o", sweatFree: true };
    const s = migrate({ ...st(), equipment: [gym, office], schedule: { Mo: "g", Di: "o", Do: "g", Fr: "o" } });
    expect(s.dayFlags).toEqual({ Di: { quiet: true }, Fr: { quiet: true } });
    expect(s.equipment.some((e) => "sweatFree" in e)).toBe(false);
  });
});

describe("Leise: leise Bestie statt Wegfall", () => {
  it("der Tag behält seine Bestie, gewählt wird eine leise", async () => {
    const { pickBeast, quietBeast } = await import("./plan");
    const s0 = st();
    const f0 = focusFor(s0, s0.plan[0], 2)!;
    const q = days(s0).find((d) => f0.roles[d.role].blocks.some((b) => b.type === "beast"))!;
    const s1 = toggleMod(s0, s0.plan[0], 2, q.role, q.day, "quiet");
    const f1 = focusFor(s1, s1.plan[0], 2)!;
    const blk = f1.roles[q.role].blocks.find((b) => b.type === "beast") as Extract<Block, { type: "beast" }>;
    expect(blk).toBeDefined();
    const beast = pickBeast(blk, { blockId: "b1", week: 2, profile: { ...gym, quiet: true }, state: s1, reduced: false, downgrade: false });
    expect(beast && quietBeast(beast)).toBe(true);
    // nichts wandert, die übrigen Tage bleiben gleich
    for (const d of days(s0).filter((x) => x.role !== q.role)) expect(JSON.stringify(f1.roles[d.role])).toBe(JSON.stringify(f0.roles[d.role]));
  });
  it("gibt es keine leise Fassung (Pool nur aus lauten Bestien), wandert die Bestie auf einen späteren Tag", async () => {
    const { BEASTS } = await import("../data");
    const { quietBeast } = await import("./plan");
    const { FOCUS_BY_ID } = await import("../data");
    const loud = BEASTS.filter((b) => !quietBeast(b)).slice(0, 4).map((b) => b.id);
    const base: Focus = JSON.parse(JSON.stringify(FOCUS_BY_ID.knight));
    for (const r of Object.values(base.roles)) for (const b of r.blocks) if (b.type === "beast") b.pool = loud;
    const s0 = st({ plan: [{ id: "b1", focusId: "knight", label: "x", start: "2026-09-21", end: "2026-11-29", load: "medium", travel: false, frozen: { at: "2026-09-21", foci: { knight: base } } }] });
    const f0 = focusFor(s0, s0.plan[0], 2)!;
    const q = days(s0).find((d) => f0.roles[d.role].blocks.some((b) => b.type === "beast"))!;
    const s = rememberMod(s0, s0.plan[0], 2, q.role, q.day, "quiet", true);
    const f = focusFor(s, s.plan[0], 2)!;
    expect(f.roles[q.role].blocks.some((b) => b.type === "beast")).toBe(false);
    const host = days(s).find((d) => f.roles[d.role].blocks.some((b) => b.type === "beast" && /Vom leisen/.test(b.note ?? "")));
    expect(host).toBeDefined();
  });
});

describe("Kein Platz und laute Übungen", () => {
  it("Leise ersetzt Langhantel-Deadlift und Sprünge, Kein Platz ersetzt Carry und Walking Lunge", async () => {
    const { resolveSlot } = await import("./resolve");
    const dl = { id: "x", name: "Deadlift", sets: 3, reps: "5", prog: "weight" as const };
    expect(resolveSlot(dl, gym)?.name).toBe("Deadlift");
    expect(resolveSlot(dl, { ...gym, quiet: true })?.name).toBe("Romanian Deadlift");
    expect(resolveSlot({ id: "j", name: "Squat Jump", sets: 3, reps: "5", prog: "none" }, { ...gym, quiet: true })?.name).toBe("KB Swing");
    const carry = resolveSlot({ id: "c", name: "Farmer's Carry", sets: 3, reps: "40 m", prog: "weight" }, { ...gym, tight: true })!;
    expect([carry.name, carry.reps]).toEqual(["Farmer's March", "40 Schritte"]);
    expect(resolveSlot({ id: "l", name: "Walking Lunge", sets: 3, reps: "10/Seite", prog: "double" }, { ...gym, tight: true })?.name).toBe("Reverse Lunge");
    // Mountain Climbers und Swings bleiben an leisen Tagen
    expect(resolveSlot({ id: "s", name: "KB Swing", sets: 3, reps: "15", prog: "double" }, { ...gym, quiet: true })?.name).toBe("KB Swing");
  });
  it("Bestien: leise ohne Langhantel vom Boden, kein Platz ohne Strecke; Schalter fixierbar", async () => {
    const { BEASTS } = await import("../data");
    const { beastForDay } = await import("./plan");
    expect(BEASTS.filter((b) => /deadlift 50/i.test(b.work)).every((b) => !beastForDay(b, { quiet: true }))).toBe(true);
    expect(BEASTS.filter((b) => /lunge walk|crawl/i.test(b.work)).every((b) => !beastForDay(b, { tight: true }))).toBe(true);
    expect(BEASTS.filter((b) => /mountain climbers|swings/i.test(b.work) && !/jump|burpee|sprint|run\b/i.test(b.work)).some((b) => beastForDay(b, { quiet: true }))).toBe(true);
    const s0 = st();
    const [d] = days(s0);
    const s = rememberMod(s0, s0.plan[0], 2, d.role, d.day, "tight", true);
    expect(dayMods(s, s.plan[0], 3, d.role, d.day).tight).toBe(true);
    expect(s.dayFlags?.[d.day]?.tight).toBe(true);
  });
});

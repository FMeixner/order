import { describe, expect, it } from "vitest";
import { DRILL_LISTS, FOCUS_BY_ID } from "../data";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { Role } from "../types";
import { coolDrills, isHardEnd, roleDrills } from "./plan";
import { warmupKeys } from "./warmup";
import { halfOf } from "./warmup";
import { isStrength } from "./slots";

describe("Warm-up und Cool-down (1.5)", () => {
  it("Warm-up-Listen enthalten keine Kraft- oder Aufbauübungen", () => {
    for (const gone of ["neck_complex", "core_prep", "db_er", "muscleup_tech"]) expect(DRILL_LISTS[gone]).toBeUndefined();
    for (const f of Object.values(FOCUS_BY_ID)) for (const r of Object.values(f.roles)) for (const l of r.warmup ?? []) expect(DRILL_LISTS[l], `${f.id}: ${l}`).toBeDefined();
  });
  it("Cool-down: große Dehnungen 45–60 s", () => {
    for (const l of ["cd_general", "cd_upper", "cd_lower"]) for (const d of DRILL_LISTS[l]) if (d.mode === "hold") expect(d.value).toBeGreaterThanOrEqual(45);
  });
  it("Oberkörpertag dehnt den Oberkörper, Unterkörpertag den Unterkörper", () => {
    expect(FOCUS_BY_ID.knight.roles.upper_a.cooldown).toEqual(["cd_upper"]);
    expect(FOCUS_BY_ID.knight.roles.lower_a.cooldown).toEqual(["cd_lower"]);
  });
  it("Ohne Black Roll: Brustwirbelsäule im Stehen statt auf der Rolle", () => {
    const user = emptyState().user;
    const role = { ...FOCUS_BY_ID.slayer.roles.kraft_a, drillEdit: undefined };
    const base = EQUIPMENT_PRESETS[0].make();
    const p = { ...base, has: { ...base.has, roll: false } };
    const names = roleDrills(role, "wu", p, user, 1).map((d) => d.name);
    expect(names.some((n) => n.includes("Foamroller"))).toBe(false);
    expect(names.some((n) => n.includes("im Stehen"))).toBe(true);
  });
});

describe("Isolation zum Einstieg", () => {
  it("Knight Oberkörper B beginnt mit Cable Fly, dann Bench Press", () => {
    const bl = FOCUS_BY_ID.knight.roles.upper_b.blocks;
    expect(bl[0].type === "single" && bl[0].slot.name).toBe("Cable Fly (tief nach hoch)");
    expect(bl[1].type === "single" && bl[1].slot.name).toBe("Bench Press");
  });
  it("höchstens zwei Isolationsübungen vor der ersten Grundübung", () => {
    for (const f of Object.values(FOCUS_BY_ID)) for (const [k, r] of Object.entries(f.roles)) {
      const singles = r.blocks.filter((b) => b.type === "single" || b.type === "superset" || b.type === "contrast");
      const firstCompound = singles.findIndex((b) => b.type !== "single" || (isStrength(b.slot) && !!halfOf(b.slot.name)));
      if (firstCompound > 0) expect(firstCompound, `${f.id}.${k}`).toBeLessThanOrEqual(2);
    }
  });
  it("Isolation vorweg spart einen Aufwärmsatz", () => {
    const row = { key: "row", name: "Barbell Row", kind: "strength" as const, equip: "barbell" as const, loadable: true, reps: "8", prog: "double" as const };
    const curl = { key: "curl", name: "Cable Curl", kind: "strength" as const, equip: "cable" as const, loadable: true, reps: "12", prog: "double" as const };
    expect(warmupKeys([row], () => 60).get("row")).toBe(1);
    expect(warmupKeys([curl, row], () => 60).get("row")).toBeUndefined();
    expect(warmupKeys([curl, row], () => 90).get("row")).toBe(1);
  });
});

describe("Ausklang (1.29)", () => {
  const user = emptyState().user;
  const p = EQUIPMENT_PRESETS[0].make();
  const slot = { id: "s1", name: "Bench Press", sets: 3, reps: "8-10" };
  const role = (blocks: Role["blocks"]): Role => ({ name: "Test", location: "gym", minutes: 45, cooldown: ["cd_upper"], blocks });
  it("nach Bestie, Finisher oder Satzende: 2 Minuten locker gehen zuerst", () => {
    for (const r of [
      role([{ type: "single", slot }, { type: "beast", id: "x" }]),
      role([{ type: "single", slot: { ...slot, finish: { kind: "myo" } } }]),
      role([{ type: "superset", slots: [slot, { ...slot, id: "s2" }], finisher: { pool: ["huldra"] } }]),
    ]) {
      const cd = coolDrills(r, p, user, 1);
      expect(cd[0]).toMatchObject({ id: "cd-walk", mode: "hold", value: 120 });
      expect(cd.length).toBe(roleDrills(r, "cd", p, user, 1).length + 1);
      expect(isHardEnd(r, 1)).toBe(true);
    }
  });
  it("normales Ende und Kurztag: kein Zusatzpunkt", () => {
    expect(coolDrills(role([{ type: "beast", id: "x" }, { type: "single", slot }]), p, user, 1)[0]?.id).not.toBe("cd-walk");
    expect(coolDrills(role([{ type: "beast", id: "x" }]), p, user, 1, true)[0]?.id).not.toBe("cd-walk");
  });
  it("Finisher nur in seiner Woche (only: A)", () => {
    const r = role([{ type: "superset", slots: [slot, { ...slot, id: "s2" }], finisher: { pool: ["huldra"], only: "A" } }]);
    expect(isHardEnd(r, 1)).toBe(true);
    expect(isHardEnd(r, 2)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Session } from "../types";
import { loggedStars, maxStar, practiceFor, skillsToAdd, starLevels, weakestDims } from "./stars";
import { ladderStart } from "./skills";

const sess = (entries: [string, { reps?: number; seconds?: number }[]][]): Session => ({
  id: "s", date: "2026-11-16", blockId: "b", focusId: "slayer", week: 1, role: "x", profileId: "g", done: true, drills: {},
  entries: Object.fromEntries(entries.map(([name, sets]) => [name, { key: `x|${name}`, slotId: "x", name, prog: "reps", sets: sets.map((s) => ({ done: true, ...s })) }])),
} as unknown as Session);
const st = (sessions: Session[], skills: string[] | null = []): AppState => { const s = emptyState(); return { ...s, sessions, user: { ...s.user, skills } }; };

describe("Skill-Sterne (1.51)", () => {
  it("geloggte Kriterien verdienen Sterne: 20 Liegestütze = Drücken 2, 10 s L-Sit = Körperbeherrschung 3", () => {
    const s = st([sess([["Push-Up", [{ reps: 20 }]], ["L-Sit", [{ seconds: 10 }]], ["Pull-Up", [{ reps: 4 }]]])]);
    const { level, skills } = loggedStars(s);
    expect(level).toEqual({ push: 2, pull: 0, legs: 0, control: 3 });
    expect([...skills]).toEqual(["l_sit"]);
  });
  it("Können-Häkchen zählen beim Umstieg als Sterne", () => {
    expect(starLevels(st([], ["pullup", "ring_dip", "pistol"]))).toEqual({ push: 3, pull: 2, legs: 5, control: 0 });
  });
  it("verdiente Sterne setzen die passenden Häkchen nach (nie ohne Skillcheck)", () => {
    expect(skillsToAdd(st([sess([["Pull-Up", [{ reps: 5 }]]])]))).toEqual(["pullup"]);
    expect(skillsToAdd(st([sess([["Pull-Up", [{ reps: 5 }]]])], ["pullup"]))).toBeNull();
    expect(skillsToAdd(st([sess([["Pull-Up", [{ reps: 5 }]]])], null))).toBeNull();
  });
  it("Drücken hat vier, die anderen fünf Sterne; schwächste Dimension zuerst", () => {
    expect([maxStar("push"), maxStar("pull"), maxStar("legs"), maxStar("control")]).toEqual([4, 5, 5, 5]);
    expect(weakestDims({ push: 2, pull: 3, legs: 1, control: 2 }, 1)[0]).toBe("legs");
    expect(weakestDims({ push: 4, pull: 5, legs: 5, control: 5 }, 1)).toEqual([]);
  });
  it("Übung für den nächsten Stern am Ort, sonst eine des aktuellen", () => {
    const home = { ...EQUIPMENT_PRESETS[1].make(), has: { ...EQUIPMENT_PRESETS[1].make().has, rings: true } };
    expect(practiceFor("pull", 2, home)?.crit.name).toBe("Pull-Up");
    expect(practiceFor("legs", 3, home)?.crit.name).toBe("Shrimp Squat");
  });
  it("Leitern starten auf der Sternstufe: Ziehen 3 → Archer Ring Row", () => {
    const ladder = ["Ring Row", "Ring Row (Füße erhöht)", "Archer Ring Row"];
    expect(ladderStart(ladder, new Set(["star:pull:3"]))).toBe(2);
    expect(ladderStart(ladder, new Set(["star:pull:2"]))).toBe(1);
    expect(ladderStart(ladder, new Set(["star:pull:0"]))).toBe(0);
  });
});

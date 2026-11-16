import { describe, expect, it } from "vitest";
import { EQUIPMENT_PRESETS, emptyState } from "../store";
import type { AppState, Session } from "../types";
import { loggedStars, maxStar, practiceFor, practiceSlot, skillsToAdd, starLevels, starLog, weakestDims } from "./stars";
import { ladderStart } from "./skills";

const sess = (entries: [string, { reps?: number; seconds?: number }[]][]): Session => ({
  id: "s", date: "2026-11-16", blockId: "b", focusId: "slayer", week: 1, role: "x", profileId: "g", done: true, drills: {},
  entries: Object.fromEntries(entries.map(([name, sets]) => [name, { key: `x|${name}`, slotId: "x", name, prog: "reps", sets: sets.map((s) => ({ done: true, ...s })) }])),
} as unknown as Session);
const st = (sessions: Session[], skills: string[] | null = []): AppState => { const s = emptyState(); return { ...s, sessions, user: { ...s.user, skills } }; };

describe("Skill-Sterne (1.51)", () => {
  it("ein Stern gilt erst mit allen Kriterien (1.51.3)", () => {
    const one = st([sess([["Push-Up", [{ reps: 20 }]], ["Knee Push-Up", [{ reps: 10 }]]])]);
    expect(starLevels(one).push).toBe(1);
    const all = st([sess([["Knee Push-Up", [{ reps: 10 }]], ["Push-Up", [{ reps: 20 }]], ["Deficit Push-Up", [{ reps: 10 }]], ["Dip", [{ reps: 5 }]]])]);
    expect(starLevels(all).push).toBe(2);
  });
  it("Dragon Flag allein gibt keine fünf Sterne Körperbeherrschung", () => {
    expect(starLevels(st([], ["dragon_flag"])).control).toBe(0);
    expect(starLevels(st([], ["dragon_flag", "planche"])).control).toBe(5);
  });
  it("Können-Häkchen erfüllen ihr Kriterium", () => {
    expect(starLevels(st([], ["pistol"])).legs).toBe(5);
    expect(loggedStars(st([sess([["L-Sit", [{ seconds: 10 }]]])])).skills.has("l_sit")).toBe(true);
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
  it("Lernpfad: erst die Vorstufen, dann das Kriterium (One-Arm Pull-Up)", () => {
    const gym = EQUIPMENT_PRESETS[0].make();
    expect(practiceFor("pull", 4, gym)?.step.name).toBe("Archer Pull-Up");
    const log = starLog(st([sess([["Archer Pull-Up", [{ reps: 5 }]], ["One-Arm Chin-Up (Finger-Hilfe)", [{ reps: 3 }]]])]));
    const x = practiceFor("pull", 4, gym, log)!;
    expect(x.crit.name).toBe("One-Arm Pull-Up");
    expect(["Band-Assisted One-Arm Chin-Up", "One-Arm Chin-Up Negative"]).toContain(x.step.name);
  });
  it("Skill-Karte: zwei Sätze", () => {
    expect(practiceSlot("legs", 0, EQUIPMENT_PRESETS[0].make(), "r")?.sets).toBe(2);
  });
  it("Leitern starten auf der Sternstufe: Ziehen 3 → Archer Ring Row", () => {
    const ladder = ["Ring Row", "Ring Row (Füße erhöht)", "Archer Ring Row"];
    expect(ladderStart(ladder, new Set(["star:pull:3"]))).toBe(2);
    expect(ladderStart(ladder, new Set(["star:pull:2"]))).toBe(1);
    expect(ladderStart(ladder, new Set(["star:pull:0"]))).toBe(0);
  });
});

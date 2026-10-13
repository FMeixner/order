import { describe, expect, it } from "vitest";
import HELP from "../ui/Help.tsx?raw";
import RESOLVE from "./resolve.ts?raw";
import NORMS from "../../data/modules/norms.json?raw";
import REFS from "../../data/modules/references.json";
import { FOCI } from "../data";

const shorts = new Set(REFS.refs.map((r) => r.short));

describe("Literatur", () => {
  it("jede Quelle eines Ordens steht in der Literaturliste", () => {
    for (const f of FOCI) for (const s of f.sources ?? []) {
      const m = s.match(/^(.*) \((\d{4})\)$/);
      expect(m, s).not.toBeNull();
      expect(shorts.has(`${m![1]}, ${m![2]}`), `${f.id}: ${s}`).toBe(true);
    }
  });
  it("Zitate in Hilfe und Pausenlogik stehen in der Literaturliste", () => {
    let n = 0;
    for (const [file, raw] of [["Help.tsx", HELP], ["resolve.ts", RESOLVE], ["norms.json", NORMS]] as const) {
      const txt = raw.replace(/&amp;/g, "&");
      for (const m of txt.matchAll(/\(([^()]*?\d{4})\)/g)) for (const part of m[1].split(";")) {
        const c = part.trim().replace(/^.*?([A-Za-z][\wäöüß'-]*(?: [\wäöüß'-]+)*(?: &| et al\.)?[^,]*, \d{4})$/, "$1");
        if (!/\d{4}$/.test(c) || !/et al\.|&|^[A-Z][a-z]+, \d{4}$|^van /.test(c)) continue;
        const key = c.replace(/^(FRIEND-Register|CHMS|Powerlifting-Wettkampf.*?) /, "");
        expect(shorts.has(key), `${file}: ${key}`).toBe(true);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

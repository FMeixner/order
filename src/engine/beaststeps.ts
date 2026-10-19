/* Bestie Schritt für Schritt: aus „400/300/200m Run · 20/15/10 Band Thrusters · Rest 60s“ und der Rundenzahl eine Folge von Schritten.
   Zeitstationen (Halten, Pausen, Seil, Stepper) laufen mit Countdown und gehen von selbst weiter, Wiederholungen tippt man ab. */

export interface BeastStep {
  /** Was jetzt dran ist, z. B. „15 Band Thrusters“ */
  text: string;
  /** Runde 1…n (Buy-in 0, Buy-out n+1) */
  round: number;
  /** Sekunden bei Zeitstationen: Countdown, danach automatisch weiter */
  seconds?: number;
  rest?: boolean;
}

const LADDER = /^(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)+)([a-z]*)\s+(.*)$/i;
const SINGLE = /^(\d+(?:\.\d+)?)([a-z]*)\s+(.*)$/i;
/** Halten ohne Einheit („60/90/120 Plank“, „30/45/60 Passive Hang“) sind Sekunden */
const HOLD_NAME = /\b(plank|hang|hold|wall sit|l-sit)\b/i;
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

function stepOf(part: string, r: number): Omit<BeastStep, "round"> {
  const p = part.trim();
  const rest = p.match(/^rest\s+(\d+)\s*s$/i);
  if (rest) return { text: "Pause", seconds: Number(rest[1]), rest: true };
  let num: number | null = null;
  let unit = "";
  let name = p;
  const lad = p.match(LADDER);
  if (lad) {
    const nums = lad[1].split("/").map(Number);
    num = nums[r % nums.length];
    unit = lad[2];
    name = lad[3];
  } else {
    const one = p.match(SINGLE);
    if (one) { num = Number(one[1]); unit = one[2]; name = one[3]; }
  }
  if (num == null) return { text: p };
  const u = unit.toLowerCase();
  if (u === "s" || (u === "" && HOLD_NAME.test(name) && num >= 15)) return { text: `${fmtNum(num)} s ${name}`, seconds: num };
  if (u === "min") return { text: `${fmtNum(num)} Min ${name}`, seconds: num * 60 };
  return { text: `${fmtNum(num)}${unit} ${name}` };
}

/** Schritte einer Bestie (oder eines Teils einer Serie). Leer, wenn sich die Bestie nicht sinnvoll zerlegen lässt (AMRAP, EMOM). */
export function beastSteps(b: { work: string; rounds: number }): BeastStep[] {
  if (/amrap|emom|for time:/i.test(b.work)) return [];
  const parts = b.work.split(" · ").map((x) => x.trim()).filter(Boolean);
  const buyIn = parts.filter((x) => /^buy-in:/i.test(x)).map((x) => x.replace(/^buy-in:\s*/i, ""));
  const buyOut = parts.filter((x) => /^buy-out:/i.test(x)).map((x) => x.replace(/^buy-out:\s*/i, ""));
  const inner = parts.filter((x) => !/^buy-(in|out):/i.test(x));
  const out: BeastStep[] = buyIn.map((x) => ({ ...stepOf(x, 0), round: 0 }));
  for (let r = 0; r < b.rounds; r++) {
    inner.forEach((x, i) => {
      const s = stepOf(x, r);
      // Pause am Ende der letzten Runde entfällt
      if (s.rest && r === b.rounds - 1 && i === inner.length - 1) return;
      out.push({ ...s, round: r + 1 });
    });
  }
  out.push(...buyOut.map((x) => ({ ...stepOf(x, 0), round: b.rounds + 1 })));
  return out;
}

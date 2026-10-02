/** Zeiteingabe tolerant lesen: „12:34“, „12.34“, „12,34“, „1234“ (= 12:34), „12“ (= 12 Minuten).
    Mit Zehnteln: „3:25.4“ oder „3.25.4“. Sekunden über 59 sind ein Tippfehler: null. */
export function parseClock(raw: string): number | null {
  const s = raw.trim().replace(/,/g, ".").replace(/\s+/g, "");
  if (!s) return null;
  // Mit Punkt immer zwei Stellen für die Sekunden: „12.5“ ist mehrdeutig (12:05 oder 12:50)
  let m = s.match(/^(\d+)(?::(\d{1,2})|\.(\d{2}))(?:[.:](\d))?$/);
  if (m) {
    const sec = parseInt(m[2] ?? m[3]);
    if (sec > 59) return null;
    return parseInt(m[1]) * 60 + sec + (m[4] ? parseInt(m[4]) / 10 : 0);
  }
  m = s.match(/^(\d+)$/);
  if (m) {
    if (s.length <= 2) return parseInt(s) * 60;
    const sec = parseInt(s.slice(-2));
    return sec > 59 ? null : parseInt(s.slice(0, -2)) * 60 + sec;
  }
  return null;
}

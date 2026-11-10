/* Ordenssymbole: eigene Strichzeichnungen (48er-Raster), als Wasserzeichen hinter Ordenskarten. */
const PATHS: Record<string, string> = {
  acrobat: "M6 44V20M42 44V20M6 22q18 7 36 0M9 13q15 5 30 0M24 12v9M24 21l-3 3M24 21l3 3M27 8.5a3 3 0 1 1-6 0a3 3 0 1 1 6 0",
  alchemist: "M14 44L29 17M31 4l2 5 5 .6-3.8 3.3 1.1 5-4.3-2.6-4.3 2.6 1.1-5L24 9.6l5-.6zM11 40l6 1",
  assassin: "M24 4l4 8v17h-8V12zM15 29h18M24 29v10M26.5 42a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0",
  conqueror: "M12 44V5M12 8h24l-6 7 6 7H12M8 44h8",
  dancer: "M8 14q16 10 32 0M12 26q12 8 24 0M16 38q8 5 16 0M40 14c0 16-8 24-16 26C16 38 8 30 8 14",
  harlequin: "M24 5l9 9-9 9-9-9zM24 25l9 9-9 9-9-9zM14 15l9 9-9 9-9-9zM34 15l9 9-9 9-9-9z",
  herald: "M8 13h26M34 13l9-6v12zM5 11v4M12 13v19l5-4 5 4 5-4 5 4V13M17 19l5 4 5-4",
  huntsman: "M14 5c15 7 15 31 0 38M14 5v38M6 24h34M34 19l6 5-6 5M6 24l3-3M6 24l3 3",
  king: "M9 36L6 15l10 8 8-14 8 14 10-8-3 21zM9 42h30",
  knight: "M24 4l16 6v12c0 12-8 19-16 22-8-3-16-10-16-22V10zM24 10v28M12 21h24",
  /** Mercenary: Kurzhantel mit Funke (Kraft plus Können) */
  mercenary: "M6 26v8M11 21v18M37 21v18M42 26v8M11 30h26M24 4l2 4.5 4.8.6-3.6 3.3 1 4.8-4.2-2.4-4.2 2.4 1-4.8-3.6-3.3 4.8-.6z",
  /** Skirmisher: Feder im Flug, drei Bewegungsstriche */
  skirmisher: "M40 8C24 10 14 22 12 40M40 8c-2 10-10 20-22 24M40 8L27 21M8 20h8M6 27h7M8 34h4",
  /** Barbarian: Doppelaxt */
  barbarian: "M24 6v38M24 10c-6-4-14-3-18 2 3 6 10 9 18 6M24 10c6-4 14-3 18 2-3 6-10 9-18 6M20 44h8",
  /** Gladiator: Arena-Bogen mit hängendem Sandsack */
  gladiator: "M8 44V26a16 16 0 0 1 32 0v18M24 24c5 0 7 4 7 8s-2 9-7 9-7-5-7-9 2-8 7-8zM24 24v-5M20 19h8",
  monk: "M37 15A17 17 0 1 0 41 27M26 25a2 2 0 1 1-4 0a2 2 0 1 1 4 0",
  paladin: "M10 6h28v6H10zM14 12v13c0 9 4 15 10 17 6-2 10-8 10-17V12M24 12v26M17 22h14",
  olympian: "M17 40C7 32 6 18 14 8M31 40c10-8 11-22 3-32M12 33l-5 1M10 25l-5-1M11 17l-4-3M36 33l5 1M38 25l5-1M37 17l4-3M17 40h14",
  pilgrim: "M24 40L10 23a16 16 0 0 1 28 0zM24 40l-8-18M24 40V19M24 40l8-18M20 44h8",
  pugilist: "M13 21c0-8 6-13 13-13h3c6 0 9 6 9 13v7c0 7-5 11-11 11h-5c-6 0-9-4-9-9zM13 25c5 0 9 2 9 7M17 39v5h16v-5",
  scout: "M6 24C13 14 35 14 42 24C35 34 13 34 6 24zM27 24a3 3 0 1 1-6 0a3 3 0 1 1 6 0M38 8l6 6M44 14l-7 1M44 14l-1-7",
  smith: "M5 13h31v3c0 5-4 8-9 8h-1v7h5v5H17v-5h5v-7h-3c-7 0-11-4-14-11zM36 13h7M14 42h20",
  troubadour: "M17 41c-8-7-7-17 1-22s17-3 17 5c0 10-10 23-18 17zM31 19l9-12M36 4l6 6M27 30a3 3 0 1 1-6 0a3 3 0 1 1 6 0",
  /** Testwoche: Turnier der Klingen, gekreuzte Lanzen mit Schild */
  test: "M6 42L40 8M40 8l-1 5M40 8l-5 1M42 42L8 8M8 8l1 5M8 8l5 1M24 16l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12v-7z",
  slayer: "M9 41L37 11M37 11l4-6-6 4M13 31l5 5M39 41L11 11M11 11L7 5l6 4M35 31l-5 5",
};

/** Ordenssymbol als dezentes Wasserzeichen rechts in einer Karte (die Karte braucht position: relative) */
export function OrderMark({ id }: { id: string }) {
  const d = PATHS[id];
  if (!d) return null;
  return (
    <svg className="order-mark" viewBox="0 0 48 48" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const hasOrderMark = (id: string) => id in PATHS;

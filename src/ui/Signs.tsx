/* Zeichen statt Sätze (1.0): Warnungen, Zielbindung, Kalorien, Pins und Klammer-Arten als kleine Strichsymbole.
   Jedes Zeichen trägt seinen Text als aria-label und title — wer antippt oder darüberfährt, liest ihn;
   der ausführliche Satz steht im Phasenblatt. Eigene Strichzeichnungen, keine fremden Marken. */
import type { Kcal, KlammerId } from "../types";
import type { Bind, Flag } from "../engine/klammer";
import { FLAG_TEXT } from "../engine/klammer";

export type SignKind = "warn" | "off" | "pin" | "clock" | "gap" | "ok" | Kcal | `bind-${Bind}`;

const KCAL_TEXT: Record<Kcal, string> = { deficit: "Defizit", maintenance: "Erhaltung", surplus: "Überschuss" };
const BIND_TEXT: Record<Bind, string> = { lead: "trägt das Ziel der Klammer", accept: "trägt das Ziel teilweise", none: "trägt das Ziel der Klammer nicht" };
const TEXT: Record<string, string> = { warn: "Hinweis", off: "passt nicht", pin: "von Hand gesetzt", clock: "Uhr über Budget", gap: "Lücke in der Bilanz", ok: "alles im Lot", ...KCAL_TEXT };

function path(kind: SignKind) {
  switch (kind) {
    case "warn": return <><path d="M8 2.2 14.3 13.3H1.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.3v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.4" r="0.9" fill="currentColor" /></>;
    case "off": return <><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4.1 11.9 11.9 4.1" stroke="currentColor" strokeWidth="1.4" /></>;
    case "pin": return <><rect x="3.5" y="7.2" width="9" height="6.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5.6 7.2V5.2a2.4 2.4 0 0 1 4.8 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" /></>;
    case "clock": return <><circle cx="8" cy="8.6" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5.6v3.2l2.2 1.4M6.2 1.8h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>;
    case "gap": return <><path d="M2 12h3.4M10.6 12H14M2 4h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M5.4 12 8 8.2 10.6 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.6 1.6" /></>;
    case "ok": return <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />;
    case "surplus": return <><path d="M8 13.5V3M4.2 6.8 8 3l3.8 3.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "deficit": return <><path d="M8 2.5V13M4.2 9.2 8 13l3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "maintenance": return <><path d="M2.5 6.2h11M2.5 9.8h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>;
    case "bind-lead": return <circle cx="8" cy="8" r="4.6" fill="currentColor" />;
    case "bind-accept": return <><circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 3.4a4.6 4.6 0 0 1 0 9.2Z" fill="currentColor" /></>;
    case "bind-none": return <circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />;
  }
}

/** Ein Zeichen, 15 px, Farbe über die Klasse (sign-warn = bernstein, sign-off = rot, sonst gedämpft) */
export function Sign({ kind, label, size = 15 }: { kind: SignKind; label?: string; size?: number }) {
  const text = label ?? (kind.startsWith("bind-") ? BIND_TEXT[kind.slice(5) as Bind] : TEXT[kind]);
  return (
    <span className={`sign sign-${kind}`} role="img" aria-label={text} title={text}>
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>{path(kind)}</svg>
    </span>
  );
}

/** Warnzeichen einer Phase aus ihren Codes: ein Zeichen, der Text aller Codes im title */
export function FlagSign({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null;
  const off = flags.includes("off-goal");
  return <Sign kind={off ? "off" : "warn"} label={flags.map((f) => FLAG_TEXT[f]).join(" · ")} />;
}

/** Symbole der fünf Klammern: Strichzeichnungen, auch ohne Farbe unterscheidbar */
export function KlammerIcon({ id, size = 16 }: { id: KlammerId; size?: number }) {
  const d: Record<KlammerId, React.ReactNode> = {
    // Muskelzuwachs: drei wachsende Bögen
    muskel: <path d="M3 13c0-3 2-5 5-5s5 2 5 5M5 13c0-1.7 1.3-3 3-3s3 1.3 3 3M8 8V3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
    // Kraft: Hantel
    kraft: <path d="M1.5 8h13M3.5 5v6M5.5 4v8M10.5 4v8M12.5 5v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    // Athletik: Blitz
    athletik: <path d="M9.2 1.8 4 9h3.6l-1 5.2L12 7H8.3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
    // GPP: Kreis aus vier Bögen
    gpp: <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5M13.5 8A5.5 5.5 0 0 1 8 13.5M8 13.5A5.5 5.5 0 0 1 2.5 8M2.5 8A5.5 5.5 0 0 1 8 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6.6 2" strokeLinecap="round" />,
    // Regeneration: Mondsichel
    regeneration: <path d="M10.5 2.6A5.6 5.6 0 1 0 13.4 11 4.6 4.6 0 0 1 10.5 2.6Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  };
  return <svg className="klammer-icon" viewBox="0 0 16 16" width={size} height={size} aria-hidden>{d[id]}</svg>;
}

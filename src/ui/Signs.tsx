/* Zeichen statt Sätze (1.0): Warnungen, Zielbindung, Kalorien, Pins und Klammer-Arten als kleine Strichsymbole.
   Jedes Zeichen trägt seinen Text als aria-label und title — wer antippt oder darüberfährt, liest ihn;
   der ausführliche Satz steht im Phasenblatt. Eigene Strichzeichnungen, keine fremden Marken. */
import type { Kcal, KlammerId, Load } from "../types";
import type { Bind, Flag } from "../engine/klammer";
import { FLAG_TEXT } from "../engine/klammer";

export type SignKind = "warn" | "off" | "pin" | "clock" | "gap" | "ok" | "travel" | `load-${Load}` | Kcal | `bind-${Bind}`;

const KCAL_TEXT: Record<Kcal, string> = { deficit: "Defizit", maintenance: "Erhaltung", surplus: "Überschuss" };
const BIND_TEXT: Record<Bind, string> = { lead: "trägt das Ziel des Zeichens", accept: "trägt das Ziel teilweise", none: "trägt das Ziel des Zeichens nicht" };
const TEXT: Record<string, string> = { travel: "unterwegs möglich", "load-high": "auch bei viel Alltagslast", "load-medium": "bei mittlerer Alltagslast", "load-low": "nur bei wenig Alltagslast", warn: "Hinweis", off: "passt nicht", pin: "von Hand gesetzt", clock: "Uhr über Budget", gap: "Lücke in der Bilanz", ok: "alles im Lot", ...KCAL_TEXT };

function path(kind: SignKind) {
  switch (kind) {
    case "warn": return <><path d="M8 2.2 14.3 13.3H1.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.3v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.4" r="0.9" fill="currentColor" /></>;
    case "off": return <><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4.1 11.9 11.9 4.1" stroke="currentColor" strokeWidth="1.4" /></>;
    case "pin": return <><rect x="3.5" y="7.2" width="9" height="6.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5.6 7.2V5.2a2.4 2.4 0 0 1 4.8 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" /></>;
    case "clock": return <><circle cx="8" cy="8.6" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5.6v3.2l2.2 1.4M6.2 1.8h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>;
    case "gap": return <><path d="M2 12h3.4M10.6 12H14M2 4h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M5.4 12 8 8.2 10.6 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.6 1.6" /></>;
    case "travel": return <><rect x="2" y="5.2" width="12" height="8.3" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5.8 5.2V3.6c0-.6.4-1 1-1h2.4c.6 0 1 .4 1 1v1.6M2 9h12" fill="none" stroke="currentColor" strokeWidth="1.4" /></>;
    case "load-low": case "load-medium": case "load-high": {
      const n = kind === "load-high" ? 3 : kind === "load-medium" ? 2 : 1;
      return <>{[0, 1, 2].map((i) => <rect key={i} x={2 + i * 4.5} y={11 - i * 3.5} width="3" height={3 + i * 3.5} rx="0.8" fill="currentColor" opacity={i < n ? 1 : 0.25} />)}</>;
    }
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

/** Symbole der fünf Zeichen (intern: Klammern) — Tierköpfe als Strichzeichnungen, auch ohne Farbe unterscheidbar:
    Bär (Muskelzuwachs), Stier (Kraft), Falke (Athletik), Wolf (Allround, Kondition), Hirsch (Regeneration). */
export function KlammerIcon({ id, size = 16 }: { id: KlammerId; size?: number }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const d: Record<KlammerId, React.ReactNode> = {
    // Bär: runder Kopf, runde Ohren, Schnauze
    muskel: <><circle cx="4.3" cy="4.4" r="1.9" {...line} /><circle cx="11.7" cy="4.4" r="1.9" {...line} /><path d="M8 4.4c3.4 0 5.4 2.5 5.4 5.3S11 14.6 8 14.6 2.6 12.5 2.6 9.7 4.6 4.4 8 4.4Z" {...line} /><ellipse cx="8" cy="11" rx="1.9" ry="1.4" {...line} /><circle cx="8" cy="10.6" r="0.55" fill="currentColor" /></>,
    // Stier: geschwungene Hörner, kantiger Kopf, Nüstern
    kraft: <><path d="M1.5 3.2c.6 2.6 2.4 3.8 4.6 3.8h3.8c2.2 0 4-1.2 4.6-3.8" {...line} /><path d="M5 7v3.6c0 2.3 1.3 3.9 3 3.9s3-1.6 3-3.9V7" {...line} /><circle cx="6.9" cy="12.6" r="0.5" fill="currentColor" /><circle cx="9.1" cy="12.6" r="0.5" fill="currentColor" /></>,
    // Falke: gespreizte, spitze Schwingen im Sturzflug
    athletik: <><path d="M8 6.6C6 6 3.6 5.6 1.4 7.6 4 8.1 6.1 8.8 8 10.2 9.9 8.8 12 8.1 14.6 7.6 12.4 5.6 10 6 8 6.6Z" {...line} /><circle cx="8" cy="4.6" r="1.3" {...line} /><path d="M7.1 10.2 6.6 13.6h2.8l-.5-3.4" {...line} /></>,
    // Fuchs: große Ohren, breite Wangen, spitze Schnauze, helle Maske
    skill: <><path d="M2.4 1.6 5.2 6M13.6 1.6 10.8 6M2.4 1.6 1.6 8.4 8 14.4l6.4-6 -.8-6.8" {...line} /><path d="M3.6 8.6 8 11l4.4-2.4" {...line} /><circle cx="8" cy="13.2" r="0.6" fill="currentColor" /></>,
    // Wolf: spitze Ohren, lange Schnauze
    gpp: <><path d="M3 1.8 5.4 6h5.2L13 1.8V9l-5 5.4L3 9Z" {...line} /><path d="M6 8.6h.01M10 8.6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 12h2" {...line} /></>,
    // Hirsch: Geweih über schmalem Kopf
    regeneration: <><path d="M6.2 9.2 3.6 5.2M3.6 5.2 2 3.6M3.6 5.2 4 2.2M9.8 9.2l2.6-4M12.4 5.2 14 3.6M12.4 5.2 12 2.2" {...line} /><path d="M6 8.6h4l-.6 4.2L8 14.6l-1.4-1.8Z" {...line} /></>,
  };
  return <svg className="klammer-icon" viewBox="0 0 16 16" width={size} height={size} aria-hidden>{d[id]}</svg>;
}

/** Symbole der Navigation: schlichte Strichzeichnungen, 1,75 px */
export function TabIcon({ k, size = 20 }: { k: "heute" | "plan" | "stand" | "almanach" | "setup"; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (k === "heute") return <svg {...p}><path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" /></svg>;
  if (k === "plan") return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
  if (k === "stand") return <svg {...p}><path d="M5 20v-6M12 20V5M19 20v-9" /></svg>;
  if (k === "almanach") return <svg {...p}><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11M9 8.5h6" /></svg>;
  return <svg {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>;
}

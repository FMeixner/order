/* Herzrate-Pilot: Verbindungstest über Web Bluetooth (Standard-Heart-Rate-Service).
   Nur ein Test — es wird nichts gespeichert. Zeigt, ob ein Gerät live Herzraten sendet,
   als Basis für die spätere Zuordnung zu Sätzen und Pausen (doneAt-Zeitstempel). */
import { useRef, useState } from "react";

/* Web Bluetooth fehlt in den Standard-Typen des Compilers; für den Piloten reichen minimale Deklarationen. */
type GattCharacteristic = { startNotifications(): Promise<unknown>; stopNotifications(): Promise<unknown>; addEventListener(t: "characteristicvaluechanged", l: (ev: Event) => void): void };
type GattServer = { connected: boolean; connect(): Promise<unknown>; disconnect(): void; getPrimaryService(s: string): Promise<{ getCharacteristic(s: string): Promise<GattCharacteristic> }> };
type BtDevice = { name?: string | null; gatt?: GattServer; addEventListener?(t: "gattserverdisconnected", l: () => void): void };
type BluetoothApi = { requestDevice(o: { filters: { services: string[] }[] }): Promise<BtDevice> };

const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString("de-DE");

export function HrPilot() {
  const bt = (navigator as unknown as { bluetooth?: BluetoothApi }).bluetooth;
  const devRef = useRef<BtDevice | null>(null);
  const charRef = useRef<GattCharacteristic | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "on" | "off" | "error">("idle");
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [hr, setHr] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [since, setSince] = useState<number | null>(null);

  const stop = async () => {
    try { await charRef.current?.stopNotifications(); } catch { /* getrennt ist getrennt */ }
    devRef.current?.gatt?.disconnect();
    charRef.current = null;
    setStatus("off");
  };

  const start = async () => {
    if (!bt) return;
    setErr(""); setStatus("connecting");
    try {
      const dev = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
      devRef.current = dev;
      setName(dev.name ?? "Gerät");
      const server = dev.gatt;
      if (!server) throw new Error("Das Gerät bietet keinen GATT-Server.");
      await server.connect();
      const svc = await server.getPrimaryService("heart_rate");
      const ch = await svc.getCharacteristic("heart_rate_measurement");
      charRef.current = ch;
      ch.addEventListener("characteristicvaluechanged", (ev) => {
        const dv = (ev.target as unknown as { value: DataView }).value;
        // Flags-Byte: Bit 0 sagt, ob die Herzrate 8- oder 16-bit-codiert ist
        const v = dv.getUint8(0) & 1 ? dv.getUint16(1, true) : dv.getUint8(1);
        setHr(v); setCount((c) => c + 1); setLastAt(Date.now());
        setRange((r) => (r ? { min: Math.min(r.min, v), max: Math.max(r.max, v) } : { min: v, max: v }));
      });
      dev.addEventListener?.("gattserverdisconnected", () => { setStatus("off"); setErr("Die Verbindung wurde getrennt."); });
      setHr(null); setCount(0); setRange(null); setLastAt(null);
      setSince(Date.now());
      setStatus("on");
    } catch (e) {
      charRef.current = null;
      setStatus("error");
      const msg = e instanceof Error ? e.message : String(e);
      setErr(/cancel|abgebrochen|User (Denied|Cancelled)/i.test(msg) ? "Gerätesuche abgebrochen." : `Verbindung fehlgeschlagen: ${msg}`);
    }
  };

  if (!bt) return (
    <div className="stack">
      <p className="muted small">Dieser Browser kann kein Bluetooth über Webseiten. Der Test läuft in Chrome oder Edge (Android oder Desktop), nicht in Firefox und Safari.</p>
    </div>
  );

  return (
    <div className="stack">
      <p className="muted small">
        Test, ob ein Herzrate-Gerät live sendet — gespeichert wird nichts. Voraussetzung: Das Gerät nutzt den Bluetooth-Standard-Heart-Rate-Service (Brustgurten wie Polar tun das garantiert).
        Eine Smartwatch, die noch mit dem Telefon verbunden ist, nimmt oft keine zweite Verbindung: Uhr für den Test vom Telefon trennen. Handgelenksensoren liefern bei Kraftübungen erfahrungsgemäß Aussetzer — auch das sieht man hier.
      </p>
      {status !== "on" ? (
        <div className="row wrap">
          <button className="btn primary" onClick={start} disabled={status === "connecting"}>{status === "connecting" ? "Suche …" : status === "off" || status === "error" ? "Erneut suchen" : "Gerät suchen"}</button>
        </div>
      ) : (
        <>
          <div className="row between">
            <div>
              <div className="slot-name">{name}</div>
              <div className="muted small">verbunden seit {since != null ? fmtTime(since) : ""}</div>
            </div>
            <div className="day-btn on" style={{ flexDirection: "column", padding: "0.5rem 1rem" }}>
              <span className="day muted small">Herzrate</span>
              <span className="day-role" style={{ fontSize: "1.6rem" }}>{hr ?? "–"}</span>
            </div>
          </div>
          <div className="muted small">
            {count} Pakete{range ? ` · ${range.min} bis ${range.max} bpm` : ""}{lastAt != null ? ` · letztes Paket ${fmtTime(lastAt)}` : ""}
            {count === 0 && " · noch kein Messwert angekommen — manche Uhren senden erst nach Start einer Trainingseinheit"}
          </div>
          <div className="row wrap">
            <button className="btn ghost" onClick={stop}>Trennen</button>
          </div>
        </>
      )}
      {status === "error" && err && <div className="note small">{err}</div>}
      {status === "off" && err && <div className="note small">{err}</div>}
    </div>
  );
}

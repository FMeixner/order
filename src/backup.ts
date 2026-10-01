/* Automatische Sicherung außerhalb des Browserspeichers.
   Bevorzugt: eine selbst gewählte Datei, die bei jeder Sicherung überschrieben wird (File System Access API,
   z. B. Chrome und Edge am Rechner). Der Zugriff auf die Datei wird in IndexedDB gemerkt; die Datei selbst
   überlebt das Löschen der Browserdaten. Wo das fehlt (die meisten Handys): Download mit festem Namen.
   Ein Browser kann eine Datei im Download-Ordner nicht überschreiben, er hängt dann (1), (2) … an. */
import type { AppState } from "./types";

export type AutoBackup = "off" | "session" | "week";
export const AUTO_FILE = "order-sicherung.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handle = any;

export const canPickFile = () => typeof window !== "undefined" && "showSaveFilePicker" in window;

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("order-backup", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(key: string): Promise<Handle | undefined> {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction("kv").objectStore("kv").get(key);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(undefined);
    });
  } catch { return undefined; }
}
async function idbSet(key: string, v: Handle | null): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((res) => {
      const tx = d.transaction("kv", "readwrite");
      if (v == null) tx.objectStore("kv").delete(key); else tx.objectStore("kv").put(v, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* egal */ }
}

export const backupFile = () => idbGet("file");
export const forgetBackupFile = () => idbSet("file", null);

const json = (s: AppState) => JSON.stringify(s, null, 1);

async function writeTo(h: Handle, s: AppState): Promise<boolean> {
  try {
    let perm = await h.queryPermission?.({ mode: "readwrite" });
    if (perm !== "granted") perm = await h.requestPermission?.({ mode: "readwrite" });
    if (perm !== "granted") return false;
    const w = await h.createWritable();
    await w.write(json(s));
    await w.close();
    return true;
  } catch { return false; }
}

/** Datei wählen und sofort hineinsichern. Gibt den Dateinamen zurück. */
export async function chooseBackupFile(s: AppState): Promise<string | null> {
  try {
    const h = await (window as any).showSaveFilePicker({ suggestedName: AUTO_FILE, types: [{ description: "Order-Sicherung", accept: { "application/json": [".json"] } }] });
    await idbSet("file", h);
    return (await writeTo(h, s)) ? h.name : null;
  } catch { return null; }
}

export function download(s: AppState, name: string): void {
  const blob = new Blob([json(s)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Nach einer abgeschlossenen Einheit: sichern, wenn fällig. Gibt "file", "download" oder null zurück. */
export async function autoBackup(s: AppState, today: string): Promise<"file" | "download" | null> {
  const mode: AutoBackup = s.autoBackup ?? "week";
  if (mode === "off") return null;
  const h = await backupFile();
  // Eigene Datei: wird überschrieben, deshalb ruhig nach jeder Einheit
  if (h && (await writeTo(h, s))) return "file";
  const due = mode === "session" || !s.lastBackup || days(s.lastBackup, today) >= 7;
  if (!due) return null;
  download(s, AUTO_FILE);
  return "download";
}

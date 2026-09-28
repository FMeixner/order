import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 baut eine einzelne HTML-Datei (Vorschau, Weitergabe per Datei).
// Sonst: normale Ausgabe mit Service Worker, z. B. für GitHub Pages.
const single = process.env.SINGLE === "1";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  base: "./",
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __REPO_URL__: JSON.stringify(process.env.REPO_URL ?? pkg.repository?.url ?? ""),
    __SINGLE__: JSON.stringify(single),
  },
  build: { outDir: single ? "dist-single" : "dist", emptyOutDir: true },
  test: { environment: "node" },
});

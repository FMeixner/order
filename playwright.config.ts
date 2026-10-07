import { defineConfig } from "@playwright/test";

/* Durchklick-Tests gegen den fertigen Build (npm run build vorher). Lokal mit vorinstalliertem Chromium: PW_CHROMIUM=/pfad/zu/chrome */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:4173/",
    viewport: { width: 390, height: 900 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI },
});

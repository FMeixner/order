import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { fixture, seed, stored } from "./fixture";

test("Einheit abschließen: Satz eintragen, abschließen, im Log", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  // Unabhängig vom Wochentag: den Krafttag wählen
  await page.locator(".day-btn").filter({ hasText: "Kraft A" }).click();
  const reps = page.getByLabel("Wiederholungen Satz 1").first();
  await reps.fill("10");
  await page.getByRole("button", { name: "Satz 1" }).first().click();
  await page.getByRole("button", { name: "Einheit abschließen" }).click();
  // Die Ansicht springt zur nächsten offenen Einheit; der erledigte Tag trägt ein Häkchen
  await expect(page.locator(".day-btn.done")).toHaveCount(1);
  const st = await stored(page);
  expect(st.sessions.filter((s) => s.done).length).toBe(1);
  await page.getByRole("button", { name: "Almanach" }).click();
  await page.getByRole("radio", { name: "Log" }).click();
  await expect(page.getByText("1 abgeschlossene Einheiten")).toBeVisible();
});

test("Freie Jagd: Rundentracker stoppt die Uhr, Wieder aufnehmen speichert nur die neue Zeit", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Almanach" }).click();
  await page.getByRole("radio", { name: "Bestien" }).click();
  await page.getByPlaceholder("Suchen: Name oder Übung").fill("Huldra");
  await page.locator(".collapse-head").filter({ hasText: "Huldra" }).click();
  await page.getByRole("button", { name: /^Jagen/ }).first().click();
  await page.getByRole("button", { name: /Stoppuhr/ }).click();
  const rounds = page.locator(".rounds button");
  const n = await rounds.count();
  expect(n).toBe(3);
  await page.waitForTimeout(1200);
  for (let i = 0; i < n; i++) await rounds.nth(i).click();
  await expect(page.getByText(/Besiegt und eingetragen/)).toBeVisible();
  const first = (await stored(page)).beastTimes["ng-fjalar"];
  expect(first?.length).toBe(1);
  await page.getByRole("button", { name: /Wieder aufnehmen/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Stopp/ }).click();
  const after = (await stored(page)).beastTimes["ng-fjalar"];
  expect(after.length).toBe(1);
  expect(after[0].seconds).toBeGreaterThan(first[0].seconds);
});

test("Kurztag: im Plan wählen, Bericht sehen, gespeichert", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Plan" }).click();
  await page.locator(".block-row").first().click();
  const sel = page.locator("select").filter({ has: page.locator("option", { hasText: "Kein Kurztag" }) });
  await sel.selectOption({ label: "Oberkörper und Gesäß" });
  await expect(page.getByText(/^Bleibt:/)).toBeVisible();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/Kurztag: Oberkörper und Gesäß/)).toBeVisible();
  expect((await stored(page)).plan[0].shortRole).toBe("arme_schultern");
});

test("Sicherung: speichern und wieder laden", async ({ page }, info) => {
  const st = fixture();
  st.sessions = [{ id: "x", date: st.plan[0].start, blockId: "b1", focusId: "assassin", week: 1, role: "kraft_a", profileId: "g", entries: {}, drills: {}, menu: {}, done: true }];
  await seed(page, st);
  await page.goto("./");
  await page.getByRole("button", { name: "Setup" }).click();
  await page.locator(".collapse-head").filter({ hasText: "Sichern und Wiederherstellen" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Sichern (.json)" }).click()]);
  const file = info.outputPath("backup.json");
  await dl.saveAs(file);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(saved.sessions.length).toBe(1);
  // Speicher leeren, Sicherung zurückspielen
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("order:v1")!); s.sessions = []; localStorage.setItem("order:v1", JSON.stringify(s)); });
  await page.reload();
  await page.getByRole("button", { name: "Setup" }).click();
  await page.locator(".collapse-head").filter({ hasText: "Sichern und Wiederherstellen" }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText("Sicherung geladen.")).toBeVisible();
  expect((await stored(page)).sessions.length).toBe(1);
});

test("Warm-up: nach links startet rechts von selbst", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".collapse-head").filter({ hasText: "Warm-up" }).first().click();
  const left = page.locator(".drill-group").filter({ hasText: "Links" }).locator(".set-btn").first();
  test.skip((await left.count()) === 0, "kein Seiten-Drill im Warm-up dieses Tages");
  await left.click();
  await page.locator(".timerbar button", { hasText: "Weiter" }).click(); // Vorlauf
  await page.locator(".timerbar button", { hasText: "Weiter" }).click(); // links fertig
  await expect(page.locator(".timerbar-label")).toContainText("Rechts");
});

test("Schweißfreier Ort: keine Bestie am Tag", async ({ page }) => {
  const st = fixture();
  st.equipment = st.equipment.map((e) => ({ ...e, sweatFree: true }));
  await seed(page, st);
  await page.goto("./");
  for (const day of await page.locator(".day-btn").all()) {
    await day.click();
    await expect(page.locator(".card.beast")).toHaveCount(0);
  }
});

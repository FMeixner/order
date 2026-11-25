import { expect, test } from "@playwright/test";
import { fixture, seed, stored } from "./fixture";

test("Ordensstart: Schwerpunkt bestätigen, Seiten ausgleichen, Samstag Bestie oder Grundlage (1.51)", async ({ page }) => {
  const st = fixture("slayer");
  st.schedule = { Mo: "g", Di: "g", Mi: null, Do: "g", Fr: "g", Sa: "g", So: null } as typeof st.schedule;
  st.user = { ...st.user, skills: ["pullup"] };
  await seed(page, st);
  await page.goto("./");
  await expect(page.getByText("Ordensstart · 1 von 2")).toBeVisible();
  await expect(page.getByText(/trainiert der Orden schon/).first()).toBeVisible();
  await page.screenshot({ path: "test-results/interview-1.png", fullPage: true });
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("radio", { name: "Ja, Seiten ausgleichen" }).click();
  await page.screenshot({ path: "test-results/interview-2.png" });
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByText("Ordensstart · 1 von 2")).toHaveCount(0);
  const b = (await stored(page)).plan[0];
  expect(b.interviewed).toBe(true);
  expect(b.unilateral).toBe(true);
  // Freitag: Beinbeuger einseitig
  await page.locator(".day-btn").filter({ hasText: "Kraft Kontrast" }).first().click();
  await expect(page.getByText("Single-Leg Seated Leg Curl").first()).toBeVisible();
  // Samstag: Bestie oder 30 Min lockere Grundlage
  await page.locator(".day-btn").filter({ hasText: "Wochenend-Kondition" }).first().click();
  await page.getByRole("radio", { name: "30 Min Lockerer Lauf" }).click();
  await expect(page.getByText("Lockerer Lauf").first()).toBeVisible();
  await page.screenshot({ path: "test-results/samstag.png", fullPage: true });
  expect(Object.values((await stored(page)).beastAlt ?? {})).toEqual([true]);
});

test("Nach kurzer Woche bleibt der Wechsel zum Wiedereinstieg (1.51.9)", async ({ page }) => {
  const st = fixture("slayer");
  st.schedule = { Mo: "g", Di: "g", Mi: null, Do: "g", Fr: "g", Sa: "g", So: null } as typeof st.schedule;
  st.plan[0].interviewed = true;
  st.roleOrder = { b1: ["kraft_a", "arme_kurz", "home_hypertrophie", "kraft_contrast", "wochenende_kondition"] };
  st.dayAdj = { "b1:1:kraft_a": { skip: true }, "b1:1:arme_kurz": { skip: true }, "b1:1:home_hypertrophie": { short: true }, "b1:1:kraft_contrast": { short: true } };
  st.shortWeek = { "b1:1": "ja" };
  await seed(page, st);
  await page.goto("./");
  await page.getByRole("button", { name: "Stattdessen Wiedereinstieg" }).click();
  await expect(page.getByText(/^Wiedereinstieg ab der nächsten Einheit/)).toBeVisible();
  const s = await stored(page);
  expect(s.reentry?.from).toBeTruthy();
  expect(s.dayAdj?.["b1:1:home_hypertrophie"]?.short).toBeUndefined();
});

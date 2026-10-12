import { expect, test } from "@playwright/test";
import { seed } from "./fixture";
for (const w of [360, 375, 390, 430]) test(`vier Sätze in einer Zeile bei ${w}px`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Kraft A" }).click();
  const fits = page.locator(".set-pills.fit");
  const n = await fits.count();
  let four = 0;
  for (let i = 0; i < n; i++) {
    const tops = await fits.nth(i).locator(".set-pill").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    if (tops.length === 4) four++;
    expect(new Set(tops).size).toBe(1);
    const over = await fits.nth(i).evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    expect(over).toBe(false);
  }
  expect(four).toBeGreaterThan(0);
});

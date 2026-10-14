import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { fixture, seed, stored } from "./fixture";

test("Einheit abschließen: Satz eintragen, abschließen, im Log", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  // Unabhängig vom Wochentag: den Krafttag wählen
  await page.locator(".day-btn").filter({ hasText: "Kraft A" }).click();
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

test("Kurz: spontan für heute, als Wochentag merken, Kraftübungen weniger", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Oberkörper und Gesäß" }).click();
  const before = await page.locator(".slot-name").count();
  await page.getByRole("button", { name: "Anpassen für heute" }).click();
  await page.getByRole("button", { name: "Kurz", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kurz", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/etwa \d+ Min · Kurz/)).toBeVisible();
  expect(await page.locator(".slot-name").count()).toBeLessThan(before);
  await page.getByText(/^Kurz für jeden .* fixieren$/).click();
  const st = await stored(page);
  expect(Object.values(st.dayFlags ?? {}).filter((f) => f?.short).length).toBe(1);
});

test("Deine Woche: Einheiten tauschen, fixierte Tage nur als Hinweis, Ordenssymbol", async ({ page }) => {
  const st = fixture();
  st.dayFlags = { Fr: { short: true } };
  await seed(page, st);
  await page.goto("./");
  await page.getByRole("button", { name: "Plan" }).click();
  await page.getByRole("button", { name: /Deine Woche/ }).click();
  await expect(page.locator(".week-fixed")).toHaveText("kurz");
  await expect(page.getByRole("button", { name: /^Kurz am / })).toHaveCount(0);
  // Einheit des ersten Tages auf die des zweiten setzen: die beiden tauschen
  const roleSel = page.locator("select.week-role");
  const second = await roleSel.nth(1).inputValue();
  const first = await roleSel.nth(0).inputValue();
  await roleSel.nth(0).selectOption(second);
  await expect(roleSel.nth(1)).toHaveValue(first);
  await expect(page.locator(".stack-card .order-mark").first()).toBeAttached();
});

test("Plan: Phase antippen zeigt den Orden, Bearbeiten erst im zweiten Schritt", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Plan" }).click();
  await page.locator(".sc-name").first().click();
  await expect(page.getByRole("dialog")).toContainText("Assassin");
  await expect(page.getByRole("button", { name: "Speichern" })).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Phase bearbeiten" }).click();
  await expect(page.getByRole("button", { name: "Speichern" })).toBeVisible();
});

test("Plan als Stapel: Woche länger, Testwoche am Ende, Phase anhängen mit Empfehlung, Bearbeiten-Seite", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Plan" }).click();
  const card = page.locator(".stack-card").first();
  await expect(card.locator(".sc-weeks")).toHaveText("10 Wo.");
  await card.getByRole("button", { name: "Eine Woche länger" }).click();
  await expect(card.locator(".sc-weeks")).toHaveText("11 Wo.");
  await card.getByRole("button", { name: "Phase bearbeiten" }).click();
  await page.getByRole("dialog").getByText("Testwoche am Ende").click();
  await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click();
  await expect(page.locator(".stack-card.test")).toHaveCount(1);
  await expect(card.getByRole("img", { name: "mit Testwoche am Ende" })).toBeVisible();
  await expect(card.locator(".sc-weeks")).toHaveText("11 Wo.");
  // Vorschau der Testwoche
  await page.locator(".stack-card.test").click();
  await expect(page.getByRole("dialog")).toContainText("Excalibur-Cup");
  await page.getByRole("dialog").getByRole("button", { name: "Schließen" }).click();
  await page.getByRole("button", { name: "+ Phase anhängen" }).click();
  const next = page.locator(".stack-card:not(.test)").nth(1);
  await expect(next.getByRole("img", { name: "empfohlen" })).toBeVisible();
  await next.getByRole("button", { name: "Phase bearbeiten" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.locator(".sc-alt .tag.rec")).toHaveText("empfohlen");
  await expect(dlg.getByRole("button", { name: "In zwei Phasen teilen" })).toBeVisible();
  await dlg.getByRole("button", { name: "Abbrechen" }).click();
  const st = await stored(page);
  expect(st.plan.length).toBe(3);
  expect(st.plan.some((b) => b.focusId === "test")).toBe(true);
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

test("Leise an allen Tagen (alter schweißfreier Ort): nur leise Bestien", async ({ page }) => {
  const st = fixture();
  st.equipment = st.equipment.map((e) => ({ ...e, sweatFree: true }));
  await seed(page, st);
  await page.goto("./");
  for (const day of await page.locator(".day-btn").all()) {
    await day.click();
    for (const card of await page.locator(".card.beast").all()) await expect(card).not.toContainText(/jump|burpee|split lunge|sprint|\brun\b/i);
  }
});

test("Warm-up anpassen: entfernen und hinzufügen, dauerhaft für den Tag", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Kraft A" }).click();
  await page.locator(".collapse-head").filter({ hasText: "Warm-up" }).click();
  const names = page.locator(".collapse.amber").first().locator(".drill-name");
  const n = await names.count();
  const first = await names.first().innerText();
  await page.getByRole("button", { name: "Warm-up bearbeiten", exact: true }).click();
  await page.getByRole("button", { name: `${first} entfernen` }).click();
  await expect(names).toHaveCount(n - 1);
  await page.getByLabel("Warm-up: Übung hinzufügen").selectOption({ index: 1 });
  await expect(names).toHaveCount(n);
  const st = await stored(page);
  const ed = st.drillEdits["assassin:kraft_a"].wu;
  expect(ed.off.length).toBe(1);
  expect(ed.add.length).toBe(1);
  await page.getByRole("button", { name: "Auf Vorgabe des Ordens zurücksetzen" }).first().click();
  expect((await stored(page)).drillEdits?.["assassin:kraft_a"]).toBeUndefined();
});

test("Intensiv: Schalter im Anpassen-Menü, löst Leise, Hinweis in der Einheit", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Schwert und Bestie" }).click();
  await page.getByRole("button", { name: "Anpassen für heute" }).click();
  await page.getByRole("button", { name: "Leise", exact: true }).click();
  await page.getByRole("button", { name: "Intensiv", exact: true }).click();
  await expect(page.getByRole("button", { name: "Leise", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(/etwa \d+ Min · Intensiv/)).toBeVisible();
  const st = await stored(page);
  expect(Object.values(st.energy ?? {})).toContain(true);
});

test("Bestien bleiben nach dem ersten Klick fest, auch wenn sich das Warm-up ändert", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Bonus" }).click();
  await page.getByRole("button", { name: "Satz 1" }).first().click();
  const pins = async () => {
    const st = await stored(page);
    const s = st.sessions.find((x: { role: string }) => x.role === "bonus");
    return JSON.stringify(s?.beastRuns ?? null);
  };
  const before = await pins();
  expect(Object.keys(JSON.parse(before)).length).toBe(2);
  // Warm-up leeren: ändert die Zeitschätzung, die Bestien dürfen sich nicht ändern
  await page.locator(".collapse-head").filter({ hasText: "Warm-up" }).click();
  await page.getByRole("button", { name: "Warm-up bearbeiten", exact: true }).click();
  const rm = page.locator(".drill-remove");
  while (await rm.count()) await rm.first().click();
  await page.getByRole("button", { name: "Satz 2" }).first().click();
  expect(await pins()).toBe(before);
});

test("Satz antippen speichert das Ziel, „Zu schwer“ fragt den letzten Satz", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await page.locator(".day-btn").filter({ hasText: "Kraft A" }).click();
  const card = page.locator(".slot").filter({ has: page.getByText("Cable Lateral Raise", { exact: true }) });
  const dose = (await card.locator(".slot-dose strong").innerText()).match(/× (\d+)/)![1];
  for (let i = 1; i <= 3; i++) await card.getByRole("button", { name: `Satz ${i}`, exact: true }).click();
  let e = (await stored(page)).sessions[0].entries;
  const key = Object.keys(e).find((k) => k.includes("Cable Lateral Raise"))!;
  expect(e[key].sets.map((x: { reps: number }) => x.reps)).toEqual([+dose, +dose, +dose]);
  await card.getByRole("button", { name: "Zu schwer" }).click();
  await card.getByLabel("Geschaffte Wiederholungen").fill("9");
  e = (await stored(page)).sessions[0].entries;
  expect(e[key].sets.map((x: { reps: number }) => x.reps)).toEqual([+dose, +dose, 9]);
  await card.getByRole("button", { name: "Sehr leicht" }).click();
  e = (await stored(page)).sessions[0].entries;
  expect(e[key].sets.map((x: { reps: number }) => x.reps)).toEqual([+dose + 2, +dose + 2, +dose + 2]);
  // Fertig: Die Übung klappt nach kurzer Zeit ein, Antippen öffnet sie wieder
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  const done = page.getByRole("button", { name: "Cable Lateral Raise erledigt, aufklappen" });
  await expect(done).toBeVisible({ timeout: 6000 });
  await done.click();
  await expect(card.getByRole("button", { name: "Sehr leicht" })).toBeVisible();
});

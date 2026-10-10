import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("./");
});
async function controls(page: any) {
  if (await page.getByRole("button", { name: "☷ Controls" }).isVisible())
    await page.getByRole("button", { name: "☷ Controls" }).click();
}
test("loads without runtime errors or external tiles", async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.reload();
  await expect(
    page.getByRole("application", { name: "Interactive world map" }),
  ).toBeVisible();
  await expect(page.locator(".world-map path").first()).toHaveAttribute(
    "d",
    /M/,
  );
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("asteroid presets, inputs, bookmark reload and extreme values", async ({
  page,
}) => {
  await controls(page);
  await page
    .getByLabel("Asteroid preset")
    .selectOption("Chicxulub · illustrative");
  await controls(page);
  await expect(page.getByLabel("Diameter", { exact: true })).toHaveValue(
    "10000",
  );
  await page.getByLabel("Diameter", { exact: true }).fill("1000000");
  await page.getByRole("button", { name: "＋ Bookmark scenario" }).click();
  await page.reload();
  await controls(page);
  await expect(page.getByLabel("Diameter", { exact: true })).toHaveValue(
    "1000000",
  );
  await expect(page.locator(".metrics")).not.toContainText(/NaN|Infinity/);
  await expect(page.locator(".model-status")).toContainText(
    "Beyond regional scaling",
  );
});
test("energy conversion responds and has no damage overlay", async ({
  page,
}) => {
  await controls(page);
  await page.getByRole("button", { name: "⚛ Nuclear energy" }).click();
  await page.getByLabel("Energy preset").selectOption("Hypothetical 1 Gt|1|Gt");
  await expect(page.locator(".metric").first()).toContainText("4.184e+18");
});
test("map zoom, selection, panning and ruler", async ({ page }) => {
  const map = page.locator(".world-map");
  const group = map.locator(":scope > g");
  const before = await group.getAttribute("transform");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(group).not.toHaveAttribute("transform", before!);
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.35, y: box.height * 0.4 } });
  await page.getByRole("button", { name: "⌁ Ruler" }).click();
  await map.click({ position: { x: box.width * 0.35, y: box.height * 0.4 } });
  await map.click({ position: { x: box.width * 0.65, y: box.height * 0.6 } });
  await expect(page.locator(".ruler-note")).toContainText(
    "Great-circle distance",
  );
  const p = await group.getAttribute("transform");
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 130, { steps: 6 });
  await page.mouse.up();
  await expect(group).not.toHaveAttribute("transform", p!);
});
test("compare, export and theme controls", async ({ page }) => {
  await page.getByRole("button", { name: "⇄ Compare" }).click();
  await expect(page.locator(".world-map")).toHaveCount(2);
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ JSON" }).click();
  expect((await download).suggestedFilename()).toBe(
    "impact-atlas-results.json",
  );
  await page.getByRole("button", { name: "Close comparison" }).click();
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Map PNG" }).click();
  expect((await png).suggestedFilename()).toBe("impact-atlas-map.png");
});
test("share URL restores scenario", async ({ page, context }) => {
  await controls(page);
  await page.getByLabel("Scenario name").fill("Restore test");
  await page.getByLabel("Diameter", { exact: true }).fill("1234");
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    history.replaceState(
      null,
      "",
      "#s=" + encodeURIComponent(localStorage.getItem("impact-atlas:last")!),
    ),
  );
  await page.reload();
  await controls(page);
  await expect(page.getByLabel("Scenario name")).toHaveValue("Restore test");
  await expect(page.getByLabel("Diameter", { exact: true })).toHaveValue(
    "1234",
  );
});
test("mobile has no horizontal overflow", async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("production assets load beneath repository subpath and offline reload works", async ({
  page,
  context,
}) => {
  await expect(page).toHaveURL(/\/impact-atlas\//);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".world-map")).toBeVisible();
  await context.setOffline(false);
});

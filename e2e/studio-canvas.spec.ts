import { test, expect } from "@playwright/test";

test("create a design, add a layer manually, save a version, and export a PNG", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "New design" }).click();

  await expect(page).toHaveURL(/\/studio\/[^/]+$/, { timeout: 15_000 });

  // Manual layer creation (text/shape) doesn't touch the agent or Higgsfield at
  // all, so this exercises the canvas/version/export pipeline fully offline.
  await page.getByTitle("Add text").click();
  await expect(page.getByText("New headline")).toBeVisible();

  await page.getByRole("button", { name: /Save version/ }).click();
  await expect(page.getByText("Version saved.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

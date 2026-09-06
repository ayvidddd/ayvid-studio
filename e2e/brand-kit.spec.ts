import { test, expect } from "@playwright/test";

test("create/edit the workspace Brand Kit", async ({ page }) => {
  await page.goto("/brand-kit");

  await expect(page.getByRole("heading", { name: /Brand Kit/ })).toBeVisible();

  await page.getByLabel("Brand name").fill("Ayvid Test Brand");
  await page.getByLabel("Tone of voice").fill("Confident, playful, never corporate-sounding.");
  await page.getByLabel("Banned words").fill("cheap, guaranteed");
  await page.getByRole("button", { name: "Save Brand Kit" }).click();

  await expect(page.getByText("Brand Kit saved.")).toBeVisible();

  // Reload to confirm the details actually persisted server-side, not just in local state.
  await page.reload();
  await expect(page.getByLabel("Brand name")).toHaveValue("Ayvid Test Brand");
  await expect(page.getByLabel("Banned words")).toHaveValue("cheap, guaranteed");
});

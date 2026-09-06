import { test as setup, expect } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/user.json";

/**
 * Signs up a fresh user via the credentials form and saves the resulting
 * session so every other spec starts already authenticated. A new random
 * email is used per run so the suite is safely re-runnable against a
 * persistent test database.
 */
setup("sign up a fresh test user", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/brand-kit$/, { timeout: 15_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});

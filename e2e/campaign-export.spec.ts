import { test, expect } from "@playwright/test";

/**
 * Campaign creation is agent-only (the `create_campaign` tool), so this also
 * needs a real ANTHROPIC_API_KEY — see the note in agent-chat.spec.ts.
 * Higgsfield/export itself stay fully offline (mock mode + client-side
 * canvas/zip rendering).
 */
test.skip(!process.env.ANTHROPIC_API_KEY, "Requires a real ANTHROPIC_API_KEY — no offline mock for the agent chat.");

test("ask the Campaign Strategist for a campaign, then export it as a ZIP", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/studio");
  await page.getByRole("button", { name: "New design" }).click();
  await expect(page).toHaveURL(/\/studio\/[^/]+$/, { timeout: 15_000 });

  await page.getByPlaceholder("Message the Designer…").fill(
    "Set up a campaign called 'E2E Launch' promoting our new protein bar across Meta, TikTok, LinkedIn, and Google Display.",
  );
  await page.keyboard.press("Enter");

  await expect(page.getByText(/create campaign: done/)).toBeVisible({ timeout: 90_000 });

  await page.goto("/studio");
  await page.getByRole("link", { name: "E2E Launch" }).click();
  await expect(page).toHaveURL(/\/studio\/campaigns\/[^/]+$/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

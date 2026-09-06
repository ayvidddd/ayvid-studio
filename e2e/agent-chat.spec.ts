import { test, expect } from "@playwright/test";

/**
 * These flows go through a real Claude API call (Vercel AI SDK `streamText`,
 * see src/app/api/studio/[designId]/chat/route.ts) — unlike Higgsfield, there
 * is no offline mock for the model itself, so these only run with a real
 * ANTHROPIC_API_KEY configured. Higgsfield stays in mock mode regardless
 * (HIGGSFIELD_MODE=mock), so no generation credits are spent.
 */
test.skip(!process.env.ANTHROPIC_API_KEY, "Requires a real ANTHROPIC_API_KEY — no offline mock for the agent chat.");

test.describe.serial("Creative Director chat", () => {
  test.setTimeout(120_000);

  test("generate an image from a prompt and see it land on the canvas", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: "New design" }).click();
    await expect(page).toHaveURL(/\/studio\/[^/]+$/, { timeout: 15_000 });

    await page.getByPlaceholder("Message the Designer…").fill(
      "Generate a single hero image of a red sneaker on a marble counter.",
    );
    await page.keyboard.press("Enter");

    await expect(page.getByText(/generate image: done/)).toBeVisible({ timeout: 90_000 });
  });

  test("ask for an edit and see the edited version replace/join the canvas", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("link", { name: /Untitled design/ }).first().click();
    await expect(page).toHaveURL(/\/studio\/[^/]+$/, { timeout: 15_000 });

    await page.getByPlaceholder("Message the Designer…").fill("Make the background darker and more moody.");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/edit image: done/)).toBeVisible({ timeout: 90_000 });
  });

  test("generate a short video from the image", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("link", { name: /Untitled design/ }).first().click();
    await expect(page).toHaveURL(/\/studio\/[^/]+$/, { timeout: 15_000 });

    await page.getByPlaceholder("Message the Designer…").fill(
      "Animate that image into a short video with a slow zoom in.",
    );
    await page.keyboard.press("Enter");

    await expect(page.getByText(/generate video: done/)).toBeVisible({ timeout: 90_000 });
  });
});

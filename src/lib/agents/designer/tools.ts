import "server-only";
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { runAgentTool } from "@/lib/agents/harness";
import { loadBrandKitContext, formatBrandKitForPrompt } from "@/lib/agents/context";
import { createGenerationJob } from "@/lib/higgsfield/jobs";
import { waitForGenerationJob } from "./generation-wait";

const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "16:9", "9:16", "21:9"] as const;

const NOT_YET_AVAILABLE = (feature: string, workaround: string) => ({
  ok: true as const,
  data: {
    available: false,
    message: `${feature} isn't available yet — Higgsfield hasn't published a public API endpoint for it. ${workaround}`,
  },
});

export function createDesignerTools(workspaceId: string): ToolSet {
  return {
    generate_image: tool({
      description:
        "Generate a new image from a text prompt. Use this to create the first version of a background, hero shot, product photo, or illustration. The result lands as a new layer on the canvas.",
      inputSchema: z.object({
        prompt: z.string().min(1).max(2000).describe("A visually specific description: subject, setting, lighting, composition, mood."),
        aspectRatio: z.enum(ASPECT_RATIOS).default("1:1").describe("Output aspect ratio."),
      }),
      execute: async ({ prompt, aspectRatio }) =>
        runAgentTool({ name: "generate_image", workspaceId, creditCost: 1 }, async () => {
          const job = await createGenerationJob({
            kind: "IMAGE",
            workspaceId,
            modelKey: "soul-standard",
            input: { prompt, numImages: 1, resolution: "2K", aspectRatio },
          });
          return waitForGenerationJob(job.id);
        }),
    }),

    edit_image: tool({
      description:
        "Regenerate an existing image from a new prompt describing the whole desired result. Higgsfield has no masked region-only edit — describe the full end state, not just the change.",
      inputSchema: z.object({
        imageUrl: z.string().url().describe("URL of the image to edit — from a prior generate_image result or an existing canvas layer."),
        prompt: z.string().min(1).max(2000).describe("What the edited image should look like, in full."),
      }),
      execute: async ({ imageUrl, prompt }) =>
        runAgentTool({ name: "edit_image", workspaceId, creditCost: 1 }, async () => {
          const job = await createGenerationJob({
            kind: "EDIT",
            workspaceId,
            modelKey: "reve-edit",
            input: { imageUrl, prompt, numImages: 1 },
          });
          return waitForGenerationJob(job.id);
        }),
    }),

    apply_brand_kit: tool({
      description:
        "Re-fetch this workspace's current Brand Kit (tone of voice, fonts, palette, banned words). Call this if the Brand Kit may have changed since the conversation started.",
      inputSchema: z.object({}),
      execute: async () =>
        runAgentTool({ name: "apply_brand_kit", workspaceId }, async () => {
          const brandKit = await loadBrandKitContext(workspaceId);
          return { brandKit, summary: formatBrandKitForPrompt(brandKit) };
        }),
    }),

    remove_background: tool({
      description: "Remove the background from an image. Not yet available via Higgsfield's public API.",
      inputSchema: z.object({ imageUrl: z.string().url() }),
      execute: async () =>
        NOT_YET_AVAILABLE("Background removal", "Try generate_image with an explicit plain or transparent-style background instead."),
    }),

    upscale: tool({
      description: "Upscale an image to a higher resolution. Not yet available via Higgsfield's public API.",
      inputSchema: z.object({ imageUrl: z.string().url() }),
      execute: async () =>
        NOT_YET_AVAILABLE("Upscaling", "Try generate_image again at \"4K\" resolution instead."),
    }),

    outpaint: tool({
      description:
        "Extend an image beyond its original borders, e.g. to change aspect ratio while keeping the subject. Not yet available via Higgsfield's public API.",
      inputSchema: z.object({ imageUrl: z.string().url(), targetAspectRatio: z.string() }),
      execute: async () =>
        NOT_YET_AVAILABLE("Outpainting", "Try generate_image with a fresh prompt at the target aspect ratio instead."),
    }),
  };
}

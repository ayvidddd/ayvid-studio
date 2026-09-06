import "server-only";
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { runAgentTool } from "@/lib/agents/harness";
import { createGenerationJob } from "@/lib/higgsfield/jobs";
import { waitForGenerationJob } from "@/lib/agents/designer/generation-wait";
import { checkJobStatus } from "@/lib/agents/job-status";
import { MOTION_PRESETS } from "./motions";

export function createVideoProducerTools(workspaceId: string): ToolSet {
  return {
    generate_video: tool({
      description:
        "Animate an existing image into a short video. Describe camera movement in the prompt itself — it's the only way to control it. The result appears in the Studio's video preview panel.",
      inputSchema: z.object({
        imageUrl: z.string().url().describe("URL of the source image — usually one just created with generate_image."),
        prompt: z.string().min(1).max(2000).describe("What happens in the clip, including camera movement."),
        duration: z.union([z.literal(5), z.literal(10)]).default(5).describe("Clip length in seconds."),
      }),
      execute: async ({ imageUrl, prompt, duration }) =>
        runAgentTool({ name: "generate_video", workspaceId, creditCost: 5 }, async () => {
          const job = await createGenerationJob({
            kind: "VIDEO",
            workspaceId,
            modelKey: "kling-v2.5-turbo-pro",
            input: { imageUrl, prompt, duration, cfgScale: 0.5 },
          });
          return waitForGenerationJob(job.id);
        }),
    }),

    list_motions: tool({
      description:
        "List curated camera-movement phrases (pan, zoom, orbit, parallax, handheld) to fold into a generate_video prompt when the user wants \"some movement\" without specifics.",
      inputSchema: z.object({}),
      execute: async () =>
        runAgentTool({ name: "list_motions", workspaceId }, async () => ({ motions: MOTION_PRESETS })),
    }),

    poll_job: tool({
      description:
        "Check the current status of a previously started generation job by ID. Use this to follow up on a video that was still rendering the last time you checked.",
      inputSchema: z.object({ jobId: z.string().min(1) }),
      execute: async ({ jobId }) =>
        runAgentTool({ name: "poll_job", workspaceId }, () => checkJobStatus(jobId, workspaceId)),
    }),

    reframe: tool({
      description:
        "Change an existing video's aspect ratio/framing. Not yet available — Higgsfield's public API has no endpoint that takes an existing video as input.",
      inputSchema: z.object({ videoUrl: z.string().url(), targetAspectRatio: z.string() }),
      execute: async () =>
        ({
          ok: true as const,
          data: {
            available: false,
            message:
              "Reframing isn't available yet — Higgsfield's public API has no video-input endpoint at all. Try generate_video again with a fresh prompt at the target aspect ratio instead.",
          },
        }),
    }),
  };
}

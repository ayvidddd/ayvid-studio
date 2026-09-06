"use server";

import { z } from "zod";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { createGenerationJob, InsufficientCreditsError } from "./jobs";
import {
  ImageGenerationInputSchema,
  ImageToVideoInputSchema,
  IMAGE_MODELS,
  VIDEO_MODELS,
  type ImageModelKey,
  type VideoModelKey,
} from "./schemas";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

const imageModelKeys = Object.keys(IMAGE_MODELS) as [ImageModelKey, ...ImageModelKey[]];
const videoModelKeys = Object.keys(VIDEO_MODELS) as [VideoModelKey, ...VideoModelKey[]];

const generateImageSchema = z.object({
  modelKey: z.enum(imageModelKeys),
  input: ImageGenerationInputSchema,
});

export async function generateImageAction(raw: unknown): Promise<ActionResult<{ jobId: string }>> {
  const parsed = generateImageSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const { workspace } = await requireCurrentWorkspace();
    const job = await createGenerationJob({
      kind: "IMAGE",
      workspaceId: workspace.id,
      modelKey: parsed.data.modelKey,
      input: parsed.data.input,
    });
    return ok({ jobId: job.id });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return fail(error.message);
    return fail("Could not start image generation. Please try again.");
  }
}

const generateVideoSchema = z.object({
  modelKey: z.enum(videoModelKeys),
  input: ImageToVideoInputSchema,
});

export async function generateVideoAction(raw: unknown): Promise<ActionResult<{ jobId: string }>> {
  const parsed = generateVideoSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const { workspace } = await requireCurrentWorkspace();
    const job = await createGenerationJob({
      kind: "VIDEO",
      workspaceId: workspace.id,
      modelKey: parsed.data.modelKey,
      input: parsed.data.input,
    });
    return ok({ jobId: job.id });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return fail(error.message);
    return fail("Could not start video generation. Please try again.");
  }
}

import { z } from "zod";

export const JobStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "failed",
  "nsfw",
  "canceled",
]);
export type HiggsfieldJobStatus = z.infer<typeof JobStatusSchema>;

export const CreateRequestResponseSchema = z.object({
  request_id: z.string(),
  status: JobStatusSchema,
  status_url: z.string().optional(),
  cancel_url: z.string().optional(),
});
export type CreateRequestResponse = z.infer<typeof CreateRequestResponseSchema>;

export const RequestStatusResponseSchema = z.object({
  request_id: z.string(),
  status: JobStatusSchema,
  error: z.string().nullable().optional(),
  payload: z
    .object({
      images: z.array(z.object({ url: z.string() })).optional(),
      video: z.object({ url: z.string() }).optional(),
    })
    .nullable()
    .optional(),
});
export type RequestStatusResponse = z.infer<typeof RequestStatusResponseSchema>;

export const WebhookPayloadSchema = z.object({
  request_id: z.string(),
  status: JobStatusSchema,
  error: z.string().nullable().optional(),
  payload: RequestStatusResponseSchema.shape.payload,
});
export type HiggsfieldWebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const ImageGenerationInputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  numImages: z.number().int().min(1).max(4).default(1),
  resolution: z.enum(["2K", "4K"]).default("2K"),
  aspectRatio: z
    .enum(["1:1", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "16:9", "9:16", "21:9"])
    .default("4:3"),
});
export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

export const ImageToVideoInputSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(4000),
  duration: z.union([z.literal(5), z.literal(10)]).default(5),
  cfgScale: z.number().min(0).max(1).default(0.5),
  negativePrompt: z.string().max(2000).optional(),
});
export type ImageToVideoInput = z.infer<typeof ImageToVideoInputSchema>;

/** Confirmed-working model endpoint paths. Extend as more are validated against the live API. */
export const IMAGE_MODELS = {
  "soul-standard": "higgsfield-ai/soul/standard",
} as const;
export const VIDEO_MODELS = {
  "kling-v2.5-turbo-pro": "kling-video/v2.5-turbo/pro/image-to-video",
} as const;

export type ImageModelKey = keyof typeof IMAGE_MODELS;
export type VideoModelKey = keyof typeof VIDEO_MODELS;

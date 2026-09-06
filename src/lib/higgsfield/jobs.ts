import "server-only";
import { prisma } from "@/lib/prisma";
import { createImageGeneration, createImageToVideo, createImageEdit, getRequestStatus } from "./client";
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  EDIT_MODELS,
  type HiggsfieldJobStatus,
  type ImageGenerationInput,
  type ImageToVideoInput,
  type ImageEditInput,
  type RequestStatusResponse,
} from "./schemas";
import { fetchAndStoreGenerationOutput, generationOutputObjectKey } from "@/lib/storage/generation-outputs";
import { GenerationStatus } from "@/generated/prisma/enums";
import type { GenerationJob } from "@/generated/prisma/client";

// Placeholder flat costs until Higgsfield's per-model cost-estimate endpoint is wired in.
const PLACEHOLDER_CREDIT_COST = { IMAGE: 1, VIDEO: 5, EDIT: 1 } as const;
type JobVariant = keyof typeof PLACEHOLDER_CREDIT_COST;

const TERMINAL_STATUSES: readonly GenerationStatus[] = [
  GenerationStatus.COMPLETED,
  GenerationStatus.FAILED,
  GenerationStatus.NSFW,
  GenerationStatus.CANCELED,
];

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits in this workspace for this generation.");
  }
}

function webhookUrl(): string | undefined {
  const base = process.env.NEXTAUTH_URL;
  return base ? `${base}/api/higgsfield/webhook` : undefined;
}

function mapStatus(status: HiggsfieldJobStatus): GenerationStatus {
  switch (status) {
    case "queued":
      return GenerationStatus.QUEUED;
    case "in_progress":
      return GenerationStatus.IN_PROGRESS;
    case "completed":
      return GenerationStatus.COMPLETED;
    case "failed":
      return GenerationStatus.FAILED;
    case "nsfw":
      return GenerationStatus.NSFW;
    case "canceled":
      return GenerationStatus.CANCELED;
  }
}

export type CreateGenerationJobParams =
  | {
      kind: "IMAGE";
      workspaceId: string;
      modelKey: keyof typeof IMAGE_MODELS;
      input: ImageGenerationInput;
      parentJobId?: string;
    }
  | {
      kind: "VIDEO";
      workspaceId: string;
      modelKey: keyof typeof VIDEO_MODELS;
      input: ImageToVideoInput;
      parentJobId?: string;
    }
  | {
      kind: "EDIT";
      workspaceId: string;
      modelKey: keyof typeof EDIT_MODELS;
      input: ImageEditInput;
      parentJobId?: string;
    };

export async function createGenerationJob(params: CreateGenerationJobParams): Promise<GenerationJob> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: params.workspaceId } });
  const estimatedCost = PLACEHOLDER_CREDIT_COST[params.kind as JobVariant];
  if (workspace.creditBalance < estimatedCost) throw new InsufficientCreditsError();

  const model =
    params.kind === "IMAGE"
      ? IMAGE_MODELS[params.modelKey]
      : params.kind === "VIDEO"
        ? VIDEO_MODELS[params.modelKey]
        : EDIT_MODELS[params.modelKey];

  const job = await prisma.generationJob.create({
    data: {
      workspaceId: params.workspaceId,
      // EDIT jobs still produce a still image; the DB only distinguishes IMAGE vs VIDEO output.
      kind: params.kind === "VIDEO" ? "VIDEO" : "IMAGE",
      model,
      prompt: params.input.prompt,
      params: params.input,
      parentJobId: params.parentJobId,
    },
  });

  const response =
    params.kind === "IMAGE"
      ? await createImageGeneration({ model, input: params.input, webhookUrl: webhookUrl() })
      : params.kind === "VIDEO"
        ? await createImageToVideo({ model, input: params.input, webhookUrl: webhookUrl() })
        : await createImageEdit({ model, input: params.input, webhookUrl: webhookUrl() });

  return prisma.generationJob.update({
    where: { id: job.id },
    data: { providerRequestId: response.request_id, status: mapStatus(response.status) },
  });
}

export async function syncJobStatus(jobId: string): Promise<GenerationJob> {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  if (TERMINAL_STATUSES.includes(job.status) || !job.providerRequestId) return job;

  const remote = await getRequestStatus(job.providerRequestId);
  const nextStatus = mapStatus(remote.status);

  if (nextStatus === GenerationStatus.COMPLETED) return completeJob(job, remote);

  if (
    nextStatus === GenerationStatus.FAILED ||
    nextStatus === GenerationStatus.NSFW ||
    nextStatus === GenerationStatus.CANCELED
  ) {
    return prisma.generationJob.update({
      where: { id: job.id },
      data: { status: nextStatus, errorMessage: remote.error ?? null },
    });
  }

  if (nextStatus !== job.status) {
    return prisma.generationJob.update({ where: { id: job.id }, data: { status: nextStatus } });
  }

  return job;
}

async function completeJob(job: GenerationJob, remote: RequestStatusResponse): Promise<GenerationJob> {
  const urls =
    remote.payload?.images?.map((image) => image.url) ??
    (remote.payload?.video ? [remote.payload.video.url] : []);

  const mimeType = job.kind === "IMAGE" ? "image/png" : "video/mp4";
  const extension = job.kind === "IMAGE" ? "png" : "mp4";

  await Promise.all(
    urls.map(async (url, index) => {
      const objectKey = generationOutputObjectKey({
        workspaceId: job.workspaceId,
        jobId: job.id,
        index,
        extension,
      });
      await fetchAndStoreGenerationOutput({ sourceUrl: url, objectKey, mimeType });
      await prisma.generationOutput.create({
        data: { jobId: job.id, storagePath: objectKey, mimeType, position: index },
      });
    }),
  );

  const cost = PLACEHOLDER_CREDIT_COST[job.kind];

  return prisma.$transaction(async (tx) => {
    await tx.workspace.update({ where: { id: job.workspaceId }, data: { creditBalance: { decrement: cost } } });
    return tx.generationJob.update({ where: { id: job.id }, data: { status: GenerationStatus.COMPLETED, creditsUsed: cost } });
  });
}

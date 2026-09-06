import "server-only";
import { prisma } from "@/lib/prisma";
import { syncJobStatus } from "@/lib/higgsfield/jobs";
import { INITIAL_POLL_DELAY_MS, nextPollDelayMs } from "@/lib/higgsfield/poll";
import { GenerationStatus } from "@/generated/prisma/enums";
import { signedGenerationOutputUrl } from "@/lib/storage/generation-outputs";

const TERMINAL_STATUSES: readonly GenerationStatus[] = [
  GenerationStatus.COMPLETED,
  GenerationStatus.FAILED,
  GenerationStatus.NSFW,
  GenerationStatus.CANCELED,
];

// Bounds how long a chat turn waits on a generation before telling the user
// it's still running, rather than blocking the tool call indefinitely.
const MAX_WAIT_MS = 45_000;

export interface GenerationWaitResult {
  status: GenerationStatus;
  jobId: string;
  images?: string[];
  errorMessage?: string | null;
}

/** Polls a job to completion (or a bounded timeout) and returns signed URLs for any outputs. */
export async function waitForGenerationJob(jobId: string): Promise<GenerationWaitResult> {
  const start = Date.now();
  let delay = INITIAL_POLL_DELAY_MS;
  let job = await syncJobStatus(jobId);

  while (!TERMINAL_STATUSES.includes(job.status) && Date.now() - start < MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = nextPollDelayMs(delay);
    job = await syncJobStatus(jobId);
  }

  if (job.status !== GenerationStatus.COMPLETED) {
    return { status: job.status, jobId: job.id, errorMessage: job.errorMessage };
  }

  const outputs = await prisma.generationOutput.findMany({
    where: { jobId: job.id },
    orderBy: { position: "asc" },
  });
  const images = await Promise.all(outputs.map((output) => signedGenerationOutputUrl(output.storagePath)));

  return { status: GenerationStatus.COMPLETED, jobId: job.id, images };
}

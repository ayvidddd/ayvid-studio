import "server-only";
import { syncJobStatus } from "@/lib/higgsfield/jobs";
import { GenerationStatus } from "@/generated/prisma/enums";
import { resolveJobOutputUrls } from "./job-outputs";

export interface JobStatusResult {
  status: GenerationStatus;
  jobId: string;
  images?: string[];
  errorMessage?: string | null;
}

export class JobNotInWorkspaceError extends Error {
  constructor() {
    super("That job doesn't belong to this workspace.");
  }
}

/** A single, non-blocking status check — for tools that follow up on a job started earlier in the conversation. */
export async function checkJobStatus(jobId: string, workspaceId: string): Promise<JobStatusResult> {
  const job = await syncJobStatus(jobId);
  if (job.workspaceId !== workspaceId) throw new JobNotInWorkspaceError();

  if (job.status !== GenerationStatus.COMPLETED) {
    return { status: job.status, jobId: job.id, errorMessage: job.errorMessage };
  }

  const images = await resolveJobOutputUrls(job.id);
  return { status: GenerationStatus.COMPLETED, jobId: job.id, images };
}

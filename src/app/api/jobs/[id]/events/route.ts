import { NextRequest } from "next/server";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { syncJobStatus } from "@/lib/higgsfield/jobs";
import { INITIAL_POLL_DELAY_MS, nextPollDelayMs } from "@/lib/higgsfield/poll";
import { GenerationStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES: readonly GenerationStatus[] = [
  GenerationStatus.COMPLETED,
  GenerationStatus.FAILED,
  GenerationStatus.NSFW,
  GenerationStatus.CANCELED,
];

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await context.params;

  let workspaceId: string;
  try {
    ({
      workspace: { id: workspaceId },
    } = await requireCurrentWorkspace());
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let delay = INITIAL_POLL_DELAY_MS;

      while (true) {
        let job;
        try {
          job = await syncJobStatus(jobId);
        } catch (error) {
          controller.enqueue(sseEvent({ error: error instanceof Error ? error.message : "Unknown error" }));
          controller.close();
          return;
        }

        if (job.workspaceId !== workspaceId) {
          controller.enqueue(sseEvent({ error: "Not found" }));
          controller.close();
          return;
        }

        controller.enqueue(sseEvent({ id: job.id, status: job.status, errorMessage: job.errorMessage }));

        if (TERMINAL_STATUSES.includes(job.status)) {
          controller.close();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = nextPollDelayMs(delay);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

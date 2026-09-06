import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncJobStatus } from "@/lib/higgsfield/jobs";
import { WebhookPayloadSchema } from "@/lib/higgsfield/schemas";
import { GenerationStatus } from "@/generated/prisma/enums";

const TERMINAL_STATUSES: readonly GenerationStatus[] = [
  GenerationStatus.COMPLETED,
  GenerationStatus.FAILED,
  GenerationStatus.NSFW,
  GenerationStatus.CANCELED,
];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = WebhookPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const job = await prisma.generationJob.findUnique({
    where: { providerRequestId: parsed.data.request_id },
  });

  // Unknown request_id or already-settled job: acknowledge without reprocessing
  // (Higgsfield may deliver the same terminal webhook more than once).
  if (!job || TERMINAL_STATUSES.includes(job.status)) {
    return NextResponse.json({ ok: true });
  }

  // The webhook body is just a "check now" trigger — syncJobStatus re-fetches
  // and validates the authoritative status from the Higgsfield API itself
  // rather than trusting the webhook payload directly.
  await syncJobStatus(job.id);

  return NextResponse.json({ ok: true });
}

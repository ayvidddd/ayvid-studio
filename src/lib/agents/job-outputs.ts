import "server-only";
import { prisma } from "@/lib/prisma";
import { signedGenerationOutputUrl } from "@/lib/storage/generation-outputs";

/** Signs every stored output for a job, in position order. Shared by any tool that reports on a completed job. */
export async function resolveJobOutputUrls(jobId: string): Promise<string[]> {
  const outputs = await prisma.generationOutput.findMany({
    where: { jobId },
    orderBy: { position: "asc" },
  });
  return Promise.all(outputs.map((output) => signedGenerationOutputUrl(output.storagePath)));
}

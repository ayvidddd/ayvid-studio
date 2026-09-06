import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./supabase";

export const GENERATIONS_BUCKET = "generations";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export function generationOutputObjectKey(params: {
  workspaceId: string;
  jobId: string;
  index: number;
  extension: string;
}): string {
  return `workspace/${params.workspaceId}/jobs/${params.jobId}/${params.index}-${randomUUID()}.${params.extension}`;
}

/**
 * Higgsfield only guarantees output URLs for ~7 days, so completed job
 * outputs are downloaded into our own storage immediately rather than
 * linked to directly.
 */
export async function fetchAndStoreGenerationOutput(params: {
  sourceUrl: string;
  objectKey: string;
  mimeType: string;
}): Promise<void> {
  const response = await fetch(params.sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download generation output (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const { error } = await getSupabaseAdmin()
    .storage.from(GENERATIONS_BUCKET)
    .upload(params.objectKey, buffer, { contentType: params.mimeType, upsert: false });

  if (error) throw new Error(`Failed to store generation output: ${error.message}`);
}

export async function signedGenerationOutputUrl(objectKey: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(GENERATIONS_BUCKET)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

  if (error || !data) throw new Error(`Failed to sign generation output URL: ${error?.message}`);
  return data.signedUrl;
}

import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin, BRAND_ASSETS_BUCKET } from "./supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export function brandAssetObjectKey(params: {
  workspaceId: string;
  brandKitId: string;
  filename: string;
}): string {
  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `workspace/${params.workspaceId}/${params.brandKitId}/${randomUUID()}-${safeName}`;
}

export async function uploadBrandAsset(params: {
  objectKey: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage.from(BRAND_ASSETS_BUCKET)
    .upload(params.objectKey, params.buffer, { contentType: params.mimeType, upsert: false });

  if (error) throw new Error(`Failed to upload brand asset: ${error.message}`);
}

export async function deleteBrandAsset(objectKey: string): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.from(BRAND_ASSETS_BUCKET).remove([objectKey]);
  if (error) throw new Error(`Failed to delete brand asset: ${error.message}`);
}

export async function signedBrandAssetUrl(objectKey: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BRAND_ASSETS_BUCKET)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

  if (error || !data) throw new Error(`Failed to sign brand asset URL: ${error?.message}`);
  return data.signedUrl;
}

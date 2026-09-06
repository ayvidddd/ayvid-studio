"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { extractPaletteFromImage } from "@/lib/brand-kit/palette";
import {
  brandAssetObjectKey,
  uploadBrandAsset as uploadToStorage,
  deleteBrandAsset as deleteFromStorage,
} from "@/lib/storage/brand-assets";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a #rrggbb hex color");

export const updateBrandKitDetailsSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  toneOfVoice: z.string().max(2000).nullable().optional(),
  headingFont: z.string().max(120).nullable().optional(),
  bodyFont: z.string().max(120).nullable().optional(),
  bannedWords: z.array(z.string().min(1).max(60)).max(200),
  palette: z.array(hexColor).max(10),
});

export type UpdateBrandKitDetailsInput = z.infer<typeof updateBrandKitDetailsSchema>;

export async function updateBrandKitDetails(
  input: UpdateBrandKitDetailsInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateBrandKitDetailsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const { workspace, role } = await requireCurrentWorkspace();
    if (!workspace.brandKit) return fail("This workspace has no Brand Kit yet.");
    if (role !== "OWNER" && role !== "EDITOR") return fail("You don't have permission to edit this Brand Kit.");

    const updated = await prisma.brandKit.update({
      where: { id: workspace.brandKit.id },
      data: parsed.data,
    });

    revalidatePath("/brand-kit");
    return ok({ id: updated.id });
  } catch {
    return fail("You need to be signed in to a workspace to do that.");
  }
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const assetTypeSchema = z.enum(["LOGO", "PRODUCT_PHOTO", "SAMPLE_AD"]);

export async function uploadBrandAssetAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; type: string }>> {
  const file = formData.get("file");
  const assetTypeParsed = assetTypeSchema.safeParse(formData.get("type"));

  if (!assetTypeParsed.success) return fail("Unknown asset type.");
  if (!(file instanceof File)) return fail("No file was provided.");
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return fail("Only PNG, JPEG, or WebP images are supported.");
  if (file.size > MAX_UPLOAD_BYTES) return fail("File is larger than the 8MB limit.");

  try {
    const { workspace } = await requireCurrentWorkspace();
    if (!workspace.brandKit) return fail("This workspace has no Brand Kit yet.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = brandAssetObjectKey({
      workspaceId: workspace.id,
      brandKitId: workspace.brandKit.id,
      filename: file.name,
    });

    await uploadToStorage({ objectKey, buffer, mimeType: file.type });

    const asset = await prisma.brandAsset.create({
      data: {
        brandKitId: workspace.brandKit.id,
        type: assetTypeParsed.data,
        storagePath: objectKey,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    if (assetTypeParsed.data === "LOGO") {
      const palette = await extractPaletteFromImage(buffer);
      if (palette.length > 0) {
        await prisma.brandKit.update({ where: { id: workspace.brandKit.id }, data: { palette } });
      }
    }

    revalidatePath("/brand-kit");
    return ok({ id: asset.id, type: asset.type });
  } catch {
    return fail("Upload failed. Please try again.");
  }
}

export async function deleteBrandAssetAction(assetId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { workspace } = await requireCurrentWorkspace();
    if (!workspace.brandKit) return fail("This workspace has no Brand Kit yet.");

    const asset = await prisma.brandAsset.findFirst({
      where: { id: assetId, brandKitId: workspace.brandKit.id },
    });
    if (!asset) return fail("Asset not found.");

    await deleteFromStorage(asset.storagePath);
    await prisma.brandAsset.delete({ where: { id: asset.id } });

    revalidatePath("/brand-kit");
    return ok({ id: asset.id });
  } catch {
    return fail("Could not delete this asset. Please try again.");
  }
}

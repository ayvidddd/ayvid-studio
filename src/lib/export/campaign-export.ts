"use client";

import JSZip from "jszip";
import { getDesign } from "@/lib/studio/actions";
import { getCampaign } from "@/lib/campaigns/actions";
import { renderCanvasToPngBlob } from "./render-canvas";
import type { CanvasSnapshot } from "@/lib/studio/types";

function safeFileName(input: string): string {
  return input.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "untitled";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Builds and downloads a ZIP of every design in a campaign as PNG, plus a
 * copy.txt of saved copy variants. Video isn't included yet — generated
 * videos aren't linked back to a Design/Campaign in the data model (see
 * README), so they stay in the in-session preview panel only.
 */
export async function exportCampaignZip(campaignId: string): Promise<void> {
  const campaignResult = await getCampaign(campaignId);
  if (!campaignResult.ok) throw new Error(campaignResult.error);
  const campaign = campaignResult.data;

  const zip = new JSZip();

  for (const design of campaign.designs) {
    const designResult = await getDesign(design.id);
    if (!designResult.ok) continue;

    const blob = await renderCanvasToPngBlob(designResult.data.canvas);
    zip.file(`${safeFileName(design.formatLabel ?? design.name)}.png`, blob);
  }

  if (campaign.copyVariants.length > 0) {
    const lines = campaign.copyVariants.map(
      (variant) => `[${variant.platform}] ${variant.kind} (${variant.variantLabel}): ${variant.text}`,
    );
    zip.file("copy.txt", lines.join("\n\n"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safeFileName(campaign.name)}.zip`);
}

export async function exportDesignPng(canvas: CanvasSnapshot, name: string): Promise<void> {
  const blob = await renderCanvasToPngBlob(canvas);
  downloadBlob(blob, `${safeFileName(name)}.png`);
}

"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export interface CampaignSummary {
  id: string;
  name: string;
  goal: string;
  updatedAt: Date;
  designCount: number;
}

export async function listCampaigns(): Promise<ActionResult<CampaignSummary[]>> {
  try {
    const { workspace } = await requireCurrentWorkspace();
    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { designs: true } } },
    });

    return ok(
      campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        goal: campaign.goal,
        updatedAt: campaign.updatedAt,
        designCount: campaign._count.designs,
      })),
    );
  } catch {
    return fail("Could not load your campaigns.");
  }
}

export interface CampaignDetail {
  id: string;
  name: string;
  goal: string;
  designs: { id: string; name: string; formatLabel: string | null }[];
  copyVariants: { id: string; platform: string; kind: string; variantLabel: string; text: string }[];
}

export async function getCampaign(campaignId: string): Promise<ActionResult<CampaignDetail>> {
  try {
    const { workspace } = await requireCurrentWorkspace();
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId: workspace.id },
      include: {
        designs: { select: { id: true, name: true, formatLabel: true }, orderBy: { createdAt: "asc" } },
        copyVariants: {
          select: { id: true, platform: true, kind: true, variantLabel: true, text: true },
          orderBy: [{ platform: "asc" }, { kind: "asc" }, { variantLabel: "asc" }],
        },
      },
    });
    if (!campaign) return fail("Campaign not found.");

    return ok(campaign);
  } catch {
    return fail("Could not load this campaign.");
  }
}

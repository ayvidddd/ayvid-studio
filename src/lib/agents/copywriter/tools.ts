import "server-only";
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { runAgentTool } from "@/lib/agents/harness";
import { loadBrandKitContext } from "@/lib/agents/context";
import { prisma } from "@/lib/prisma";

const PLATFORMS = ["META", "TIKTOK", "LINKEDIN", "GOOGLE_DISPLAY"] as const;
const COPY_KINDS = ["HEADLINE", "CTA", "CAPTION"] as const;

function findBannedWord(text: string, bannedWords: string[]): string | null {
  const lower = text.toLowerCase();
  return bannedWords.find((word) => lower.includes(word.toLowerCase())) ?? null;
}

export function createCopywriterTools(workspaceId: string): ToolSet {
  return {
    save_copy_variant: tool({
      description:
        "Save a headline, CTA, or caption you've written for a campaign. Checked against the Brand Kit's banned words before saving — write the copy yourself first, then call this to store it.",
      inputSchema: z.object({
        campaignId: z.string().min(1),
        platform: z.enum(PLATFORMS),
        kind: z.enum(COPY_KINDS),
        variantLabel: z.string().min(1).max(10).default("A").describe("e.g. \"A\", \"B\" for A/B variants."),
        text: z.string().min(1).max(2000),
      }),
      execute: async ({ campaignId, platform, kind, variantLabel, text }) =>
        runAgentTool({ name: "save_copy_variant", workspaceId }, async () => {
          const [brandKit, campaign] = await Promise.all([
            loadBrandKitContext(workspaceId),
            prisma.campaign.findFirst({ where: { id: campaignId, workspaceId } }),
          ]);
          if (!campaign) throw new Error("That campaign doesn't belong to this workspace.");

          const bannedWord = brandKit ? findBannedWord(text, brandKit.bannedWords) : null;
          if (bannedWord) {
            throw new Error(`"${bannedWord}" is a banned word for this brand — rewrite without it.`);
          }

          const saved = await prisma.copyVariant.create({
            data: { campaignId, platform, kind, variantLabel, text },
          });
          return { id: saved.id, platform: saved.platform, kind: saved.kind, variantLabel: saved.variantLabel };
        }),
    }),

    list_copy_variants: tool({
      description: "List the copy variants already saved for a campaign, so you don't duplicate a headline/CTA/caption that already exists.",
      inputSchema: z.object({ campaignId: z.string().min(1) }),
      execute: async ({ campaignId }) =>
        runAgentTool({ name: "list_copy_variants", workspaceId }, async () => {
          const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId } });
          if (!campaign) throw new Error("That campaign doesn't belong to this workspace.");

          const variants = await prisma.copyVariant.findMany({
            where: { campaignId },
            orderBy: [{ platform: "asc" }, { kind: "asc" }, { variantLabel: "asc" }],
          });
          return variants.map((v) => ({ platform: v.platform, kind: v.kind, variantLabel: v.variantLabel, text: v.text }));
        }),
    }),
  };
}

import "server-only";
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { runAgentTool } from "@/lib/agents/harness";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_FORMATS } from "@/lib/studio/formats";

export function createCampaignStrategistTools(workspaceId: string): ToolSet {
  return {
    create_campaign: tool({
      description:
        "Turn a campaign goal into a full set of ad deliverables: creates a Campaign and one empty Design per standard format (Meta square, TikTok/Story vertical, LinkedIn, Google Display) sized correctly and ready to fill in. Video isn't a Design — generate it separately with generate_video once you have a hero image.",
      inputSchema: z.object({
        name: z.string().min(1).max(120).describe("Short campaign name, e.g. \"Q4 Protein Bar Launch\"."),
        goal: z.string().min(1).max(2000).describe("The campaign brief/goal in full."),
      }),
      execute: async ({ name, goal }) =>
        runAgentTool({ name: "create_campaign", workspaceId }, async () => {
          const campaign = await prisma.campaign.create({
            data: {
              workspaceId,
              name,
              goal,
              designs: {
                create: CAMPAIGN_FORMATS.map((format) => ({
                  workspaceId,
                  name: `${name} — ${format.label}`,
                  formatLabel: format.label,
                  versions: {
                    create: { sequence: 0, layers: { width: format.width, height: format.height, layers: [] } },
                  },
                })),
              },
            },
            include: { designs: true },
          });

          return {
            campaignId: campaign.id,
            designs: campaign.designs.map((design) => ({ id: design.id, formatLabel: design.formatLabel })),
          };
        }),
    }),
  };
}

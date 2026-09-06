import { describe, expect, it, vi, beforeEach } from "vitest";

const campaignCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { campaign: { create: (...args: unknown[]) => campaignCreate(...args) } },
}));

const { createCampaignStrategistTools } = await import("./tools");
const opts = { toolCallId: "t1", messages: [], context: undefined };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("create_campaign", () => {
  it("creates a campaign with one design per standard format", async () => {
    campaignCreate.mockResolvedValue({
      id: "camp1",
      designs: [
        { id: "d1", formatLabel: "Meta Square 1080x1080" },
        { id: "d2", formatLabel: "TikTok / Story 1080x1920" },
        { id: "d3", formatLabel: "LinkedIn 1200x628" },
        { id: "d4", formatLabel: "Google Display 300x250" },
      ],
    });

    const tools = createCampaignStrategistTools("w1");
    const result = await tools.create_campaign.execute!(
      { name: "Q4 Launch", goal: "Launch our new protein bar" },
      opts,
    );

    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: "w1",
          name: "Q4 Launch",
          goal: "Launch our new protein bar",
          designs: {
            create: expect.arrayContaining([
              expect.objectContaining({ formatLabel: "Meta Square 1080x1080" }),
              expect.objectContaining({ formatLabel: "TikTok / Story 1080x1920" }),
              expect.objectContaining({ formatLabel: "LinkedIn 1200x628" }),
              expect.objectContaining({ formatLabel: "Google Display 300x250" }),
            ]),
          },
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      data: {
        campaignId: "camp1",
        designs: [
          { id: "d1", formatLabel: "Meta Square 1080x1080" },
          { id: "d2", formatLabel: "TikTok / Story 1080x1920" },
          { id: "d3", formatLabel: "LinkedIn 1200x628" },
          { id: "d4", formatLabel: "Google Display 300x250" },
        ],
      },
    });
  });

  it("sizes each created design's initial canvas to its format's dimensions", async () => {
    campaignCreate.mockResolvedValue({ id: "camp1", designs: [] });

    const tools = createCampaignStrategistTools("w1");
    await tools.create_campaign.execute!({ name: "Q4 Launch", goal: "Launch" }, opts);

    const call = campaignCreate.mock.calls[0][0];
    const squareDesign = call.data.designs.create.find(
      (d: { formatLabel: string }) => d.formatLabel === "Meta Square 1080x1080",
    );
    expect(squareDesign.versions.create.layers).toEqual({ width: 1080, height: 1080, layers: [] });

    const displayDesign = call.data.designs.create.find(
      (d: { formatLabel: string }) => d.formatLabel === "Google Display 300x250",
    );
    expect(displayDesign.versions.create.layers).toEqual({ width: 300, height: 250, layers: [] });
  });
});

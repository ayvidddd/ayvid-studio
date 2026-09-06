import { describe, expect, it, vi, beforeEach } from "vitest";

const campaignFindMany = vi.fn();
const campaignFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: (...args: unknown[]) => campaignFindMany(...args),
      findFirst: (...args: unknown[]) => campaignFindFirst(...args),
    },
  },
}));

const requireCurrentWorkspace = vi.fn();
vi.mock("@/lib/workspace/current", () => ({
  requireCurrentWorkspace: () => requireCurrentWorkspace(),
}));

const { listCampaigns, getCampaign } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentWorkspace.mockResolvedValue({ workspace: { id: "w1" } });
});

describe("listCampaigns", () => {
  it("maps the design count out of the aggregate", async () => {
    campaignFindMany.mockResolvedValue([
      { id: "c1", name: "Q4 Launch", goal: "Launch", updatedAt: new Date(), _count: { designs: 4 } },
    ]);

    const result = await listCampaigns();

    expect(result).toEqual({
      ok: true,
      data: [expect.objectContaining({ id: "c1", name: "Q4 Launch", designCount: 4 })],
    });
  });
});

describe("getCampaign", () => {
  it("fails when the campaign isn't in the current workspace", async () => {
    campaignFindFirst.mockResolvedValue(null);

    const result = await getCampaign("c1");

    expect(result).toEqual({ ok: false, error: "Campaign not found." });
  });

  it("returns designs and copy variants for a campaign in scope", async () => {
    campaignFindFirst.mockResolvedValue({
      id: "c1",
      name: "Q4 Launch",
      goal: "Launch",
      designs: [{ id: "d1", name: "Q4 Launch — Meta Square", formatLabel: "Meta Square 1080x1080" }],
      copyVariants: [{ id: "cv1", platform: "META", kind: "HEADLINE", variantLabel: "A", text: "Fuel your day." }],
    });

    const result = await getCampaign("c1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.designs).toHaveLength(1);
      expect(result.data.copyVariants).toHaveLength(1);
    }
  });
});

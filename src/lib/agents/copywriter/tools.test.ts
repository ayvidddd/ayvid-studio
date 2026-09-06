import { describe, expect, it, vi, beforeEach } from "vitest";

const loadBrandKitContext = vi.fn();
vi.mock("@/lib/agents/context", () => ({
  loadBrandKitContext: (...args: unknown[]) => loadBrandKitContext(...args),
}));

const campaignFindFirst = vi.fn();
const copyVariantCreate = vi.fn();
const copyVariantFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findFirst: (...args: unknown[]) => campaignFindFirst(...args) },
    copyVariant: {
      create: (...args: unknown[]) => copyVariantCreate(...args),
      findMany: (...args: unknown[]) => copyVariantFindMany(...args),
    },
  },
}));

const { createCopywriterTools } = await import("./tools");
const opts = { toolCallId: "t1", messages: [], context: undefined };

beforeEach(() => {
  vi.clearAllMocks();
  campaignFindFirst.mockResolvedValue({ id: "camp1" });
});

describe("save_copy_variant", () => {
  it("rejects copy that isn't tied to a workspace campaign", async () => {
    campaignFindFirst.mockResolvedValue(null);

    const tools = createCopywriterTools("w1");
    const result = await tools.save_copy_variant.execute!(
      { campaignId: "camp1", platform: "META", kind: "HEADLINE", variantLabel: "A", text: "Fuel your day." },
      opts,
    );

    expect(result).toEqual({ ok: false, error: "That campaign doesn't belong to this workspace." });
    expect(copyVariantCreate).not.toHaveBeenCalled();
  });

  it("rejects copy containing a banned word", async () => {
    loadBrandKitContext.mockResolvedValue({ bannedWords: ["cheap"], palette: [] });

    const tools = createCopywriterTools("w1");
    const result = await tools.save_copy_variant.execute!(
      { campaignId: "camp1", platform: "META", kind: "HEADLINE", variantLabel: "A", text: "The cheapest bar in town." },
      opts,
    );

    expect(result).toEqual({ ok: false, error: '"cheap" is a banned word for this brand — rewrite without it.' });
    expect(copyVariantCreate).not.toHaveBeenCalled();
  });

  it("saves compliant copy", async () => {
    loadBrandKitContext.mockResolvedValue({ bannedWords: ["cheap"], palette: [] });
    copyVariantCreate.mockResolvedValue({ id: "cv1", platform: "META", kind: "HEADLINE", variantLabel: "A" });

    const tools = createCopywriterTools("w1");
    const result = await tools.save_copy_variant.execute!(
      { campaignId: "camp1", platform: "META", kind: "HEADLINE", variantLabel: "A", text: "Fuel your day." },
      opts,
    );

    expect(result).toEqual({ ok: true, data: { id: "cv1", platform: "META", kind: "HEADLINE", variantLabel: "A" } });
  });

  it("saves copy when the workspace has no brand kit yet", async () => {
    loadBrandKitContext.mockResolvedValue(null);
    copyVariantCreate.mockResolvedValue({ id: "cv1", platform: "META", kind: "CTA", variantLabel: "A" });

    const tools = createCopywriterTools("w1");
    const result = await tools.save_copy_variant.execute!(
      { campaignId: "camp1", platform: "META", kind: "CTA", variantLabel: "A", text: "Shop now." },
      opts,
    );

    expect(result.ok).toBe(true);
  });
});

describe("list_copy_variants", () => {
  it("returns saved variants ordered for review", async () => {
    copyVariantFindMany.mockResolvedValue([
      { platform: "META", kind: "HEADLINE", variantLabel: "A", text: "Fuel your day." },
    ]);

    const tools = createCopywriterTools("w1");
    const result = await tools.list_copy_variants.execute!({ campaignId: "camp1" }, opts);

    expect(result).toEqual({
      ok: true,
      data: [{ platform: "META", kind: "HEADLINE", variantLabel: "A", text: "Fuel your day." }],
    });
  });

  it("rejects a campaign outside the workspace", async () => {
    campaignFindFirst.mockResolvedValue(null);

    const tools = createCopywriterTools("w1");
    const result = await tools.list_copy_variants.execute!({ campaignId: "camp1" }, opts);

    expect(result).toEqual({ ok: false, error: "That campaign doesn't belong to this workspace." });
  });
});

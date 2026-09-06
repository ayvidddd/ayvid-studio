import { describe, expect, it, vi, beforeEach } from "vitest";

const brandKitFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { brandKit: { findUnique: (...args: unknown[]) => brandKitFindUnique(...args) } },
}));

const { loadBrandKitContext, formatBrandKitForPrompt } = await import("./context");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadBrandKitContext", () => {
  it("returns null when the workspace has no brand kit", async () => {
    brandKitFindUnique.mockResolvedValue(null);
    expect(await loadBrandKitContext("w1")).toBeNull();
  });

  it("normalizes the palette Json field to a string array", async () => {
    brandKitFindUnique.mockResolvedValue({
      name: "Acme",
      toneOfVoice: null,
      headingFont: null,
      bodyFont: null,
      bannedWords: [],
      palette: ["#111111"],
    });

    const context = await loadBrandKitContext("w1");
    expect(context?.palette).toEqual(["#111111"]);
  });
});

describe("formatBrandKitForPrompt", () => {
  it("tells the agent when there is no brand kit", () => {
    expect(formatBrandKitForPrompt(null)).toMatch(/no Brand Kit/);
  });

  it("includes only the fields that are actually set", () => {
    const text = formatBrandKitForPrompt({
      name: "Acme",
      toneOfVoice: "Bold",
      headingFont: null,
      bodyFont: null,
      bannedWords: ["cheap"],
      palette: [],
    });

    expect(text).toContain("Brand name: Acme");
    expect(text).toContain("Tone of voice: Bold");
    expect(text).toContain("Never use these words: cheap");
    expect(text).not.toContain("Heading font");
    expect(text).not.toContain("Palette:");
  });
});

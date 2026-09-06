import { describe, expect, it, vi, beforeEach } from "vitest";

const workspaceFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { workspace: { findUnique: (...args: unknown[]) => workspaceFindUnique(...args) } },
}));

const createGenerationJob = vi.fn();
vi.mock("@/lib/higgsfield/jobs", () => ({
  createGenerationJob: (...args: unknown[]) => createGenerationJob(...args),
}));

const waitForGenerationJob = vi.fn();
vi.mock("./generation-wait", () => ({
  waitForGenerationJob: (...args: unknown[]) => waitForGenerationJob(...args),
}));

const loadBrandKitContext = vi.fn();
vi.mock("@/lib/agents/context", () => ({
  loadBrandKitContext: (...args: unknown[]) => loadBrandKitContext(...args),
  formatBrandKitForPrompt: (brandKit: unknown) => (brandKit ? "formatted" : "no brand kit"),
}));

const { createDesignerTools } = await import("./tools");

beforeEach(() => {
  vi.clearAllMocks();
  workspaceFindUnique.mockResolvedValue({ creditBalance: 10 });
});

describe("designer tools", () => {
  it("generate_image creates a job and waits for the result", async () => {
    createGenerationJob.mockResolvedValue({ id: "job1" });
    waitForGenerationJob.mockResolvedValue({ status: "COMPLETED", jobId: "job1", images: ["https://x/1.png"] });

    const tools = createDesignerTools("w1");
    const result = await tools.generate_image.execute!(
      { prompt: "a red sneaker", aspectRatio: "1:1" },
      { toolCallId: "t1", messages: [], context: undefined },
    );

    expect(createGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "IMAGE", workspaceId: "w1", modelKey: "soul-standard" }),
    );
    expect(result).toEqual({
      ok: true,
      data: { status: "COMPLETED", jobId: "job1", images: ["https://x/1.png"] },
    });
  });

  it("generate_image reports insufficient credits from the shared harness", async () => {
    workspaceFindUnique.mockResolvedValue({ creditBalance: 0 });

    const tools = createDesignerTools("w1");
    const result = await tools.generate_image.execute!(
      { prompt: "a red sneaker", aspectRatio: "1:1" },
      { toolCallId: "t1", messages: [], context: undefined },
    );

    expect(result).toEqual({ ok: false, error: "Not enough credits in this workspace for this action." });
    expect(createGenerationJob).not.toHaveBeenCalled();
  });

  it("edit_image creates an EDIT job against the reve-edit model", async () => {
    createGenerationJob.mockResolvedValue({ id: "job2" });
    waitForGenerationJob.mockResolvedValue({ status: "COMPLETED", jobId: "job2", images: ["https://x/2.png"] });

    const tools = createDesignerTools("w1");
    await tools.edit_image.execute!(
      { imageUrl: "https://x/original.png", prompt: "make it blue" },
      { toolCallId: "t2", messages: [], context: undefined },
    );

    expect(createGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "EDIT", modelKey: "reve-edit" }),
    );
  });

  it("apply_brand_kit returns the current brand kit summary", async () => {
    loadBrandKitContext.mockResolvedValue({ name: "Acme" });

    const tools = createDesignerTools("w1");
    const result = await tools.apply_brand_kit.execute!({}, { toolCallId: "t3", messages: [], context: undefined });

    expect(result).toEqual({ ok: true, data: { brandKit: { name: "Acme" }, summary: "formatted" } });
  });

  it.each(["remove_background", "upscale", "outpaint"] as const)(
    "%s reports it is not yet available instead of failing silently",
    async (toolName) => {
      const tools = createDesignerTools("w1");
      const input = toolName === "outpaint" ? { imageUrl: "https://x/1.png", targetAspectRatio: "16:9" } : { imageUrl: "https://x/1.png" };
      const result = await tools[toolName].execute!(input, { toolCallId: "t4", messages: [], context: undefined });

      expect(result).toEqual({
        ok: true,
        data: expect.objectContaining({ available: false, message: expect.stringContaining("isn't available yet") }),
      });
    },
  );
});

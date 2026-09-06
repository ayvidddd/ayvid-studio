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
vi.mock("@/lib/agents/designer/generation-wait", () => ({
  waitForGenerationJob: (...args: unknown[]) => waitForGenerationJob(...args),
}));

const checkJobStatus = vi.fn();
vi.mock("@/lib/agents/job-status", () => ({
  checkJobStatus: (...args: unknown[]) => checkJobStatus(...args),
  JobNotInWorkspaceError: class JobNotInWorkspaceError extends Error {},
}));

const { createVideoProducerTools } = await import("./tools");

const opts = { toolCallId: "t1", messages: [], context: undefined };

beforeEach(() => {
  vi.clearAllMocks();
  workspaceFindUnique.mockResolvedValue({ creditBalance: 10 });
});

describe("video producer tools", () => {
  it("generate_video creates a VIDEO job against the Kling model and waits for the result", async () => {
    createGenerationJob.mockResolvedValue({ id: "job1" });
    waitForGenerationJob.mockResolvedValue({ status: "COMPLETED", jobId: "job1", images: ["https://x/clip.mp4"] });

    const tools = createVideoProducerTools("w1");
    const result = await tools.generate_video.execute!(
      { imageUrl: "https://x/still.png", prompt: "slow pan left", duration: 5 },
      opts,
    );

    expect(createGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "VIDEO", workspaceId: "w1", modelKey: "kling-v2.5-turbo-pro" }),
    );
    expect(result).toEqual({ ok: true, data: { status: "COMPLETED", jobId: "job1", images: ["https://x/clip.mp4"] } });
  });

  it("generate_video respects the shared credit guard", async () => {
    workspaceFindUnique.mockResolvedValue({ creditBalance: 0 });

    const tools = createVideoProducerTools("w1");
    const result = await tools.generate_video.execute!(
      { imageUrl: "https://x/still.png", prompt: "slow pan left", duration: 5 },
      opts,
    );

    expect(result).toEqual({ ok: false, error: "Not enough credits in this workspace for this action." });
    expect(createGenerationJob).not.toHaveBeenCalled();
  });

  it("list_motions returns the curated preset list without any external call", async () => {
    const tools = createVideoProducerTools("w1");
    const result = await tools.list_motions.execute!({}, opts);

    expect(result.ok).toBe(true);
    expect(result.data.motions.length).toBeGreaterThan(0);
    expect(result.data.motions[0]).toEqual(expect.objectContaining({ id: expect.any(String), prompt: expect.any(String) }));
  });

  it("poll_job delegates to checkJobStatus scoped to the workspace", async () => {
    checkJobStatus.mockResolvedValue({ status: "IN_PROGRESS", jobId: "job1" });

    const tools = createVideoProducerTools("w1");
    const result = await tools.poll_job.execute!({ jobId: "job1" }, opts);

    expect(checkJobStatus).toHaveBeenCalledWith("job1", "w1");
    expect(result).toEqual({ ok: true, data: { status: "IN_PROGRESS", jobId: "job1" } });
  });

  it("reframe reports it is not yet available", async () => {
    const tools = createVideoProducerTools("w1");
    const result = await tools.reframe.execute!({ videoUrl: "https://x/clip.mp4", targetAspectRatio: "9:16" }, opts);

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({ available: false, message: expect.stringContaining("isn't available yet") }),
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const requireCurrentWorkspace = vi.fn();
vi.mock("@/lib/workspace/current", () => ({
  requireCurrentWorkspace: () => requireCurrentWorkspace(),
}));

const createGenerationJob = vi.fn();
vi.mock("./jobs", async () => {
  const actual = await vi.importActual<typeof import("./jobs")>("./jobs");
  return {
    ...actual,
    createGenerationJob: (...args: unknown[]) => createGenerationJob(...args),
  };
});

const { generateImageAction, generateVideoAction } = await import("./actions");
const { InsufficientCreditsError } = await import("./jobs");

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentWorkspace.mockResolvedValue({ workspace: { id: "w1" } });
});

describe("generateImageAction", () => {
  it("rejects an unknown model key", async () => {
    const result = await generateImageAction({
      modelKey: "not-a-real-model",
      input: { prompt: "x", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });
    expect(result.ok).toBe(false);
    expect(createGenerationJob).not.toHaveBeenCalled();
  });

  it("rejects an empty prompt", async () => {
    const result = await generateImageAction({
      modelKey: "soul-standard",
      input: { prompt: "", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });
    expect(result.ok).toBe(false);
  });

  it("surfaces InsufficientCreditsError as a friendly message", async () => {
    createGenerationJob.mockRejectedValue(new InsufficientCreditsError());

    const result = await generateImageAction({
      modelKey: "soul-standard",
      input: { prompt: "a red sneaker", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });

    expect(result).toEqual({ ok: false, error: "Not enough credits in this workspace for this generation." });
  });

  it("starts a job on valid input", async () => {
    createGenerationJob.mockResolvedValue({ id: "job1" });

    const result = await generateImageAction({
      modelKey: "soul-standard",
      input: { prompt: "a red sneaker", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });

    expect(result).toEqual({ ok: true, data: { jobId: "job1" } });
  });
});

describe("generateVideoAction", () => {
  it("rejects an invalid image URL", async () => {
    const result = await generateVideoAction({
      modelKey: "kling-v2.5-turbo-pro",
      input: { imageUrl: "not-a-url", prompt: "pan across the sneaker", duration: 5, cfgScale: 0.5 },
    });
    expect(result.ok).toBe(false);
  });

  it("starts a job on valid input", async () => {
    createGenerationJob.mockResolvedValue({ id: "job2" });

    const result = await generateVideoAction({
      modelKey: "kling-v2.5-turbo-pro",
      input: {
        imageUrl: "https://example.com/sneaker.png",
        prompt: "pan across the sneaker",
        duration: 5,
        cfgScale: 0.5,
      },
    });

    expect(result).toEqual({ ok: true, data: { jobId: "job2" } });
  });
});

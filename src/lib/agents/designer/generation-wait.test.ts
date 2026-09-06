import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const syncJobStatus = vi.fn();
vi.mock("@/lib/higgsfield/jobs", () => ({
  syncJobStatus: (...args: unknown[]) => syncJobStatus(...args),
}));

const generationOutputFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { generationOutput: { findMany: (...args: unknown[]) => generationOutputFindMany(...args) } },
}));

const signedGenerationOutputUrl = vi.fn();
vi.mock("@/lib/storage/generation-outputs", () => ({
  signedGenerationOutputUrl: (...args: unknown[]) => signedGenerationOutputUrl(...args),
}));

const { waitForGenerationJob } = await import("./generation-wait");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("waitForGenerationJob", () => {
  it("returns immediately when the job is already completed", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", status: "COMPLETED" });
    generationOutputFindMany.mockResolvedValue([{ storagePath: "path/1.png" }]);
    signedGenerationOutputUrl.mockResolvedValue("https://signed/1.png");

    const result = await waitForGenerationJob("job1");

    expect(result).toEqual({ status: "COMPLETED", jobId: "job1", images: ["https://signed/1.png"] });
    expect(syncJobStatus).toHaveBeenCalledTimes(1);
  });

  it("polls through in_progress until completion and signs every output", async () => {
    syncJobStatus
      .mockResolvedValueOnce({ id: "job1", status: "IN_PROGRESS" })
      .mockResolvedValueOnce({ id: "job1", status: "IN_PROGRESS" })
      .mockResolvedValueOnce({ id: "job1", status: "COMPLETED" });
    generationOutputFindMany.mockResolvedValue([{ storagePath: "a.png" }, { storagePath: "b.png" }]);
    signedGenerationOutputUrl.mockImplementation(async (path: string) => `https://signed/${path}`);

    const resultPromise = waitForGenerationJob("job1");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(syncJobStatus).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      status: "COMPLETED",
      jobId: "job1",
      images: ["https://signed/a.png", "https://signed/b.png"],
    });
  });

  it("returns the failure status without touching storage when the job fails", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", status: "FAILED", errorMessage: "model overloaded" });

    const result = await waitForGenerationJob("job1");

    expect(result).toEqual({ status: "FAILED", jobId: "job1", errorMessage: "model overloaded" });
    expect(generationOutputFindMany).not.toHaveBeenCalled();
  });

  it("stops polling after the timeout and reports the last known non-terminal status", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", status: "IN_PROGRESS" });

    const resultPromise = waitForGenerationJob("job1");
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await resultPromise;

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.jobId).toBe("job1");
  });
});

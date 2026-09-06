import { describe, expect, it, vi, beforeEach } from "vitest";

const generationOutputFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { generationOutput: { findMany: (...args: unknown[]) => generationOutputFindMany(...args) } },
}));

const signedGenerationOutputUrl = vi.fn();
vi.mock("@/lib/storage/generation-outputs", () => ({
  signedGenerationOutputUrl: (...args: unknown[]) => signedGenerationOutputUrl(...args),
}));

const { resolveJobOutputUrls } = await import("./job-outputs");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveJobOutputUrls", () => {
  it("signs every output in position order", async () => {
    generationOutputFindMany.mockResolvedValue([{ storagePath: "a.png" }, { storagePath: "b.mp4" }]);
    signedGenerationOutputUrl.mockImplementation(async (path: string) => `https://signed/${path}`);

    const urls = await resolveJobOutputUrls("job1");

    expect(generationOutputFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: "job1" }, orderBy: { position: "asc" } }),
    );
    expect(urls).toEqual(["https://signed/a.png", "https://signed/b.mp4"]);
  });

  it("returns an empty array when the job has no outputs", async () => {
    generationOutputFindMany.mockResolvedValue([]);
    expect(await resolveJobOutputUrls("job1")).toEqual([]);
  });
});

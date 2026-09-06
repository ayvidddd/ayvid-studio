import { describe, expect, it, vi, beforeEach } from "vitest";

const syncJobStatus = vi.fn();
vi.mock("@/lib/higgsfield/jobs", () => ({
  syncJobStatus: (...args: unknown[]) => syncJobStatus(...args),
}));

const resolveJobOutputUrls = vi.fn();
vi.mock("./job-outputs", () => ({
  resolveJobOutputUrls: (...args: unknown[]) => resolveJobOutputUrls(...args),
}));

const { checkJobStatus, JobNotInWorkspaceError } = await import("./job-status");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkJobStatus", () => {
  it("rejects a job that belongs to a different workspace", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", workspaceId: "other-workspace", status: "IN_PROGRESS" });

    await expect(checkJobStatus("job1", "w1")).rejects.toThrow(JobNotInWorkspaceError);
    expect(resolveJobOutputUrls).not.toHaveBeenCalled();
  });

  it("reports a non-terminal status without resolving outputs", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", workspaceId: "w1", status: "IN_PROGRESS" });

    const result = await checkJobStatus("job1", "w1");

    expect(result).toEqual({ status: "IN_PROGRESS", jobId: "job1", errorMessage: undefined });
    expect(resolveJobOutputUrls).not.toHaveBeenCalled();
  });

  it("resolves signed URLs for a completed job", async () => {
    syncJobStatus.mockResolvedValue({ id: "job1", workspaceId: "w1", status: "COMPLETED" });
    resolveJobOutputUrls.mockResolvedValue(["https://signed/clip.mp4"]);

    const result = await checkJobStatus("job1", "w1");

    expect(result).toEqual({ status: "COMPLETED", jobId: "job1", images: ["https://signed/clip.mp4"] });
  });
});

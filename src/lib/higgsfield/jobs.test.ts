import { describe, expect, it, vi, beforeEach } from "vitest";

const workspaceFindUniqueOrThrow = vi.fn();
const workspaceUpdate = vi.fn();
const generationJobCreate = vi.fn();
const generationJobUpdate = vi.fn();
const generationJobFindUniqueOrThrow = vi.fn();
const generationOutputCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUniqueOrThrow: (...args: unknown[]) => workspaceFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => workspaceUpdate(...args),
    },
    generationJob: {
      create: (...args: unknown[]) => generationJobCreate(...args),
      update: (...args: unknown[]) => generationJobUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => generationJobFindUniqueOrThrow(...args),
    },
    generationOutput: {
      create: (...args: unknown[]) => generationOutputCreate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const createImageGeneration = vi.fn();
const createImageToVideo = vi.fn();
const getRequestStatus = vi.fn();
vi.mock("./client", () => ({
  createImageGeneration: (...args: unknown[]) => createImageGeneration(...args),
  createImageToVideo: (...args: unknown[]) => createImageToVideo(...args),
  getRequestStatus: (...args: unknown[]) => getRequestStatus(...args),
}));

const fetchAndStoreGenerationOutput = vi.fn();
vi.mock("@/lib/storage/generation-outputs", () => ({
  fetchAndStoreGenerationOutput: (...args: unknown[]) => fetchAndStoreGenerationOutput(...args),
  generationOutputObjectKey: () => "workspace/w1/jobs/job1/0-fixed.png",
}));

const { createGenerationJob, syncJobStatus, InsufficientCreditsError } = await import("./jobs");

const baseInput = { prompt: "a red sneaker", numImages: 1, resolution: "2K" as const, aspectRatio: "4:3" as const };

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      workspace: { update: (...args: unknown[]) => workspaceUpdate(...args) },
      generationJob: { update: (...args: unknown[]) => generationJobUpdate(...args) },
    }),
  );
});

describe("createGenerationJob", () => {
  it("rejects when the workspace doesn't have enough credits", async () => {
    workspaceFindUniqueOrThrow.mockResolvedValue({ id: "w1", creditBalance: 0 });

    await expect(
      createGenerationJob({ kind: "IMAGE", workspaceId: "w1", modelKey: "soul-standard", input: baseInput }),
    ).rejects.toThrow(InsufficientCreditsError);

    expect(generationJobCreate).not.toHaveBeenCalled();
  });

  it("creates a job row and records the provider request id", async () => {
    workspaceFindUniqueOrThrow.mockResolvedValue({ id: "w1", creditBalance: 10 });
    generationJobCreate.mockResolvedValue({ id: "job1" });
    createImageGeneration.mockResolvedValue({ request_id: "req_abc", status: "queued" });
    generationJobUpdate.mockResolvedValue({ id: "job1", status: "QUEUED", providerRequestId: "req_abc" });

    const job = await createGenerationJob({
      kind: "IMAGE",
      workspaceId: "w1",
      modelKey: "soul-standard",
      input: baseInput,
    });

    expect(createImageGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ model: "higgsfield-ai/soul/standard", input: baseInput }),
    );
    expect(generationJobUpdate).toHaveBeenCalledWith({
      where: { id: "job1" },
      data: { providerRequestId: "req_abc", status: "QUEUED" },
    });
    expect(job).toEqual({ id: "job1", status: "QUEUED", providerRequestId: "req_abc" });
  });
});

describe("syncJobStatus", () => {
  it("returns early without polling when the job is already terminal", async () => {
    generationJobFindUniqueOrThrow.mockResolvedValue({ id: "job1", status: "COMPLETED", providerRequestId: "req_abc" });

    const job = await syncJobStatus("job1");

    expect(job.status).toBe("COMPLETED");
    expect(getRequestStatus).not.toHaveBeenCalled();
  });

  it("updates status on a non-terminal transition", async () => {
    generationJobFindUniqueOrThrow.mockResolvedValue({ id: "job1", status: "QUEUED", providerRequestId: "req_abc" });
    getRequestStatus.mockResolvedValue({ request_id: "req_abc", status: "in_progress" });
    generationJobUpdate.mockResolvedValue({ id: "job1", status: "IN_PROGRESS" });

    const job = await syncJobStatus("job1");

    expect(generationJobUpdate).toHaveBeenCalledWith({ where: { id: "job1" }, data: { status: "IN_PROGRESS" } });
    expect(job.status).toBe("IN_PROGRESS");
  });

  it("marks a job failed and records the error without charging credits", async () => {
    generationJobFindUniqueOrThrow.mockResolvedValue({ id: "job1", status: "IN_PROGRESS", providerRequestId: "req_abc" });
    getRequestStatus.mockResolvedValue({ request_id: "req_abc", status: "failed", error: "model overloaded" });
    generationJobUpdate.mockResolvedValue({ id: "job1", status: "FAILED", errorMessage: "model overloaded" });

    const job = await syncJobStatus("job1");

    expect(job.status).toBe("FAILED");
    expect(workspaceUpdate).not.toHaveBeenCalled();
  });

  it("downloads outputs, charges credits, and completes the job", async () => {
    generationJobFindUniqueOrThrow.mockResolvedValue({
      id: "job1",
      kind: "IMAGE",
      workspaceId: "w1",
      status: "IN_PROGRESS",
      providerRequestId: "req_abc",
    });
    getRequestStatus.mockResolvedValue({
      request_id: "req_abc",
      status: "completed",
      payload: { images: [{ url: "https://mock.higgsfield.local/req_abc.png" }] },
    });
    fetchAndStoreGenerationOutput.mockResolvedValue(undefined);
    generationOutputCreate.mockResolvedValue({ id: "out1" });
    generationJobUpdate.mockResolvedValue({ id: "job1", status: "COMPLETED", creditsUsed: 1 });

    const job = await syncJobStatus("job1");

    expect(fetchAndStoreGenerationOutput).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: "https://mock.higgsfield.local/req_abc.png" }),
    );
    expect(workspaceUpdate).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { creditBalance: { decrement: 1 } },
    });
    expect(job).toEqual({ id: "job1", status: "COMPLETED", creditsUsed: 1 });
  });
});

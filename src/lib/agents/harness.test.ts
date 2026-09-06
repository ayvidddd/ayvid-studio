import { describe, expect, it, vi, beforeEach } from "vitest";

const workspaceFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { workspace: { findUnique: (...args: unknown[]) => workspaceFindUnique(...args) } },
}));

const { runAgentTool, onToolEvent } = await import("./harness");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAgentTool", () => {
  it("returns the handler's result on success without checking credits when none is required", async () => {
    const handler = vi.fn().mockResolvedValue({ hello: "world" });

    const result = await runAgentTool({ name: "noop", workspaceId: "w1" }, handler);

    expect(result).toEqual({ ok: true, data: { hello: "world" } });
    expect(workspaceFindUnique).not.toHaveBeenCalled();
  });

  it("fails fast when the workspace doesn't have enough credits", async () => {
    workspaceFindUnique.mockResolvedValue({ creditBalance: 0 });
    const handler = vi.fn();

    const result = await runAgentTool({ name: "generate_image", workspaceId: "w1", creditCost: 1 }, handler);

    expect(result).toEqual({ ok: false, error: "Not enough credits in this workspace for this action." });
    expect(handler).not.toHaveBeenCalled();
  });

  it("proceeds when the workspace has enough credits", async () => {
    workspaceFindUnique.mockResolvedValue({ creditBalance: 5 });
    const handler = vi.fn().mockResolvedValue("done");

    const result = await runAgentTool({ name: "generate_image", workspaceId: "w1", creditCost: 1 }, handler);

    expect(result).toEqual({ ok: true, data: "done" });
  });

  it("retries a transient (network) failure and succeeds on a later attempt", async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce("recovered");

    const result = await runAgentTool({ name: "flaky", workspaceId: "w1", maxRetries: 2 }, handler);

    expect(result).toEqual({ ok: true, data: "recovered" });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient failure", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Invalid prompt"));

    const result = await runAgentTool({ name: "strict", workspaceId: "w1", maxRetries: 3 }, handler);

    expect(result).toEqual({ ok: false, error: "Invalid prompt" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries on a persistently transient failure", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    const result = await runAgentTool({ name: "always-flaky", workspaceId: "w1", maxRetries: 1 }, handler);

    expect(result).toEqual({ ok: false, error: "ECONNRESET" });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("emits start/success events to registered eval hooks", async () => {
    const events: unknown[] = [];
    onToolEvent((event) => events.push(event));

    await runAgentTool({ name: "observed", workspaceId: "w1" }, async () => "ok");

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: "observed", workspaceId: "w1", status: "start" }),
        expect.objectContaining({ tool: "observed", workspaceId: "w1", status: "success" }),
      ]),
    );
  });
});

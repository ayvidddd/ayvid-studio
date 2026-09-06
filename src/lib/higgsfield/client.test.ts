import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("higgsfield client in mock mode", () => {
  beforeEach(() => {
    vi.stubEnv("HIGGSFIELD_MODE", "mock");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an image generation request without making a network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { createImageGeneration } = await import("./client");

    const result = await createImageGeneration({
      model: "higgsfield-ai/soul/standard",
      input: { prompt: "a red sneaker", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });

    expect(result.status).toBe("queued");
    expect(result.request_id).toMatch(/^mock_/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("transitions from in_progress to completed with output URLs across polls", async () => {
    const { createImageGeneration, getRequestStatus } = await import("./client");

    const created = await createImageGeneration({
      model: "higgsfield-ai/soul/standard",
      input: { prompt: "a red sneaker", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });

    const first = await getRequestStatus(created.request_id);
    expect(first.status).toBe("in_progress");

    const second = await getRequestStatus(created.request_id);
    expect(second.status).toBe("completed");
    expect(second.payload?.images?.[0]?.url).toContain(created.request_id);
  });
});

describe("higgsfield client in live mode", () => {
  beforeEach(() => {
    vi.stubEnv("HIGGSFIELD_MODE", "live");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws a clear error when credentials are missing", async () => {
    vi.stubEnv("HIGGSFIELD_API_KEY_ID", "");
    vi.stubEnv("HIGGSFIELD_API_KEY_SECRET", "");
    const { createImageGeneration } = await import("./client");

    await expect(
      createImageGeneration({
        model: "higgsfield-ai/soul/standard",
        input: { prompt: "x", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
      }),
    ).rejects.toThrow(/not configured/);
  });

  it("sends the Key auth header and parses a real response", async () => {
    vi.stubEnv("HIGGSFIELD_API_KEY_ID", "id123");
    vi.stubEnv("HIGGSFIELD_API_KEY_SECRET", "secret456");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ request_id: "req_1", status: "queued" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createImageGeneration } = await import("./client");
    const result = await createImageGeneration({
      model: "higgsfield-ai/soul/standard",
      input: { prompt: "x", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
    });

    expect(result).toEqual({ request_id: "req_1", status: "queued" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.higgsfield.ai/higgsfield-ai/soul/standard");
    expect(init.headers.Authorization).toBe("Key id123:secret456");
  });

  it("throws HiggsfieldApiError on a non-2xx response", async () => {
    vi.stubEnv("HIGGSFIELD_API_KEY_ID", "id123");
    vi.stubEnv("HIGGSFIELD_API_KEY_SECRET", "secret456");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "bad request" }) }),
    );

    const { createImageGeneration, HiggsfieldApiError } = await import("./client");

    await expect(
      createImageGeneration({
        model: "higgsfield-ai/soul/standard",
        input: { prompt: "x", numImages: 1, resolution: "2K", aspectRatio: "4:3" },
      }),
    ).rejects.toThrow(HiggsfieldApiError);
  });
});

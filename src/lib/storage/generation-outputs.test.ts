import { describe, expect, it, vi, beforeEach } from "vitest";

const upload = vi.fn();
const createSignedUrl = vi.fn();
const from = vi.fn(() => ({ upload, createSignedUrl }));

vi.mock("./supabase", () => ({
  getSupabaseAdmin: () => ({ storage: { from } }),
}));

const { generationOutputObjectKey, fetchAndStoreGenerationOutput, signedGenerationOutputUrl } = await import(
  "./generation-outputs"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generationOutputObjectKey", () => {
  it("namespaces the key by workspace, job, and output index", () => {
    const key = generationOutputObjectKey({ workspaceId: "w1", jobId: "j1", index: 0, extension: "png" });
    expect(key).toMatch(/^workspace\/w1\/jobs\/j1\/0-[0-9a-f-]+\.png$/);
  });
});

describe("fetchAndStoreGenerationOutput", () => {
  it("downloads the source URL and uploads it to the generations bucket", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    vi.stubGlobal("fetch", fetchMock);
    upload.mockResolvedValue({ error: null });

    await fetchAndStoreGenerationOutput({ sourceUrl: "https://higgsfield.example/out.png", objectKey: "k1", mimeType: "image/png" });

    expect(fetchMock).toHaveBeenCalledWith("https://higgsfield.example/out.png");
    expect(from).toHaveBeenCalledWith("generations");
    expect(upload).toHaveBeenCalledWith("k1", expect.any(Buffer), { contentType: "image/png", upsert: false });

    vi.unstubAllGlobals();
  });

  it("throws when the source download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(
      fetchAndStoreGenerationOutput({ sourceUrl: "https://higgsfield.example/gone.png", objectKey: "k1", mimeType: "image/png" }),
    ).rejects.toThrow("404");

    vi.unstubAllGlobals();
  });

  it("throws when the Supabase upload fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
    upload.mockResolvedValue({ error: { message: "quota exceeded" } });

    await expect(
      fetchAndStoreGenerationOutput({ sourceUrl: "https://higgsfield.example/out.png", objectKey: "k1", mimeType: "image/png" }),
    ).rejects.toThrow("quota exceeded");

    vi.unstubAllGlobals();
  });
});

describe("signedGenerationOutputUrl", () => {
  it("returns the signed URL on success", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/k1" }, error: null });

    await expect(signedGenerationOutputUrl("k1")).resolves.toBe("https://signed.example/k1");
  });

  it("throws when Supabase returns an error", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(signedGenerationOutputUrl("k1")).rejects.toThrow("not found");
  });
});

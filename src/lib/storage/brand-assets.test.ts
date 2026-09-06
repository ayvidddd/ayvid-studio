import { describe, expect, it, vi, beforeEach } from "vitest";

const upload = vi.fn();
const remove = vi.fn();
const createSignedUrl = vi.fn();
const from = vi.fn(() => ({ upload, remove, createSignedUrl }));

vi.mock("./supabase", () => ({
  getSupabaseAdmin: () => ({ storage: { from } }),
  BRAND_ASSETS_BUCKET: "brand-assets",
}));

const { brandAssetObjectKey, uploadBrandAsset, deleteBrandAsset, signedBrandAssetUrl } = await import(
  "./brand-assets"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("brandAssetObjectKey", () => {
  it("namespaces the key by workspace and brand kit", () => {
    const key = brandAssetObjectKey({ workspaceId: "w1", brandKitId: "bk1", filename: "logo.png" });
    expect(key).toMatch(/^workspace\/w1\/bk1\/[0-9a-f-]+-logo\.png$/);
  });

  it("strips path separators out of the filename so it can't escape its own segment", () => {
    const key = brandAssetObjectKey({ workspaceId: "w1", brandKitId: "bk1", filename: "../../etc/passwd" });
    // Slashes are replaced, so the sanitized name can't introduce extra path segments —
    // it still contains literal dots (a legitimate filename character), just no "/".
    expect(key.endsWith(".._.._etc_passwd")).toBe(true);
    expect(key.split("/")).toHaveLength(4); // workspace/w1/bk1/<uuid>-.._.._etc_passwd
  });
});

describe("uploadBrandAsset", () => {
  it("uploads without overwrite", async () => {
    upload.mockResolvedValue({ error: null });

    await uploadBrandAsset({ objectKey: "k1", buffer: Buffer.from("x"), mimeType: "image/png" });

    expect(from).toHaveBeenCalledWith("brand-assets");
    expect(upload).toHaveBeenCalledWith("k1", expect.any(Buffer), { contentType: "image/png", upsert: false });
  });

  it("throws with the Supabase error message on failure", async () => {
    upload.mockResolvedValue({ error: { message: "bucket not found" } });

    await expect(uploadBrandAsset({ objectKey: "k1", buffer: Buffer.from("x"), mimeType: "image/png" })).rejects.toThrow(
      "bucket not found",
    );
  });
});

describe("deleteBrandAsset", () => {
  it("throws with the Supabase error message on failure", async () => {
    remove.mockResolvedValue({ error: { message: "not found" } });

    await expect(deleteBrandAsset("k1")).rejects.toThrow("not found");
  });
});

describe("signedBrandAssetUrl", () => {
  it("returns the signed URL on success", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/k1" }, error: null });

    await expect(signedBrandAssetUrl("k1")).resolves.toBe("https://signed.example/k1");
  });

  it("throws when Supabase returns no data", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: null });

    await expect(signedBrandAssetUrl("k1")).rejects.toThrow("Failed to sign brand asset URL");
  });
});

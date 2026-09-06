import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const brandKitUpdate = vi.fn();
const brandAssetCreate = vi.fn();
const brandAssetFindFirst = vi.fn();
const brandAssetDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandKit: { update: (...args: unknown[]) => brandKitUpdate(...args) },
    brandAsset: {
      create: (...args: unknown[]) => brandAssetCreate(...args),
      findFirst: (...args: unknown[]) => brandAssetFindFirst(...args),
      delete: (...args: unknown[]) => brandAssetDelete(...args),
    },
  },
}));

const requireCurrentWorkspace = vi.fn();
vi.mock("@/lib/workspace/current", () => ({
  requireCurrentWorkspace: () => requireCurrentWorkspace(),
}));

const uploadToStorage = vi.fn();
const deleteFromStorage = vi.fn();
vi.mock("@/lib/storage/brand-assets", () => ({
  brandAssetObjectKey: () => "workspace/w1/bk1/fixed-key.png",
  uploadBrandAsset: (...args: unknown[]) => uploadToStorage(...args),
  deleteBrandAsset: (...args: unknown[]) => deleteFromStorage(...args),
}));

const extractPaletteFromImage = vi.fn();
vi.mock("@/lib/brand-kit/palette", () => ({
  extractPaletteFromImage: (...args: unknown[]) => extractPaletteFromImage(...args),
}));

const {
  updateBrandKitDetails,
  uploadBrandAssetAction,
  deleteBrandAssetAction,
} = await import("./actions");

const workspaceWithBrandKit = {
  role: "OWNER",
  workspace: { id: "w1", brandKit: { id: "bk1" } },
};

function makeImageFile(name: string, type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateBrandKitDetails", () => {
  it("rejects invalid input before touching the database", async () => {
    const result = await updateBrandKitDetails({
      name: "",
      toneOfVoice: null,
      headingFont: null,
      bodyFont: null,
      bannedWords: [],
      palette: [],
    });

    expect(result.ok).toBe(false);
    expect(brandKitUpdate).not.toHaveBeenCalled();
  });

  it("rejects malformed hex colors", async () => {
    const result = await updateBrandKitDetails({
      name: "Acme",
      toneOfVoice: null,
      headingFont: null,
      bodyFont: null,
      bannedWords: [],
      palette: ["not-a-color"],
    });

    expect(result.ok).toBe(false);
  });

  it("fails gracefully when the workspace has no brand kit", async () => {
    requireCurrentWorkspace.mockResolvedValue({ role: "OWNER", workspace: { id: "w1", brandKit: null } });

    const result = await updateBrandKitDetails({
      name: "Acme",
      toneOfVoice: null,
      headingFont: null,
      bodyFont: null,
      bannedWords: [],
      palette: [],
    });

    expect(result.ok).toBe(false);
    expect(brandKitUpdate).not.toHaveBeenCalled();
  });

  it("saves valid input", async () => {
    requireCurrentWorkspace.mockResolvedValue(workspaceWithBrandKit);
    brandKitUpdate.mockResolvedValue({ id: "bk1" });

    const result = await updateBrandKitDetails({
      name: "Acme",
      toneOfVoice: "Bold and direct",
      headingFont: "Inter",
      bodyFont: "Inter",
      bannedWords: ["cheap"],
      palette: ["#112233"],
    });

    expect(result).toEqual({ ok: true, data: { id: "bk1" } });
    expect(brandKitUpdate).toHaveBeenCalledWith({
      where: { id: "bk1" },
      data: expect.objectContaining({ name: "Acme", palette: ["#112233"] }),
    });
  });
});

describe("uploadBrandAssetAction", () => {
  it("rejects unsupported file types", async () => {
    const formData = new FormData();
    formData.set("file", makeImageFile("logo.gif", "image/gif", 100));
    formData.set("type", "LOGO");

    const result = await uploadBrandAssetAction(formData);
    expect(result.ok).toBe(false);
    expect(uploadToStorage).not.toHaveBeenCalled();
  });

  it("rejects files over the size limit", async () => {
    const formData = new FormData();
    formData.set("file", makeImageFile("logo.png", "image/png", 9 * 1024 * 1024));
    formData.set("type", "LOGO");

    const result = await uploadBrandAssetAction(formData);
    expect(result.ok).toBe(false);
  });

  it("uploads a logo and regenerates the palette", async () => {
    requireCurrentWorkspace.mockResolvedValue(workspaceWithBrandKit);
    uploadToStorage.mockResolvedValue(undefined);
    brandAssetCreate.mockResolvedValue({ id: "asset1", type: "LOGO" });
    extractPaletteFromImage.mockResolvedValue(["#111111", "#222222"]);
    brandKitUpdate.mockResolvedValue({ id: "bk1" });

    const formData = new FormData();
    formData.set("file", makeImageFile("logo.png", "image/png", 1024));
    formData.set("type", "LOGO");

    const result = await uploadBrandAssetAction(formData);

    expect(result).toEqual({ ok: true, data: { id: "asset1", type: "LOGO" } });
    expect(uploadToStorage).toHaveBeenCalledOnce();
    expect(brandKitUpdate).toHaveBeenCalledWith({
      where: { id: "bk1" },
      data: { palette: ["#111111", "#222222"] },
    });
  });

  it("uploads a product photo without touching the palette", async () => {
    requireCurrentWorkspace.mockResolvedValue(workspaceWithBrandKit);
    uploadToStorage.mockResolvedValue(undefined);
    brandAssetCreate.mockResolvedValue({ id: "asset2", type: "PRODUCT_PHOTO" });

    const formData = new FormData();
    formData.set("file", makeImageFile("bottle.png", "image/png", 1024));
    formData.set("type", "PRODUCT_PHOTO");

    const result = await uploadBrandAssetAction(formData);

    expect(result.ok).toBe(true);
    expect(extractPaletteFromImage).not.toHaveBeenCalled();
    expect(brandKitUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteBrandAssetAction", () => {
  it("returns a friendly error when the asset doesn't belong to this workspace", async () => {
    requireCurrentWorkspace.mockResolvedValue(workspaceWithBrandKit);
    brandAssetFindFirst.mockResolvedValue(null);

    const result = await deleteBrandAssetAction("missing-asset");

    expect(result.ok).toBe(false);
    expect(deleteFromStorage).not.toHaveBeenCalled();
  });

  it("deletes the storage object and the database row", async () => {
    requireCurrentWorkspace.mockResolvedValue(workspaceWithBrandKit);
    brandAssetFindFirst.mockResolvedValue({ id: "asset1", storagePath: "workspace/w1/bk1/logo.png" });
    deleteFromStorage.mockResolvedValue(undefined);
    brandAssetDelete.mockResolvedValue({ id: "asset1" });

    const result = await deleteBrandAssetAction("asset1");

    expect(result).toEqual({ ok: true, data: { id: "asset1" } });
    expect(deleteFromStorage).toHaveBeenCalledWith("workspace/w1/bk1/logo.png");
  });
});

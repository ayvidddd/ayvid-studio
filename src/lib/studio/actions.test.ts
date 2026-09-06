import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const designFindFirst = vi.fn();
const designCreate = vi.fn();
const designFindMany = vi.fn();
const designUpdate = vi.fn();
const designVersionFindFirst = vi.fn();
const designVersionFindMany = vi.fn();
const designVersionCount = vi.fn();
const designVersionCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    design: {
      findFirst: (...args: unknown[]) => designFindFirst(...args),
      create: (...args: unknown[]) => designCreate(...args),
      findMany: (...args: unknown[]) => designFindMany(...args),
      update: (...args: unknown[]) => designUpdate(...args),
    },
    designVersion: {
      findFirst: (...args: unknown[]) => designVersionFindFirst(...args),
      findMany: (...args: unknown[]) => designVersionFindMany(...args),
      count: (...args: unknown[]) => designVersionCount(...args),
      create: (...args: unknown[]) => designVersionCreate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const requireCurrentWorkspace = vi.fn();
vi.mock("@/lib/workspace/current", () => ({
  requireCurrentWorkspace: () => requireCurrentWorkspace(),
}));

const { createDesign, listDesigns, getDesign, saveDesignVersion, listDesignVersions } = await import("./actions");

const validCanvas = { width: 1080, height: 1080, layers: [] };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentWorkspace.mockResolvedValue({ workspace: { id: "w1" } });
  transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
});

describe("createDesign", () => {
  it("rejects an empty name", async () => {
    const result = await createDesign("");
    expect(result.ok).toBe(false);
    expect(designCreate).not.toHaveBeenCalled();
  });

  it("creates a design with an initial empty version", async () => {
    designCreate.mockResolvedValue({ id: "d1" });

    const result = await createDesign("Q4 launch banner");

    expect(result).toEqual({ ok: true, data: { id: "d1" } });
    expect(designCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: "w1",
          name: "Q4 launch banner",
          versions: { create: { sequence: 0, layers: { width: 1080, height: 1080, layers: [] } } },
        }),
      }),
    );
  });
});

describe("listDesigns", () => {
  it("returns the workspace's designs", async () => {
    designFindMany.mockResolvedValue([{ id: "d1", name: "A", updatedAt: new Date() }]);

    const result = await listDesigns();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});

describe("getDesign", () => {
  it("fails when the design isn't in the current workspace", async () => {
    designFindFirst.mockResolvedValue(null);

    const result = await getDesign("missing");

    expect(result.ok).toBe(false);
  });

  it("falls back to an empty canvas when no version exists yet", async () => {
    designFindFirst.mockResolvedValue({ id: "d1", name: "Untitled" });
    designVersionFindFirst.mockResolvedValue(null);
    designVersionCount.mockResolvedValue(0);

    const result = await getDesign("d1");

    expect(result).toEqual({
      ok: true,
      data: { id: "d1", name: "Untitled", canvas: { width: 1080, height: 1080, layers: [] }, versionCount: 0 },
    });
  });

  it("returns the latest saved canvas", async () => {
    designFindFirst.mockResolvedValue({ id: "d1", name: "Untitled" });
    designVersionFindFirst.mockResolvedValue({ layers: validCanvas });
    designVersionCount.mockResolvedValue(3);

    const result = await getDesign("d1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.canvas).toEqual(validCanvas);
      expect(result.data.versionCount).toBe(3);
    }
  });
});

describe("saveDesignVersion", () => {
  it("rejects a malformed canvas", async () => {
    const result = await saveDesignVersion("d1", { width: -1, height: 100, layers: [] });
    expect(result.ok).toBe(false);
    expect(designVersionCreate).not.toHaveBeenCalled();
  });

  it("appends the next sequence number", async () => {
    designFindFirst.mockResolvedValue({ id: "d1" });
    designVersionFindFirst.mockResolvedValue({ sequence: 2 });

    const result = await saveDesignVersion("d1", validCanvas);

    expect(result).toEqual({ ok: true, data: { sequence: 3 } });
  });

  it("starts at sequence 0 when no prior version exists", async () => {
    designFindFirst.mockResolvedValue({ id: "d1" });
    designVersionFindFirst.mockResolvedValue(null);

    const result = await saveDesignVersion("d1", validCanvas);

    expect(result).toEqual({ ok: true, data: { sequence: 0 } });
  });
});

describe("listDesignVersions", () => {
  it("returns versions newest-first", async () => {
    designFindFirst.mockResolvedValue({ id: "d1" });
    designVersionFindMany.mockResolvedValue([{ id: "v2", sequence: 1, createdAt: new Date() }]);

    const result = await listDesignVersions("d1");

    expect(result.ok).toBe(true);
    expect(designVersionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sequence: "desc" } }),
    );
  });
});

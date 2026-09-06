import { describe, expect, it, vi, beforeEach } from "vitest";

const workspaceFindUnique = vi.fn();
const workspaceCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...args: unknown[]) => workspaceFindUnique(...args),
      create: (...args: unknown[]) => workspaceCreate(...args),
    },
  },
}));

const { provisionWorkspaceForUser } = await import("./provision");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("provisionWorkspaceForUser", () => {
  it("slugifies the workspace name and creates membership + empty brand kit", async () => {
    workspaceFindUnique.mockResolvedValue(null);
    workspaceCreate.mockResolvedValue({ id: "w1" });

    await provisionWorkspaceForUser("user1", "Ada Lovelace");

    expect(workspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Ada Lovelace's Workspace",
          slug: "ada-lovelace-s-workspace",
          memberships: { create: { userId: "user1", role: "OWNER" } },
          brandKit: { create: { name: "Ada Lovelace", palette: [], bannedWords: [] } },
        }),
      }),
    );
  });

  it("appends a numeric suffix when the slug already exists", async () => {
    workspaceFindUnique
      .mockResolvedValueOnce({ id: "taken" }) // base slug taken
      .mockResolvedValueOnce(null); // -1 suffix free
    workspaceCreate.mockResolvedValue({ id: "w2" });

    await provisionWorkspaceForUser("user2", "Ada");

    expect(workspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "ada-s-workspace-1" }) }),
    );
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const userFindUnique = vi.fn();
const userCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      create: (...args: unknown[]) => userCreate(...args),
    },
  },
}));

const provisionWorkspaceForUser = vi.fn();
vi.mock("@/lib/workspace/provision", () => ({
  provisionWorkspaceForUser: (...args: unknown[]) => provisionWorkspaceForUser(...args),
}));

const { signUpWithCredentials } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signUpWithCredentials", () => {
  it("rejects a short password", async () => {
    const result = await signUpWithCredentials({ name: "Ada", email: "ada@example.com", password: "short" });
    expect(result.ok).toBe(false);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    userFindUnique.mockResolvedValue({ id: "existing-user" });

    const result = await signUpWithCredentials({
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
    });

    expect(result).toEqual({ ok: false, error: "An account with this email already exists." });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("creates a user and provisions a workspace", async () => {
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({ id: "new-user" });
    provisionWorkspaceForUser.mockResolvedValue({ id: "w1" });

    const result = await signUpWithCredentials({
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
    });

    expect(result).toEqual({ ok: true, data: { userId: "new-user" } });
    expect(provisionWorkspaceForUser).toHaveBeenCalledWith("new-user", "Ada");
  });
});

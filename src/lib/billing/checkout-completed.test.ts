import { describe, expect, it, vi, beforeEach } from "vitest";

const creditPurchaseFindUnique = vi.fn();
const transaction = vi.fn();
const txCreditPurchaseUpdate = vi.fn();
const txWorkspaceUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditPurchase: {
      findUnique: (...args: unknown[]) => creditPurchaseFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const { creditWorkspaceForSession } = await import("./checkout-completed");

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      creditPurchase: { update: txCreditPurchaseUpdate },
      workspace: { update: txWorkspaceUpdate },
    }),
  );
});

describe("creditWorkspaceForSession", () => {
  it("no-ops when no purchase matches the session", async () => {
    creditPurchaseFindUnique.mockResolvedValue(null);

    await creditWorkspaceForSession({ id: "cs_123" } as never);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("no-ops when the purchase is already completed (idempotent on webhook retries)", async () => {
    creditPurchaseFindUnique.mockResolvedValue({ id: "p1", status: "COMPLETED", workspaceId: "w1", creditsPurchased: 100 });

    await creditWorkspaceForSession({ id: "cs_123" } as never);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("credits the workspace and marks the purchase completed", async () => {
    creditPurchaseFindUnique.mockResolvedValue({ id: "p1", status: "PENDING", workspaceId: "w1", creditsPurchased: 100 });

    await creditWorkspaceForSession({ id: "cs_123" } as never);

    expect(txCreditPurchaseUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ status: "COMPLETED" }),
    });
    expect(txWorkspaceUpdate).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { creditBalance: { increment: 100 } },
    });
  });
});

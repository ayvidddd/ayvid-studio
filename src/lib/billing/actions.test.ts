import { describe, expect, it, vi, beforeEach } from "vitest";

const creditPurchaseCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditPurchase: {
      create: (...args: unknown[]) => creditPurchaseCreate(...args),
    },
  },
}));

const requireCurrentWorkspace = vi.fn();
vi.mock("@/lib/workspace/current", () => ({
  requireCurrentWorkspace: () => requireCurrentWorkspace(),
}));

const checkoutSessionsCreate = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...args: unknown[]) => checkoutSessionsCreate(...args) } } }),
}));

const { createCheckoutSession } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentWorkspace.mockResolvedValue({ workspace: { id: "w1" } });
});

describe("createCheckoutSession", () => {
  it("fails for an unknown pack id", async () => {
    const result = await createCheckoutSession("nonexistent");
    expect(result).toEqual({ ok: false, error: "Unknown credit pack." });
    expect(checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("creates a pending CreditPurchase and returns the checkout URL", async () => {
    checkoutSessionsCreate.mockResolvedValue({ id: "cs_123", url: "https://checkout.stripe.com/cs_123" });

    const result = await createCheckoutSession("starter");

    expect(result).toEqual({ ok: true, data: { url: "https://checkout.stripe.com/cs_123" } });
    expect(creditPurchaseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "w1",
        stripeCheckoutSessionId: "cs_123",
        packId: "starter",
        creditsPurchased: 100,
      }),
    });
  });

  it("fails when Stripe doesn't return a checkout URL", async () => {
    checkoutSessionsCreate.mockResolvedValue({ id: "cs_123", url: null });

    const result = await createCheckoutSession("starter");

    expect(result).toEqual({ ok: false, error: "Stripe did not return a checkout URL." });
    expect(creditPurchaseCreate).not.toHaveBeenCalled();
  });

  it("fails gracefully if Stripe throws", async () => {
    checkoutSessionsCreate.mockRejectedValue(new Error("network error"));

    const result = await createCheckoutSession("starter");

    expect(result).toEqual({ ok: false, error: "Could not start checkout. Please try again." });
  });
});

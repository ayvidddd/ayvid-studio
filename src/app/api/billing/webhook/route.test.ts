import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const constructEvent = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: (...args: unknown[]) => constructEvent(...args) } }),
}));

const creditWorkspaceForSession = vi.fn();
vi.mock("@/lib/billing/checkout-completed", () => ({
  creditWorkspaceForSession: (...args: unknown[]) => creditWorkspaceForSession(...args),
}));

const { POST } = await import("./route");

function makeRequest(body: string, signature: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("stripe-signature", signature);
  return new NextRequest("http://localhost/api/billing/webhook", { method: "POST", body, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/billing/webhook", () => {
  it("rejects requests missing the stripe-signature header", async () => {
    const response = await POST(makeRequest("{}", null));
    expect(response.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const response = await POST(makeRequest("{}", "t=1,v1=bad"));

    expect(response.status).toBe(400);
    expect(creditWorkspaceForSession).not.toHaveBeenCalled();
  });

  it("credits the workspace on checkout.session.completed", async () => {
    const session = { id: "cs_123" };
    constructEvent.mockReturnValue({ type: "checkout.session.completed", data: { object: session } });

    const response = await POST(makeRequest("{}", "t=1,v1=good"));

    expect(response.status).toBe(200);
    expect(creditWorkspaceForSession).toHaveBeenCalledWith(session);
  });

  it("ignores unrelated event types", async () => {
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: {} } });

    const response = await POST(makeRequest("{}", "t=1,v1=good"));

    expect(response.status).toBe(200);
    expect(creditWorkspaceForSession).not.toHaveBeenCalled();
  });
});

import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Credits the workspace for a completed Stripe Checkout Session. Idempotent —
 * Stripe retries webhook delivery, and this may run more than once for the
 * same event, so it no-ops once the purchase is already COMPLETED.
 */
export async function creditWorkspaceForSession(session: Stripe.Checkout.Session): Promise<void> {
  const purchase = await prisma.creditPurchase.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (!purchase || purchase.status === "COMPLETED") return;

  await prisma.$transaction(async (tx) => {
    await tx.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await tx.workspace.update({
      where: { id: purchase.workspaceId },
      data: { creditBalance: { increment: purchase.creditsPurchased } },
    });
  });
}

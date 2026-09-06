"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getStripe } from "@/lib/billing/stripe";
import { findCreditPack } from "@/lib/billing/packs";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function createCheckoutSession(packId: string): Promise<ActionResult<{ url: string }>> {
  const pack = findCreditPack(packId);
  if (!pack) return fail("Unknown credit pack.");

  try {
    const { workspace } = await requireCurrentWorkspace();
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: workspace.id,
      success_url: `${baseUrl}/billing?purchase=success`,
      cancel_url: `${baseUrl}/billing?purchase=canceled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pack.currency,
            unit_amount: pack.priceCents,
            product_data: {
              name: `Ayvid Studio — ${pack.label} credit pack`,
              description: `${pack.credits} credits`,
            },
          },
        },
      ],
      metadata: { workspaceId: workspace.id, packId: pack.id },
    });

    if (!session.url) return fail("Stripe did not return a checkout URL.");

    await prisma.creditPurchase.create({
      data: {
        workspaceId: workspace.id,
        stripeCheckoutSessionId: session.id,
        packId: pack.id,
        creditsPurchased: pack.credits,
        amountCents: pack.priceCents,
        currency: pack.currency,
      },
    });

    return ok({ url: session.url });
  } catch {
    return fail("Could not start checkout. Please try again.");
  }
}

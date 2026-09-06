import "server-only";
import Stripe from "stripe";

/**
 * Built lazily (not at module scope) so merely importing this module doesn't
 * crash in environments without Stripe configured yet — mirrors the Supabase
 * admin client in src/lib/storage/supabase.ts.
 */
let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  cached = new Stripe(secretKey, { typescript: true });
  return cached;
}

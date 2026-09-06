export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  currency: string;
  description: string;
}

/**
 * Fixed credit packs, priced inline via Stripe Checkout's `price_data` so no
 * dashboard-side Product/Price setup is required to run this app.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter",
    credits: 100,
    priceCents: 900,
    currency: "usd",
    description: "A handful of image generations to try the studio out.",
  },
  {
    id: "studio",
    label: "Studio",
    credits: 600,
    priceCents: 4900,
    currency: "usd",
    description: "Enough for a full campaign — images, video, and copy.",
  },
  {
    id: "agency",
    label: "Agency",
    credits: 1500,
    priceCents: 9900,
    currency: "usd",
    description: "For running several brands' campaigns in parallel.",
  },
];

export function findCreditPack(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === packId);
}

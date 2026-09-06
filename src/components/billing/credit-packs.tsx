"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createCheckoutSession } from "@/lib/billing/actions";
import type { CreditPack } from "@/lib/billing/packs";

export function CreditPacks({ packs }: { packs: CreditPack[] }) {
  const [isPending, startTransition] = useTransition();

  function buy(packId: string) {
    startTransition(async () => {
      const result = await createCheckoutSession(packId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {packs.map((pack) => (
        <Card key={pack.id}>
          <CardHeader>
            <CardTitle>{pack.label}</CardTitle>
            <CardDescription>{pack.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pack.credits} credits</p>
            <p className="text-sm text-muted-foreground">
              ${(pack.priceCents / 100).toFixed(2)} {pack.currency.toUpperCase()}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={isPending} onClick={() => buy(pack.id)}>
              Buy
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createDesign } from "@/lib/studio/actions";
import { toast } from "sonner";

export function NewDesignButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createDesign("Untitled design");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/studio/${result.data.id}`);
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? "Creating…" : "New design"}
    </Button>
  );
}

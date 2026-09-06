import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { CREDIT_PACKS } from "@/lib/billing/packs";
import { CreditPacks } from "@/components/billing/credit-packs";

export default async function BillingPage() {
  const { workspace } = await requireCurrentWorkspace();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} has <span className="font-medium text-foreground">{workspace.creditBalance}</span>{" "}
          credits. Generations (image and video) draw from this balance.
        </p>
      </div>

      <CreditPacks packs={CREDIT_PACKS} />
    </main>
  );
}

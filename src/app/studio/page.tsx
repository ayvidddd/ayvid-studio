import Link from "next/link";
import { listDesigns } from "@/lib/studio/actions";
import { listCampaigns } from "@/lib/campaigns/actions";
import { NewDesignButton } from "@/components/studio/new-design-button";
import { Card } from "@/components/ui/card";

export default async function StudioIndexPage() {
  const [designsResult, campaignsResult] = await Promise.all([listDesigns(), listCampaigns()]);
  const designs = designsResult.ok ? designsResult.data : [];
  const campaigns = campaignsResult.ok ? campaignsResult.data : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Studio</h1>
        <NewDesignButton />
      </div>

      {campaigns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Campaigns</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/studio/campaigns/${campaign.id}`}>
                <Card className="p-4 transition-colors hover:bg-muted">
                  <p className="truncate text-sm font-medium">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">{campaign.designCount} format(s)</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Designs</h2>

        {!designsResult.ok && <p className="text-sm text-destructive">{designsResult.error}</p>}
        {designsResult.ok && designs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No designs yet — create your first one above, or ask the Creative Director in any
            design&apos;s chat to set up a full campaign.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {designs.map((design) => (
            <Link key={design.id} href={`/studio/${design.id}`}>
              <Card className="p-4 transition-colors hover:bg-muted">
                <p className="truncate text-sm font-medium">{design.name}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {design.updatedAt.toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

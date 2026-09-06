import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign } from "@/lib/campaigns/actions";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExportCampaignButton } from "@/components/studio/export-campaign-button";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const result = await getCampaign(campaignId);
  if (!result.ok) notFound();

  const campaign = result.data;
  const variantsByPlatform = new Map<string, typeof campaign.copyVariants>();
  for (const variant of campaign.copyVariants) {
    const list = variantsByPlatform.get(variant.platform) ?? [];
    list.push(variant);
    variantsByPlatform.set(variant.platform, list);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.goal}</p>
        </div>
        <ExportCampaignButton campaignId={campaign.id} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Formats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campaign.designs.map((design) => (
            <Link key={design.id} href={`/studio/${design.id}`}>
              <Card className="p-4 transition-colors hover:bg-muted">
                <p className="truncate text-sm font-medium">{design.formatLabel ?? design.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {campaign.copyVariants.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">Copy</h2>
            {[...variantsByPlatform.entries()].map(([platform, variants]) => (
              <div key={platform} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{platform}</h3>
                {variants.map((variant) => (
                  <div key={variant.id} className="rounded-md border border-border p-3 text-sm">
                    <span className="mr-2 text-xs text-muted-foreground">
                      {variant.kind} · {variant.variantLabel}
                    </span>
                    {variant.text}
                  </div>
                ))}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

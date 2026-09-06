import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { signedBrandAssetUrl } from "@/lib/storage/brand-assets";
import { BrandKitDetailsForm } from "@/components/brand-kit/brand-kit-details-form";
import { BrandAssetsPanel, type BrandAssetWithUrl } from "@/components/brand-kit/brand-assets-panel";
import { Separator } from "@/components/ui/separator";

export default async function BrandKitPage() {
  const { workspace } = await requireCurrentWorkspace();
  const brandKit = workspace.brandKit;

  if (!brandKit) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center text-muted-foreground">
        This workspace doesn&apos;t have a Brand Kit yet. Contact your workspace owner.
      </main>
    );
  }

  const assets: BrandAssetWithUrl[] = await Promise.all(
    brandKit.assets.map(async (asset) => ({
      id: asset.id,
      type: asset.type,
      originalFilename: asset.originalFilename,
      url: await signedBrandAssetUrl(asset.storagePath),
    })),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{workspace.name} — Brand Kit</h1>
        <p className="text-sm text-muted-foreground">
          Every agent in Ayvid Studio reads this before generating anything.
        </p>
      </div>

      <BrandKitDetailsForm
        initial={{
          name: brandKit.name,
          toneOfVoice: brandKit.toneOfVoice,
          headingFont: brandKit.headingFont,
          bodyFont: brandKit.bodyFont,
          bannedWords: brandKit.bannedWords,
          palette: Array.isArray(brandKit.palette) ? (brandKit.palette as string[]) : [],
        }}
      />

      <Separator />

      <BrandAssetsPanel assets={assets} />
    </main>
  );
}

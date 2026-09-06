"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { deleteBrandAssetAction, uploadBrandAssetAction } from "@/lib/brand-kit/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type BrandAssetWithUrl = {
  id: string;
  type: "LOGO" | "PRODUCT_PHOTO" | "SAMPLE_AD";
  originalFilename: string;
  url: string;
};

const SECTIONS: { type: BrandAssetWithUrl["type"]; title: string; hint: string }[] = [
  { type: "LOGO", title: "Logo", hint: "Uploading a logo regenerates your palette automatically." },
  { type: "PRODUCT_PHOTO", title: "Product photos", hint: "Used as reference for generated ads." },
  { type: "SAMPLE_AD", title: "Sample past ads", hint: "Helps the agent match your existing style." },
];

export function BrandAssetsPanel({ assets }: { assets: BrandAssetWithUrl[] }) {
  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <AssetSection
          key={section.type}
          type={section.type}
          title={section.title}
          hint={section.hint}
          assets={assets.filter((a) => a.type === section.type)}
        />
      ))}
    </div>
  );
}

function AssetSection({
  type,
  title,
  hint,
  assets,
}: {
  type: BrandAssetWithUrl["type"];
  title: string;
  hint: string;
  assets: BrandAssetWithUrl[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", type);

    startTransition(async () => {
      const result = await uploadBrandAssetAction(formData);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(`${title} uploaded.`);
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteBrandAssetAction(id);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative h-24 w-24 overflow-hidden rounded-md border border-border">
            <Image src={asset.url} alt={asset.originalFilename} fill className="object-cover" unoptimized />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(asset.id)}
              className="absolute inset-0 hidden items-center justify-center bg-black/60 text-xs text-white group-hover:flex"
            >
              Remove
            </button>
          </div>
        ))}

        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
          {isPending ? "Uploading…" : "+ Upload"}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={isPending}
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}

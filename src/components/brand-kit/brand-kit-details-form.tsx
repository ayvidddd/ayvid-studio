"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBrandKitDetails } from "@/lib/brand-kit/actions";
import { toast } from "sonner";

export type BrandKitDetails = {
  name: string;
  toneOfVoice: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  bannedWords: string[];
  palette: string[];
};

export function BrandKitDetailsForm({ initial }: { initial: BrandKitDetails }) {
  const [name, setName] = useState(initial.name);
  const [toneOfVoice, setToneOfVoice] = useState(initial.toneOfVoice ?? "");
  const [headingFont, setHeadingFont] = useState(initial.headingFont ?? "");
  const [bodyFont, setBodyFont] = useState(initial.bodyFont ?? "");
  const [bannedWordsText, setBannedWordsText] = useState(initial.bannedWords.join(", "));
  const [palette, setPalette] = useState(initial.palette);
  const [isPending, startTransition] = useTransition();

  function updateSwatch(index: number, hex: string) {
    setPalette((prev) => prev.map((c, i) => (i === index ? hex : c)));
  }

  function removeSwatch(index: number) {
    setPalette((prev) => prev.filter((_, i) => i !== index));
  }

  function addSwatch() {
    setPalette((prev) => [...prev, "#888888"]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const bannedWords = bannedWordsText
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);

      const result = await updateBrandKitDetails({
        name,
        toneOfVoice: toneOfVoice || null,
        headingFont: headingFont || null,
        bodyFont: bodyFont || null,
        bannedWords,
        palette,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand Kit saved.");
    });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-name">Brand name</Label>
        <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tone">Tone of voice</Label>
        <Textarea
          id="tone"
          rows={4}
          placeholder="e.g. Confident, playful, never corporate-sounding."
          value={toneOfVoice}
          onChange={(e) => setToneOfVoice(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="heading-font">Heading font</Label>
          <Input id="heading-font" value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="body-font">Body font</Label>
          <Input id="body-font" value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="banned-words">Banned words</Label>
        <Textarea
          id="banned-words"
          rows={2}
          placeholder="Comma-separated, e.g. cheap, discount, guaranteed"
          value={bannedWordsText}
          onChange={(e) => setBannedWordsText(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Palette</Label>
        <div className="flex flex-wrap gap-2">
          {palette.map((hex, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={hex}
                onChange={(e) => updateSwatch(index, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label={`Swatch ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => removeSwatch(index)}
                className="text-[10px] text-muted-foreground hover:text-destructive"
              >
                remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSwatch}
            className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            aria-label="Add swatch"
          >
            +
          </button>
        </div>
        {palette.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Upload a logo below to auto-generate a palette, or add colors manually.
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        Save Brand Kit
      </Button>
    </form>
  );
}

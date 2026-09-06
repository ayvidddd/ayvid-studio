import "server-only";
import { prisma } from "@/lib/prisma";

export interface BrandKitContext {
  name: string;
  toneOfVoice: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  bannedWords: string[];
  palette: string[];
}

export async function loadBrandKitContext(workspaceId: string): Promise<BrandKitContext | null> {
  const brandKit = await prisma.brandKit.findUnique({ where: { workspaceId } });
  if (!brandKit) return null;

  return {
    name: brandKit.name,
    toneOfVoice: brandKit.toneOfVoice,
    headingFont: brandKit.headingFont,
    bodyFont: brandKit.bodyFont,
    bannedWords: brandKit.bannedWords,
    palette: Array.isArray(brandKit.palette) ? (brandKit.palette as string[]) : [],
  };
}

export function formatBrandKitForPrompt(brandKit: BrandKitContext | null): string {
  if (!brandKit) return "This workspace has no Brand Kit configured yet — ask before assuming any style.";

  const lines = [
    `Brand name: ${brandKit.name}`,
    brandKit.toneOfVoice ? `Tone of voice: ${brandKit.toneOfVoice}` : null,
    brandKit.headingFont ? `Heading font: ${brandKit.headingFont}` : null,
    brandKit.bodyFont ? `Body font: ${brandKit.bodyFont}` : null,
    brandKit.palette.length ? `Palette: ${brandKit.palette.join(", ")}` : null,
    brandKit.bannedWords.length ? `Never use these words: ${brandKit.bannedWords.join(", ")}` : null,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

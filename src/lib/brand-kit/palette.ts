import "server-only";
import { Vibrant } from "node-vibrant/node";

const SWATCH_ORDER = ["Vibrant", "DarkVibrant", "LightVibrant", "Muted", "DarkMuted", "LightMuted"] as const;

/** Extracts a default 6-swatch palette from an image buffer, ordered most-to-least prominent. */
export async function extractPaletteFromImage(buffer: Buffer): Promise<string[]> {
  const palette = await Vibrant.from(buffer).getPalette();
  return SWATCH_ORDER.map((name) => palette[name]?.hex).filter((hex): hex is string => !!hex);
}

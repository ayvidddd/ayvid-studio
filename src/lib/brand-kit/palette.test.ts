import { describe, expect, it, vi } from "vitest";

const getPalette = vi.fn();
vi.mock("node-vibrant/node", () => ({
  Vibrant: { from: () => ({ getPalette }) },
}));

const { extractPaletteFromImage } = await import("./palette");

describe("extractPaletteFromImage", () => {
  it("orders swatches Vibrant-first and drops missing ones", async () => {
    getPalette.mockResolvedValue({
      Vibrant: { hex: "#111111" },
      DarkVibrant: null,
      LightVibrant: { hex: "#222222" },
      Muted: { hex: "#333333" },
      DarkMuted: null,
      LightMuted: null,
    });

    const palette = await extractPaletteFromImage(Buffer.from("fake-image"));

    expect(palette).toEqual(["#111111", "#222222", "#333333"]);
  });

  it("returns an empty array when no swatches are found", async () => {
    getPalette.mockResolvedValue({
      Vibrant: null,
      DarkVibrant: null,
      LightVibrant: null,
      Muted: null,
      DarkMuted: null,
      LightMuted: null,
    });

    const palette = await extractPaletteFromImage(Buffer.from("fake-image"));

    expect(palette).toEqual([]);
  });
});

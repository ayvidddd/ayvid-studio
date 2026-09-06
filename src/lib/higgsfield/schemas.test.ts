import { describe, expect, it } from "vitest";
import { ImageGenerationInputSchema, ImageToVideoInputSchema, ImageEditInputSchema } from "./schemas";

describe("ImageGenerationInputSchema", () => {
  it("applies defaults for an omitted resolution/aspectRatio/numImages", () => {
    const parsed = ImageGenerationInputSchema.parse({ prompt: "a red sneaker" });
    expect(parsed).toEqual({ prompt: "a red sneaker", numImages: 1, resolution: "2K", aspectRatio: "4:3" });
  });

  it("rejects more than 4 images (Higgsfield's per-request cap)", () => {
    expect(() => ImageGenerationInputSchema.parse({ prompt: "x", numImages: 5 })).toThrow();
  });

  it("rejects an empty prompt", () => {
    expect(() => ImageGenerationInputSchema.parse({ prompt: "" })).toThrow();
  });

  it("rejects an unsupported aspect ratio", () => {
    expect(() => ImageGenerationInputSchema.parse({ prompt: "x", aspectRatio: "2:1" })).toThrow();
  });
});

describe("ImageToVideoInputSchema", () => {
  it("only accepts a 5s or 10s duration", () => {
    expect(() =>
      ImageToVideoInputSchema.parse({ imageUrl: "https://example.com/a.png", prompt: "pan left", duration: 7 }),
    ).toThrow();
    expect(
      ImageToVideoInputSchema.parse({ imageUrl: "https://example.com/a.png", prompt: "pan left", duration: 10 })
        .duration,
    ).toBe(10);
  });

  it("requires imageUrl to be a real URL, not an arbitrary string", () => {
    expect(() => ImageToVideoInputSchema.parse({ imageUrl: "not-a-url", prompt: "pan left" })).toThrow();
  });

  it("clamps cfgScale to the 0-1 range", () => {
    expect(() =>
      ImageToVideoInputSchema.parse({ imageUrl: "https://example.com/a.png", prompt: "x", cfgScale: 1.5 }),
    ).toThrow();
  });
});

describe("ImageEditInputSchema", () => {
  it("rejects a prompt over the 4000-character cap", () => {
    expect(() =>
      ImageEditInputSchema.parse({ imageUrl: "https://example.com/a.png", prompt: "x".repeat(4001) }),
    ).toThrow();
  });
});

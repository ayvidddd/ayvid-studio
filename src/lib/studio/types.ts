import { z } from "zod";

const baseLayerSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
});

export const imageLayerSchema = baseLayerSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
});

export const textLayerSchema = baseLayerSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().positive(),
  fontFamily: z.string().min(1),
  color: z.string().min(1),
  align: z.enum(["left", "center", "right"]),
});

export const shapeLayerSchema = baseLayerSchema.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse"]),
  fill: z.string().min(1),
});

export const layerSchema = z.discriminatedUnion("type", [imageLayerSchema, textLayerSchema, shapeLayerSchema]);

export const canvasSnapshotSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  layers: z.array(layerSchema).max(50),
});

export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type LayerType = Layer["type"];
export type CanvasSnapshot = z.infer<typeof canvasSnapshotSchema>;

export const EMPTY_CANVAS: CanvasSnapshot = { width: 1080, height: 1080, layers: [] };

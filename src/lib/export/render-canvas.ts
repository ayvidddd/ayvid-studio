"use client";

import Konva from "konva";
import type { CanvasSnapshot, Layer } from "@/lib/studio/types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image for export: ${src}`));
    img.src = src;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function addLayerNode(layer: Konva.Layer, node: Layer): Promise<void> {
  const common = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    opacity: node.opacity,
  };

  if (node.type === "text") {
    layer.add(
      new Konva.Text({
        ...common,
        text: node.text,
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        fill: node.color,
        align: node.align,
      }),
    );
    return;
  }

  if (node.type === "shape") {
    if (node.shape === "ellipse") {
      layer.add(new Konva.Ellipse({ ...common, radiusX: node.width / 2, radiusY: node.height / 2, fill: node.fill }));
    } else {
      layer.add(new Konva.Rect({ ...common, fill: node.fill }));
    }
    return;
  }

  const image = await loadImage(node.src);
  layer.add(new Konva.Image({ ...common, image }));
}

/**
 * Renders a canvas snapshot to a PNG blob using a headless Konva stage — no
 * React tree involved, since this runs outside the live editor (e.g. during
 * campaign export, where each design's canvas is fetched from the server).
 */
export async function renderCanvasToPngBlob(canvas: CanvasSnapshot): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({ container, width: canvas.width, height: canvas.height });
    const layer = new Konva.Layer();
    stage.add(layer);

    for (const node of canvas.layers) {
      // Sequential, not Promise.all — Konva layer ordering must match the
      // original layer array order, and this keeps it deterministic.
      await addLayerNode(layer, node);
    }
    layer.draw();

    const dataUrl = stage.toDataURL({ mimeType: "image/png", pixelRatio: 1 });
    stage.destroy();
    return dataUrlToBlob(dataUrl);
  } finally {
    container.remove();
  }
}

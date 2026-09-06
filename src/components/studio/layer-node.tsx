"use client";

import { useEffect, useRef } from "react";
import { Image as KonvaImage, Text as KonvaText, Rect, Ellipse } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import type { Layer } from "@/lib/studio/types";
import { useStudioStore } from "@/lib/studio/store";

interface LayerNodeProps {
  layer: Layer;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

function useLayerHandlers(layer: Layer) {
  const selectLayer = useStudioStore((s) => s.selectLayer);
  const updateLayerLive = useStudioStore((s) => s.updateLayerLive);
  const commitLayerChange = useStudioStore((s) => s.commitLayerChange);

  return {
    onClick: () => selectLayer(layer.id),
    onTap: () => selectLayer(layer.id),
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      updateLayerLive(layer.id, { x: e.target.x(), y: e.target.y() });
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      commitLayerChange(layer.id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      commitLayerChange(layer.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };
}

/** Shared geometry/interaction props every layer kind renders with. */
function commonProps(layer: Layer, handlers: ReturnType<typeof useLayerHandlers>) {
  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: true,
    ...handlers,
  };
}

export function LayerNode({ layer, registerNode }: LayerNodeProps) {
  const handlers = useLayerHandlers(layer);
  const ref = useRef<Konva.Node | null>(null);

  useEffect(() => {
    registerNode(layer.id, ref.current);
    return () => registerNode(layer.id, null);
  }, [layer.id, registerNode]);

  const setRef = (node: Konva.Node | null) => {
    ref.current = node;
  };

  if (layer.type === "image") {
    return <ImageLayerNode layer={layer} handlers={handlers} setRef={setRef} />;
  }

  if (layer.type === "text") {
    return (
      <KonvaText
        ref={setRef}
        {...commonProps(layer, handlers)}
        text={layer.text}
        fontSize={layer.fontSize}
        fontFamily={layer.fontFamily}
        fill={layer.color}
        align={layer.align}
      />
    );
  }

  if (layer.shape === "ellipse") {
    return (
      <Ellipse
        ref={setRef}
        {...commonProps(layer, handlers)}
        radiusX={layer.width / 2}
        radiusY={layer.height / 2}
        fill={layer.fill}
      />
    );
  }

  return <Rect ref={setRef} {...commonProps(layer, handlers)} fill={layer.fill} />;
}

function ImageLayerNode({
  layer,
  handlers,
  setRef,
}: {
  layer: Extract<Layer, { type: "image" }>;
  handlers: ReturnType<typeof useLayerHandlers>;
  setRef: (node: Konva.Node | null) => void;
}) {
  const [image] = useImage(layer.src, "anonymous");
  return <KonvaImage ref={setRef} {...commonProps(layer, handlers)} image={image} />;
}

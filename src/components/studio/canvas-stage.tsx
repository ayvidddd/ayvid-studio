"use client";

import { useCallback, useEffect, useRef } from "react";
import { Stage, Layer as KonvaLayer, Transformer } from "react-konva";
import type Konva from "konva";
import { useStudioStore } from "@/lib/studio/store";
import { LayerNode } from "./layer-node";

const STAGE_PADDING = 48;
const MAX_STAGE_DISPLAY_SIZE = 720;

export function CanvasStage() {
  const canvas = useStudioStore((s) => s.canvas);
  const selectedLayerId = useStudioStore((s) => s.selectedLayerId);
  const selectLayer = useStudioStore((s) => s.selectLayer);
  const removeLayer = useStudioStore((s) => s.removeLayer);

  const transformerRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef<Map<string, Konva.Node>>(new Map());

  const registerNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = selectedLayerId ? nodesRef.current.get(selectedLayerId) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerId, canvas.layers]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        removeLayer(selectedLayerId);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, removeLayer]);

  const scale = Math.min(1, MAX_STAGE_DISPLAY_SIZE / Math.max(canvas.width, canvas.height));

  return (
    <div
      className="flex items-center justify-center rounded-lg border border-border bg-muted/30"
      style={{ padding: STAGE_PADDING }}
    >
      <Stage
        width={canvas.width * scale}
        height={canvas.height * scale}
        scaleX={scale}
        scaleY={scale}
        className="rounded bg-white shadow-lg"
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) selectLayer(null);
        }}
      >
        <KonvaLayer>
          {canvas.layers.map((layer) => (
            <LayerNode key={layer.id} layer={layer} registerNode={registerNode} />
          ))}
          <Transformer ref={transformerRef} rotateEnabled boundBoxFunc={(_, next) => next} />
        </KonvaLayer>
      </Stage>
    </div>
  );
}

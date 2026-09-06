"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useStudioStore, createLayerId } from "@/lib/studio/store";
import type { Layer } from "@/lib/studio/types";
import { Trash2, Type, Square, Circle } from "lucide-react";

function newTextLayer(): Layer {
  return {
    id: createLayerId(),
    type: "text",
    text: "New headline",
    fontSize: 48,
    fontFamily: "Inter",
    color: "#111111",
    align: "left",
    x: 80,
    y: 80,
    width: 400,
    height: 80,
    rotation: 0,
    opacity: 1,
  };
}

function newShapeLayer(shape: "rect" | "ellipse"): Layer {
  return {
    id: createLayerId(),
    type: "shape",
    shape,
    fill: "#4f46e5",
    x: 120,
    y: 160,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
  };
}

export function LayersPanel() {
  const layers = useStudioStore((s) => s.canvas.layers);
  const selectedLayerId = useStudioStore((s) => s.selectedLayerId);
  const selectLayer = useStudioStore((s) => s.selectLayer);
  const removeLayer = useStudioStore((s) => s.removeLayer);
  const addLayer = useStudioStore((s) => s.addLayer);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border">
      <div className="flex gap-1 p-3">
        <Button size="icon-sm" variant="outline" title="Add text" onClick={() => addLayer(newTextLayer())}>
          <Type />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title="Add rectangle"
          onClick={() => addLayer(newShapeLayer("rect"))}
        >
          <Square />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title="Add ellipse"
          onClick={() => addLayer(newShapeLayer("ellipse"))}
        >
          <Circle />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {layers.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">No layers yet — add one above.</p>
          )}
          {layers
            .slice()
            .reverse()
            .map((layer) => (
              <button
                key={layer.id}
                onClick={() => selectLayer(layer.id)}
                className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                  selectedLayerId === layer.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <span className="truncate">{layerLabel(layer)}</span>
                <Trash2
                  className="size-3.5 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                />
              </button>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function layerLabel(layer: Layer): string {
  if (layer.type === "text") return layer.text || "Text";
  if (layer.type === "image") return "Image";
  return layer.shape === "ellipse" ? "Ellipse" : "Rectangle";
}

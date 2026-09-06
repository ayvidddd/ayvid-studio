"use client";

import { useEffect } from "react";
import { useStudioStore } from "@/lib/studio/store";
import type { CanvasSnapshot } from "@/lib/studio/types";
import { LayersPanel } from "./layers-panel";
import { StudioCanvas } from "./studio-canvas";
import { StudioToolbar } from "./studio-toolbar";
import { ChatPanel } from "./chat-panel";

export function StudioWorkspace({
  designId,
  designName,
  initialCanvas,
}: {
  designId: string;
  designName: string;
  initialCanvas: CanvasSnapshot;
}) {
  const loadDesign = useStudioStore((s) => s.loadDesign);

  useEffect(() => {
    loadDesign(designId, initialCanvas);
    // Only re-run when switching to a different design — not on every
    // initialCanvas reference change, since the store itself now owns edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId]);

  return (
    <div className="flex h-screen flex-col">
      <StudioToolbar designId={designId} designName={designName} />
      <div className="flex flex-1 overflow-hidden">
        <LayersPanel />
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          <StudioCanvas />
        </div>
        <div className="flex w-80 flex-col border-l border-border">
          <ChatPanel designId={designId} />
        </div>
      </div>
    </div>
  );
}

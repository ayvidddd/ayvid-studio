"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Konva touches `window`/canvas APIs at import time, so it can never render
// during SSR.
export const StudioCanvas = dynamic(() => import("./canvas-stage").then((m) => m.CanvasStage), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-[500px]" />,
});

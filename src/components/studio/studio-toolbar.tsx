"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/lib/studio/store";
import { saveDesignVersion } from "@/lib/studio/actions";
import { exportDesignPng } from "@/lib/export/campaign-export";
import { Undo2, Redo2, Save, Download } from "lucide-react";
import { toast } from "sonner";

export function StudioToolbar({ designId, designName }: { designId: string; designName: string }) {
  const canvas = useStudioStore((s) => s.canvas);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const canUndo = useStudioStore((s) => s.canUndo());
  const canRedo = useStudioStore((s) => s.canRedo());
  const [isSaving, startSaving] = useTransition();
  const [isExporting, startExporting] = useTransition();
  const [lastSavedSequence, setLastSavedSequence] = useState<number | null>(null);

  function handleSave() {
    startSaving(async () => {
      const result = await saveDesignVersion(designId, canvas);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLastSavedSequence(result.data.sequence);
      toast.success("Version saved.");
    });
  }

  function handleExportPng() {
    startExporting(async () => {
      try {
        await exportDesignPng(canvas, designName);
      } catch {
        toast.error("Could not export this design as PNG.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2">
      <span className="text-sm font-medium">{designName}</span>
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" disabled={!canUndo} onClick={undo} title="Undo">
          <Undo2 />
        </Button>
        <Button size="icon-sm" variant="ghost" disabled={!canRedo} onClick={redo} title="Redo">
          <Redo2 />
        </Button>
        <Button size="sm" variant="outline" disabled={isSaving} onClick={handleSave}>
          <Save /> {isSaving ? "Saving…" : lastSavedSequence !== null ? `Saved v${lastSavedSequence}` : "Save version"}
        </Button>
        <Button size="sm" variant="outline" disabled={isExporting} onClick={handleExportPng}>
          <Download /> {isExporting ? "Exporting…" : "Export PNG"}
        </Button>
      </div>
    </div>
  );
}

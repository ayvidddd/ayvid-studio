"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportCampaignZip } from "@/lib/export/campaign-export";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ExportCampaignButton({ campaignId }: { campaignId: string }) {
  const [isExporting, startExporting] = useTransition();

  function handleExport() {
    startExporting(async () => {
      try {
        await exportCampaignZip(campaignId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not export this campaign.");
      }
    });
  }

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      <Download /> {isExporting ? "Exporting…" : "Export ZIP"}
    </Button>
  );
}

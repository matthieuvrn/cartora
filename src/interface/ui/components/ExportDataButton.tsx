"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportUserDataAction } from "@/app/(app)/app/user-data-actions";

export function ExportDataButton() {
  const t = useTranslations("Settings");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      const result = await exportUserDataAction();
      if (result.error || !result.data) {
        setError(t("exportError"));
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cartora-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
        <Download className="mr-2 h-4 w-4" />
        {isPending ? "…" : t("exportButton")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

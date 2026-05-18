"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { MenuTemplateRenderer } from "./index";
import { Button } from "@/components/ui/button";
import type { AllergenLabels } from "../AllergenIcons";

type Labels = {
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText: string;
  /** Titre de la section "Aujourd'hui" (S3.1). */
  dailyMenuTitle: string;
  /** Sous-titre optionnel de la section "Aujourd'hui". */
  dailyMenuDescription?: string;
};

type Props = {
  snapshot: PublicMenuSnapshot;
  defaultLocale: "fr" | "en";
  labelsFr: Labels;
  labelsEn: Labels;
  showWatermark: boolean;
};

const STORAGE_KEY = "cartora_locale";

// Stable subscribe function (module-level, no closure needed)
function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function PublicMenuClient({
  snapshot,
  defaultLocale,
  labelsFr,
  labelsEn,
  showWatermark,
}: Props) {
  // getSnapshot reads from localStorage — changes when defaultLocale prop changes (never in practice)
  const getSnapshot = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "fr" || saved === "en" ? saved : defaultLocale;
  }, [defaultLocale]);

  // Server snapshot matches the ISR-rendered locale; client snapshot reads localStorage
  const locale = useSyncExternalStore(subscribeToStorage, getSnapshot, () => defaultLocale);

  const toggle = () => {
    const next = locale === "fr" ? "en" : "fr";
    localStorage.setItem(STORAGE_KEY, next);
    // Dispatch a storage event so useSyncExternalStore triggers a re-render
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  const labels = locale === "fr" ? labelsFr : labelsEn;

  return (
    <>
      <div className="fixed right-3 top-3 z-50">
        <Button variant="outline" size="sm" onClick={toggle}>
          {locale === "fr" ? "EN" : "FR"}
        </Button>
      </div>
      <MenuTemplateRenderer
        snapshot={snapshot}
        locale={locale}
        showWatermark={showWatermark}
        badgeLabels={labels.badgeLabels}
        allergenLabels={labels.allergenLabels}
        allergenSectionLabel={labels.allergenSectionLabel}
        allergenLegendTitle={labels.allergenLegendTitle}
        watermarkText={labels.watermarkText}
        dailyMenuTitle={labels.dailyMenuTitle}
        dailyMenuDescription={labels.dailyMenuDescription}
      />
    </>
  );
}

"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { MenuTemplate } from "./MenuTemplate";
import { Button } from "@/components/ui/button";

type Labels = {
  categoryLabels: Record<CategoryType, string>;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  watermarkText: string;
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
      <MenuTemplate
        snapshot={snapshot}
        locale={locale}
        showWatermark={showWatermark}
        categoryLabels={labels.categoryLabels}
        badgeLabels={labels.badgeLabels}
        watermarkText={labels.watermarkText}
      />
    </>
  );
}

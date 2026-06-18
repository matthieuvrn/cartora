"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { isMenuLocale, MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import { MenuTemplateRenderer } from "./index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AllergenLabels } from "../AllergenIcons";

export type PublicMenuLabels = {
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText: string;
  todaySectionTitle: string;
  todaySectionDescription?: string;
  todaySectionDishesSubtitle?: string;
  todaySectionFormulasSubtitle?: string;
  categoriesNavLabel: string;
};

type Props = {
  snapshot: PublicMenuSnapshot;
  /** Locale affichée au 1er rendu (SSR) — toujours ∈ `snapshot.availableLocales`. */
  defaultLocale: MenuLocale;
  /** Labels i18n par langue disponible (résolus côté page). */
  labelsByLocale: Partial<Record<MenuLocale, PublicMenuLabels>>;
  showWatermark: boolean;
};

const STORAGE_KEY = "cartora_locale";

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Coquille client du menu public : sélecteur de langue (S4 — N langues) + rendu.
 * La langue choisie est persistée en `localStorage` (pas de round-trip serveur) et
 * validée contre `snapshot.availableLocales` — une valeur orpheline (langue
 * désactivée depuis) retombe sur `defaultLocale`. Switcher : bouton bascule à 2
 * langues, rangée de boutons au-delà.
 */
export function PublicMenuClient({
  snapshot,
  defaultLocale,
  labelsByLocale,
  showWatermark,
}: Props) {
  const available = snapshot.availableLocales;

  const getSnapshot = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isMenuLocale(saved) && available.includes(saved)) return saved;
    return defaultLocale;
  }, [defaultLocale, available]);

  const locale = useSyncExternalStore(subscribeToStorage, getSnapshot, () => defaultLocale);

  const select = (next: MenuLocale) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  // Labels de la locale courante, repli sur la langue source (toujours présente).
  const labels = labelsByLocale[locale] ?? labelsByLocale[snapshot.sourceLocale];
  if (!labels) return null;

  return (
    <>
      {available.length > 1 && (
        <div className="fixed right-3 top-3 z-50">
          {available.length === 2 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => select(available.find((l) => l !== locale) ?? defaultLocale)}
            >
              {(available.find((l) => l !== locale) ?? defaultLocale).toUpperCase()}
            </Button>
          ) : (
            <div className="flex gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
              {available.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => select(l)}
                  aria-pressed={l === locale}
                  title={MENU_LOCALE_LABELS[l]}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium uppercase transition-colors",
                    l === locale
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <MenuTemplateRenderer
        snapshot={snapshot}
        locale={locale}
        showWatermark={showWatermark}
        badgeLabels={labels.badgeLabels}
        allergenLabels={labels.allergenLabels}
        allergenSectionLabel={labels.allergenSectionLabel}
        allergenLegendTitle={labels.allergenLegendTitle}
        watermarkText={labels.watermarkText}
        todaySectionTitle={labels.todaySectionTitle}
        todaySectionDescription={labels.todaySectionDescription}
        todaySectionDishesSubtitle={labels.todaySectionDishesSubtitle}
        todaySectionFormulasSubtitle={labels.todaySectionFormulasSubtitle}
        categoriesNavLabel={labels.categoriesNavLabel}
      />
    </>
  );
}

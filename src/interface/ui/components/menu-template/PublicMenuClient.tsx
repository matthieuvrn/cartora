"use client";

import { useSyncExternalStore, useCallback, useState } from "react";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import { TEMPLATE_REGISTRY } from "./registry";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import { MenuTemplateRenderer } from "./index";
import { TrackingBeacon } from "./TrackingBeacon";
import { MENU_LOCALE_STORAGE_KEY, readStoredMenuLocale } from "./menuLocaleStorage";
import { Button } from "@/components/ui/button";
import { COOKIE_BANNER_OFFSET } from "../consent/cookieBannerOffset";
import { cn } from "@/lib/utils";
import type { AllergenLabels } from "../AllergenIcons";

export type PublicMenuLabels = {
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText: string;
  todaySectionTitle: string;
  todaySectionDishesSubtitle?: string;
  todaySectionFormulasSubtitle?: string;
  templateShowcaseLabel: string;
  templateNames: Record<MenuTemplate, string>;
  categoriesNavLabel: string;
};

type Props = {
  snapshot: PublicMenuSnapshot;
  /** Slug public du menu — transmis au beacon analytics (le snapshot ne le porte pas). */
  slug: string;
  /** Locale affichée au 1er rendu (SSR) — toujours ∈ `snapshot.availableLocales`. */
  defaultLocale: MenuLocale;
  /** Labels i18n par langue disponible (résolus côté page). */
  labelsByLocale: Partial<Record<MenuLocale, PublicMenuLabels>>;
  showWatermark: boolean;
  /**
   * Sélecteur de designs (vitrine) : DÉMO UNIQUEMENT — la décision vient du serveur
   * (`slug === DEMO_MENU_SLUG` dans page.tsx), jamais d'un état client. Un vrai
   * restaurant ne doit JAMAIS être re-skinnable par ses visiteurs.
   */
  showcaseTemplates?: boolean;
  /** Skin initial du deep link `?design=` (déjà validé côté serveur). SSR fidèle. */
  initialTemplate?: MenuTemplate;
};

/** Ordre d'affichage du sélecteur = ordre du registry (base d'abord, premium ensuite). */
const SHOWCASE_TEMPLATES = Object.keys(TEMPLATE_REGISTRY) as MenuTemplate[];

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
  slug,
  defaultLocale,
  labelsByLocale,
  showWatermark,
  showcaseTemplates = false,
  initialTemplate,
}: Props) {
  const available = snapshot.availableLocales;

  const getSnapshot = useCallback(
    () => readStoredMenuLocale(available) ?? defaultLocale,
    [defaultLocale, available],
  );

  const locale = useSyncExternalStore(subscribeToStorage, getSnapshot, () => defaultLocale);

  const select = (next: MenuLocale) => {
    localStorage.setItem(MENU_LOCALE_STORAGE_KEY, next);
    window.dispatchEvent(new StorageEvent("storage", { key: MENU_LOCALE_STORAGE_KEY }));
  };

  // Skin affiché (vitrine démo). Initialisé au deep link `?design=` (SSR identique,
  // pas de flash) sinon au template publié. Le switch charge le chunk du skin à la
  // demande (registry `next/dynamic`) ; l'URL est synchronisée en silence
  // (`history.replaceState` — pas de navigation Next, donc pas de re-fetch DB).
  const [template, setTemplate] = useState<MenuTemplate>(
    initialTemplate ?? snapshot.template ?? "CLASSIC",
  );
  const selectTemplate = (next: MenuTemplate) => {
    setTemplate(next);
    const url = new URL(window.location.href);
    url.searchParams.set("design", next.toLowerCase());
    window.history.replaceState(null, "", url);
  };
  const renderedSnapshot =
    showcaseTemplates && template !== snapshot.template ? { ...snapshot, template } : snapshot;

  // Labels de la locale courante, repli sur la langue source (toujours présente).
  const labels = labelsByLocale[locale] ?? labelsByLocale[snapshot.sourceLocale];
  if (!labels) return null;

  return (
    <>
      {/* Monté ICI (et pas dans la page RSC) pour tracker la langue de LECTURE
          réelle — la préférence localStorage du switcher, invisible du serveur. */}
      <TrackingBeacon slug={slug} locale={locale} availableLocales={available} />
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
        snapshot={renderedSnapshot}
        locale={locale}
        showWatermark={showWatermark}
        badgeLabels={labels.badgeLabels}
        allergenLabels={labels.allergenLabels}
        allergenSectionLabel={labels.allergenSectionLabel}
        allergenLegendTitle={labels.allergenLegendTitle}
        watermarkText={labels.watermarkText}
        todaySectionTitle={labels.todaySectionTitle}
        todaySectionDishesSubtitle={labels.todaySectionDishesSubtitle}
        todaySectionFormulasSubtitle={labels.todaySectionFormulasSubtitle}
        categoriesNavLabel={labels.categoriesNavLabel}
      />
      {showcaseTemplates && (
        // Décalée de la bannière cookies (même z-50, montée après dans le DOM) tant qu'elle
        // est visible — sinon la barre était entièrement recouverte.
        <div
          className="fixed inset-x-0 z-50 flex justify-center px-3"
          style={{ bottom: `calc(0.75rem + ${COOKIE_BANNER_OFFSET})` }}
        >
          <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full border bg-background/95 py-1.5 pl-4 pr-3 shadow-lg backdrop-blur">
            <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
              {labels.templateShowcaseLabel}
            </span>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label={labels.templateShowcaseLabel}
            >
              {SHOWCASE_TEMPLATES.map((t) => {
                const tokens = TEMPLATE_REGISTRY[t].defaultTokens;
                const active = t === template;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    aria-pressed={active}
                    aria-label={labels.templateNames[t]}
                    title={labels.templateNames[t]}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border transition-shadow",
                      active
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                        : "hover:ring-1 hover:ring-muted-foreground/60",
                    )}
                    style={{ backgroundColor: tokens.bg }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full"
                      style={{ backgroundColor: tokens.primary }}
                    />
                  </button>
                );
              })}
            </div>
            <span className="shrink-0 text-xs font-semibold">{labels.templateNames[template]}</span>
          </div>
        </div>
      )}
    </>
  );
}

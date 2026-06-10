"use client";

import { useLocale, useTranslations } from "next-intl";
import type { MenuOverview, MenuTemplate } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { buildPublicSnapshot } from "@/domain/menu/PublicMenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { cn } from "@/lib/utils";
import { MenuTemplateRenderer } from "./menu-template";
import type { AllergenLabels } from "./AllergenIcons";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planTier: PlanTier;
  className?: string;
  /**
   * Force le rendu sur un autre template que `menu.template` — utilisé par le sélecteur
   * d'apparence pour prévisualiser un template **non encore sélectionné** (y compris premium
   * verrouillé, avant achat). Sans override, on reflète le template courant du menu.
   */
  templateOverride?: MenuTemplate;
};

/**
 * Rendu live du menu public à partir de l'état BROUILLON courant (`buildPublicSnapshot`), recalculé
 * à chaque rendu serveur — donc mis à jour à chaque save (revalidatePath des actions d'édition).
 *
 * ⚠ Fidélité `/m/[slug]` : enveloppé dans `.theme-public`, qui ré-établit les tokens neutres :root
 * et annule la Fraunces du scope `.theme-app` environnant (cf. globals.css). Source UNIQUE du rendu
 * prévisualisé : réutilisé tel quel par le panneau inline de l'éditeur ET par PreviewDialog. Ne
 * JAMAIS y injecter de tokens Cartora — le contenu doit rester le canvas du restaurateur.
 */
export function MenuPreviewPane({
  menu,
  restaurantName,
  planTier,
  className,
  templateOverride,
}: Props) {
  const tp = useTranslations("PublicMenu");
  const tAllergen = useTranslations("Allergen");
  const locale = useLocale() as "fr" | "en";

  const base = buildPublicSnapshot(menu, restaurantName, new Date().toISOString());
  // Override = on prévisualise un autre template ; sa palette figée vient du CSS `[data-template]`
  // (pas du snapshot), donc surcharger `template` suffit. Branding non embarqué ici comme avant.
  const snapshot = templateOverride ? { ...base, template: templateOverride } : base;

  const badgeLabels: Record<"NEW" | "POPULAR", string> = {
    NEW: tp("badge.NEW"),
    POPULAR: tp("badge.POPULAR"),
  };

  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);

  return (
    <div className={cn("theme-public bg-background text-foreground", className)}>
      <MenuTemplateRenderer
        snapshot={snapshot}
        locale={locale}
        showWatermark={PlanPolicy.shouldShowWatermark(planTier)}
        badgeLabels={badgeLabels}
        allergenLabels={allergenLabels}
        allergenSectionLabel={tAllergen("sectionTitle")}
        allergenLegendTitle={tp("allergenLegendTitle")}
        watermarkText={tp("watermark")}
        todaySectionTitle={tp("todayMenu")}
        todaySectionDescription={tp("todayMenuDescription")}
        categoriesNavLabel={tp("categoriesNav")}
      />
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { useHydrated } from "@/hooks/use-hydrated";
import { isApplePlatform } from "@/lib/command-palette";
import { cn, HIT_AREA_TALL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CategoryChipBar } from "./CategoryChipBar";
import { EditorSearchInput } from "./EditorSearchInput";
import { PreviewDialog } from "./PreviewDialog";

/**
 * Ancre du déclencheur « Aller à… » : sert de repli de focus déterministe quand la palette ne
 * retrouve pas sa cible (cf. `revealEditorTarget`), sans faire circuler une ref entre composants.
 */
export const PALETTE_TRIGGER_ID = "editor-palette-trigger";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planTier: PlanTier;
  categories: { id: string; name: string }[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpenPalette: () => void;
};

/**
 * Toolbar d'édition de « Ma carte » (desktop) : recherche + palette ⌘K (« Aller à… ») + Aperçu,
 * avec la nav par chips (scroll-spy) en seconde rangée. Collante sous la barre de publication
 * globale du shell. Statut + Publier ont migré vers cette barre globale (PublishBar, présente sur
 * toutes les sections) — la toolbar ne garde que les outils propres à l'éditeur. Sur mobile,
 * recherche + Aperçu + chips vivent en haut du contenu (cf. MenuEditor), donc la toolbar reste
 * desktop-only : la palette y reste atteignable au clavier physique via le raccourci.
 */
export function MenuActionBar({
  menu,
  restaurantName,
  planTier,
  categories,
  searchQuery,
  onSearchQueryChange,
  onOpenPalette,
}: Props) {
  const t = useTranslations("Dashboard");
  const isSearching = searchQuery.trim().length > 0;
  // « Ctrl K » au rendu serveur ET au premier rendu client, « ⌘K » après montage sur Apple :
  // aucun écart d'hydratation possible (cf. useHydrated).
  const hydrated = useHydrated();
  const modKey = hydrated && isApplePlatform(navigator.userAgent) ? "⌘K" : "Ctrl K";

  return (
    <div className="sticky top-14 z-10 hidden rounded-xl border bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur md:block">
      <div className="flex items-center gap-2">
        <div className="min-w-0 max-w-xs flex-1">
          <EditorSearchInput value={searchQuery} onChange={onSearchQueryChange} withShortcut />
        </div>
        <Button
          id={PALETTE_TRIGGER_ID}
          variant="ghost"
          size="sm"
          onClick={onOpenPalette}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          className={cn("shrink-0 text-muted-foreground", HIT_AREA_TALL)}
        >
          {t("palette.open")}
          {/* `aria-hidden` : le nom accessible du bouton reste exactement le texte visible. */}
          <kbd
            aria-hidden="true"
            className="rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
          >
            {modKey}
          </kbd>
        </Button>
        <div className="ml-auto">
          <PreviewDialog menu={menu} restaurantName={restaurantName} planTier={planTier} />
        </div>
      </div>

      {categories.length > 1 && !isSearching && (
        <CategoryChipBar categories={categories} className="mt-2" />
      )}
    </div>
  );
}

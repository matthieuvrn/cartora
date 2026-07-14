"use client";

import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { CategoryChipBar } from "./CategoryChipBar";
import { EditorSearchInput } from "./EditorSearchInput";
import { PreviewDialog } from "./PreviewDialog";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planTier: PlanTier;
  categories: { id: string; name: string }[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

/**
 * Toolbar d'édition de « Ma carte » (desktop) : recherche + Aperçu, avec la nav par chips
 * (scroll-spy) en seconde rangée. Collante sous la barre de publication globale du shell.
 * Statut + Publier ont migré vers cette barre globale (PublishBar, présente sur toutes les
 * sections) — la toolbar ne garde que les outils propres à l'éditeur. Sur mobile, recherche +
 * Aperçu + chips vivent en haut du contenu (cf. MenuEditor), donc la toolbar reste desktop-only.
 */
export function MenuActionBar({
  menu,
  restaurantName,
  planTier,
  categories,
  searchQuery,
  onSearchQueryChange,
}: Props) {
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="sticky top-14 z-10 hidden rounded-xl border bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur md:block">
      <div className="flex items-center gap-2">
        <div className="min-w-0 max-w-xs flex-1">
          <EditorSearchInput value={searchQuery} onChange={onSearchQueryChange} withShortcut />
        </div>
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

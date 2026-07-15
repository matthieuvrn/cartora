"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SearchX } from "lucide-react";
import type { DailyDishData, FormulaData, MenuOverview } from "@/domain/menu/MenuTypes";
import { resolveText } from "@/domain/menu/MenuLocale";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import { reorderCategoriesAction, type ItemActionState } from "@/app/(app)/app/actions";
import { matchesQuery } from "@/lib/text-search";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { actionErrorText } from "./actionErrorText";
import { ActivationChecklistCard } from "./ActivationChecklist";
import { AddCategoryButton } from "./AddCategoryButton";
import { CategoryChipBar, categoryAnchorId } from "./CategoryChipBar";
import { CategorySection } from "./CategorySection";
import { SortableList } from "./dnd/SortableList";
import { EditableRestaurantName } from "./EditableRestaurantName";
import { EditorSearchInput } from "./EditorSearchInput";
import { MenuActionBar } from "./MenuActionBar";
import { PreviewDialog } from "./PreviewDialog";
import { TodaySection } from "./TodaySection";
import { TemplateLogo } from "./menu-template/TemplateLogo";

// Persistance de l'état replié des catégories (par menu) : localStorage lu via
// useSyncExternalStore — hydration-safe (server snapshot = null ⇒ tout déplié au
// premier rendu) et synchronisé entre onglets (event `storage`) + dans l'onglet
// courant via un event custom (même pattern que l'ancien toggle live-preview).
const COLLAPSE_SYNC_EVENT = "cartora:collapsed-cats";

function subscribeToCollapseStore(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_SYNC_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_SYNC_EVENT, callback);
  };
}

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  logoPath: string | null;
  planTier: PlanTier;
  activationChecklist: ActivationChecklist | null;
  dismissActivationAction: () => Promise<void>;
  dailyDishes: { active: DailyDishData[]; expired: DailyDishData[] };
  formulas: { active: FormulaData[]; expired: FormulaData[] };
};

/**
 * Canvas d'édition de la carte : toolbar d'édition (recherche + Aperçu, cf.
 * MenuActionBar), nav par chips scroll-spy, en-tête d'identité compact, section
 * « Aujourd'hui » (plats du jour + formules), catégories repliables (état persisté
 * par menu). Statut + Publier vivent dans la barre de publication globale du shell
 * (PublishBar) — commune à toutes les sections. L'aperçu du rendu public se fait à
 * la demande (bouton « Aperçu »). Les surfaces de consultation/admin ont leurs
 * sections — /app/stats, /app/partage, /app/abonnement.
 */
export function MenuEditor({
  menu,
  restaurantName,
  logoPath,
  planTier,
  activationChecklist,
  dismissActivationAction,
  dailyDishes,
  formulas,
}: Props) {
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const sourceLocale = menu.sourceLocale;

  // ─ Recherche instantanée (filtre client : noms d'items, descriptions, noms
  //   de catégories — insensible aux accents, cf. matchesQuery). ────────────
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const visibleCategories = useMemo(() => {
    if (!isSearching) return menu.categories;
    return menu.categories
      .map((category) => {
        // Nom de catégorie qui matche ⇒ toute la catégorie est montrée.
        if (matchesQuery(category.name, searchQuery)) return category;
        return {
          ...category,
          items: category.items.filter(
            (item) =>
              matchesQuery(resolveText(item.texts.name, sourceLocale, sourceLocale), searchQuery) ||
              matchesQuery(
                resolveText(item.texts.description, sourceLocale, sourceLocale),
                searchQuery,
              ),
          ),
        };
      })
      .filter((category) => category.items.length > 0 || matchesQuery(category.name, searchQuery));
  }, [menu.categories, isSearching, searchQuery, sourceLocale]);

  const resultCount = useMemo(
    () => (isSearching ? visibleCategories.reduce((acc, c) => acc + c.items.length, 0) : 0),
    [isSearching, visibleCategories],
  );

  // ─ Sections repliées — persistées par menu (localStorage). ────────────────
  const collapseStorageKey = `cartora:collapsed-cats:${menu.menuId}`;
  const getCollapseSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(collapseStorageKey);
    } catch {
      // localStorage indisponible (navigation privée…) : sections dépliées, non bloquant.
      return null;
    }
  }, [collapseStorageKey]);
  const collapsedRaw = useSyncExternalStore(
    subscribeToCollapseStore,
    getCollapseSnapshot,
    () => null,
  );
  const collapsedIds = useMemo<ReadonlySet<string>>(() => {
    if (!collapsedRaw) return new Set();
    try {
      const parsed: unknown = JSON.parse(collapsedRaw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((v): v is string => typeof v === "string"));
    } catch {
      return new Set();
    }
  }, [collapsedRaw]);

  function setCategoryCollapsed(categoryId: string, collapsed: boolean) {
    const next = new Set(collapsedIds);
    if (collapsed) next.add(categoryId);
    else next.delete(categoryId);
    try {
      window.localStorage.setItem(collapseStorageKey, JSON.stringify([...next]));
      window.dispatchEvent(new Event(COLLAPSE_SYNC_EVENT));
    } catch {
      // Best-effort : sans localStorage, le repli n'est simplement pas persisté.
    }
  }

  // ─ Réordonnancement des catégories : ordre OPTIMISTE (le reducer rejoue
  //   l'ordre demandé sur la liste serveur ; un échec retombe automatiquement
  //   sur l'ordre serveur + toast — pas de surface d'erreur inline ici). ─────
  const [optimisticCategories, applyOptimisticCategoryOrder] = useOptimistic(
    menu.categories,
    (current, orderedIds: string[]) =>
      orderedIds.flatMap((categoryId) => current.find((c) => c.id === categoryId) ?? []),
  );

  const reorderInitialState: ItemActionState = { error: null };
  const wrappedReorderCategories = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await reorderCategoriesAction(prev, formData);
      if (result.error) toast.error(actionErrorText(tErrors, result.error));
      return result;
    },
    [tErrors],
  );
  const [, reorderCategoriesFormAction] = useActionState(
    wrappedReorderCategories,
    reorderInitialState,
  );

  function handleReorderCategories(orderedIds: string[]) {
    const formData = new FormData();
    formData.set("orderedIds", JSON.stringify(orderedIds));
    // Setter optimiste DANS la même transition que l'action — sinon React
    // annule la valeur optimiste dès la fin du rendu courant.
    startTransition(() => {
      applyOptimisticCategoryOrder(orderedIds);
      reorderCategoriesFormAction(formData);
    });
  }

  function handleMoveCategory(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= optimisticCategories.length) return;

    const newIds = optimisticCategories.map((c) => c.id);
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    handleReorderCategories(newIds);
  }

  const chipCategories = optimisticCategories.map((c) => ({ id: c.id, name: c.name }));
  const listedCategories = isSearching ? visibleCategories : optimisticCategories;

  return (
    <div className="space-y-6">
      <MenuActionBar
        menu={menu}
        restaurantName={restaurantName}
        planTier={planTier}
        categories={chipCategories}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* Équivalents mobiles de la toolbar desktop : recherche + Aperçu en haut du
          contenu, chips sticky sous le topbar (enfant direct de la colonne pour que
          le sticky tienne sur toute la hauteur de la page). Publier vit dans la barre
          globale du shell (PublishBar). */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <EditorSearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>
        <PreviewDialog menu={menu} restaurantName={restaurantName} planTier={planTier} />
      </div>
      {!isSearching && chipCategories.length > 1 && (
        <div className="sticky top-14 z-10 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
          <CategoryChipBar categories={chipCategories} />
        </div>
      )}

      <div className={cn("min-w-0", isSearching ? "space-y-6" : "space-y-8")}>
        {isSearching ? (
          <>
            {resultCount > 0 && (
              <p role="status" className="text-sm text-muted-foreground">
                {t("search.results", { count: resultCount })}
              </p>
            )}
            {visibleCategories.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
                <SearchX className="size-8 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
                <p className="text-body-sm text-muted-foreground">
                  {t("search.noResults", { query: searchQuery.trim() })}
                </p>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  {t("search.clear")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {activationChecklist && (
              <ActivationChecklistCard
                checklist={activationChecklist}
                dismissAction={dismissActivationAction}
              />
            )}

            <div className="flex items-center gap-3 border-b pb-4">
              {logoPath &&
                (() => {
                  const url = restaurantLogoUrl(logoPath);
                  return url ? (
                    <TemplateLogo
                      src={url}
                      alt={restaurantName}
                      className="size-8 shrink-0"
                      sizes="32px"
                    />
                  ) : null;
                })()}
              <EditableRestaurantName currentName={restaurantName} />
            </div>

            <TodaySection
              dailyDishes={dailyDishes}
              formulas={formulas}
              planTier={planTier}
              sourceLocale={sourceLocale}
            />
          </>
        )}

        {/* Contexte de tri des catégories — rendu aussi pendant une recherche
            (désactivé) pour que les hooks sortables des sections restent branchés. */}
        <SortableList
          ids={listedCategories.map((c) => c.id)}
          labelFor={(categoryId) => menu.categories.find((c) => c.id === categoryId)?.name ?? ""}
          onReorder={handleReorderCategories}
          disabled={isSearching}
        >
          <div className={cn(isSearching ? "space-y-6" : "space-y-8")}>
            {listedCategories.map((category, index) => (
              <CategorySection
                key={category.id}
                id={isSearching ? undefined : categoryAnchorId(category.id)}
                category={category}
                sourceLocale={sourceLocale}
                canDelete={menu.categories.length > 1}
                collapsed={isSearching ? false : collapsedIds.has(category.id)}
                onCollapsedChange={(collapsed) => setCategoryCollapsed(category.id, collapsed)}
                searchActive={isSearching}
                onMoveUp={
                  !isSearching && index > 0 ? () => handleMoveCategory(index, "up") : undefined
                }
                onMoveDown={
                  !isSearching && index < listedCategories.length - 1
                    ? () => handleMoveCategory(index, "down")
                    : undefined
                }
              />
            ))}
          </div>
        </SortableList>

        {!isSearching && (
          <div className="flex justify-center pt-4">
            <AddCategoryButton categoriesCount={menu.categories.length} planTier={planTier} />
          </div>
        )}
      </div>
    </div>
  );
}

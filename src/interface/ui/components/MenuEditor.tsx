"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SearchX } from "lucide-react";
import type { DailyDishData, FormulaData, MenuOverview } from "@/domain/menu/MenuTypes";
import { resolveText } from "@/domain/menu/MenuLocale";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import { reorderCategoriesAction, type ItemActionState } from "@/app/(app)/app/actions";
import { APP_NAV_ITEMS } from "@/lib/app-nav";
import { buildPaletteEntries, type PaletteEntry } from "@/lib/command-palette";
import { matchesQuery } from "@/lib/text-search";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { actionErrorText } from "./actionErrorText";
import { ActivationChecklistCard } from "./ActivationChecklist";
import { AddCategoryButton } from "./AddCategoryButton";
import { CategoryChipBar, categoryAnchorId } from "./CategoryChipBar";
import { CategorySection } from "./CategorySection";
import { CommandPalette } from "./CommandPalette";
import { SortableList } from "./dnd/SortableList";
import { itemRowId } from "./editorAnchors";
import { EditorSearchInput } from "./EditorSearchInput";
import { EmptyState } from "./EmptyState";
import { MenuActionBar, PALETTE_TRIGGER_ID } from "./MenuActionBar";
import { PreviewDialog } from "./PreviewDialog";
import { revealEditorTarget } from "./revealEditorTarget";
import { TodaySection } from "./TodaySection";

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
  planTier: PlanTier;
  activationChecklist: ActivationChecklist | null;
  dismissActivationAction: () => Promise<void>;
  dailyDishes: { active: DailyDishData[]; expired: DailyDishData[] };
  formulas: { active: FormulaData[]; expired: FormulaData[] };
  /** ISO 8601 UTC, horloge serveur de la requête — base de la ligne « Expire aujourd'hui à … ». */
  nowISO: string;
};

/**
 * Canvas d'édition de la carte : toolbar d'édition (recherche + Aperçu, cf.
 * MenuActionBar + palette de commandes ⌘K), nav par chips scroll-spy, section
 * « Aujourd'hui » repliable (plats du jour + formules — repliée par défaut sans
 * contenu actif), catégories repliables (état persisté par menu). Statut + Publier vivent dans la barre de publication globale du shell
 * (PublishBar) — commune à toutes les sections. L'aperçu du rendu public se fait à
 * la demande (bouton « Aperçu »). Les surfaces de consultation/admin ont leurs
 * sections — /app/stats, /app/partage, /app/abonnement. L'en-tête d'identité (logo/monogramme,
 * nom éditable = seul h1 de la page, chip template, lien version en ligne) est rendu PAR LA PAGE
 * avant l'éditeur (cf. EditorIdentityHeader) : le laisser ici le ferait disparaître dès qu'une
 * recherche est active, laissant /app sans h1.
 */
export function MenuEditor({
  menu,
  restaurantName,
  planTier,
  activationChecklist,
  dismissActivationAction,
  dailyDishes,
  formulas,
  nowISO,
}: Props) {
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const tNav = useTranslations("Nav");
  const router = useRouter();
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

  // ─ Palette de commandes ⌘K (items, catégories, pages — navigation seulement). ──────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Construction différée à la PREMIÈRE ouverture : jusqu'à 50 × 100 entrées et deux `resolveText`
  // par item, à ne pas payer au chargement de la page ni à chaque frappe dans la recherche de
  // l'éditeur (ni `searchQuery` ni `paletteOpen` ne sont des dépendances). Le drapeau ne retombe
  // JAMAIS : le contenu du dialog reste monté pendant son animation de sortie et se reconstruirait
  // sous les yeux de l'utilisateur (les plats et catégories cédant la place aux seules pages).
  const [paletteUsed, setPaletteUsed] = useState(false);
  const openPalette = useCallback(() => {
    setPaletteUsed(true);
    setPaletteOpen(true);
  }, []);
  // Mémo scindé : les pages ne dépendent que des libellés de nav.
  const paletteCategories = useMemo(
    () =>
      paletteUsed
        ? optimisticCategories.map((category) => ({
            id: category.id,
            name: category.name,
            items: category.items.map((item) => ({
              id: item.id,
              name: resolveText(item.texts.name, sourceLocale, sourceLocale),
              description: resolveText(item.texts.description, sourceLocale, sourceLocale),
              isAvailable: item.isAvailable,
            })),
          }))
        : [],
    [paletteUsed, optimisticCategories, sourceLocale],
  );
  const palettePages = useMemo(
    () => APP_NAV_ITEMS.map((nav) => ({ key: nav.key, href: nav.href, label: tNav(nav.key) })),
    [tNav],
  );
  const paletteEntries = useMemo(
    () =>
      buildPaletteEntries({
        categories: paletteCategories,
        pages: palettePages,
        currentPath: "/app",
      }),
    [paletteCategories, palettePages],
  );

  // Raccourci global ⌘K / Ctrl+K — UNE instance (ici, pas dans la sidebar rendue deux fois).
  // Les champs de saisie ne sont PAS exclus (les modificateurs rendent la combinaison sûre) ;
  // un dialog déjà ouvert l'est, y compris quand le focus est retombé sur <body> après un clic
  // sur son overlay : on n'empile jamais deux modales. Le ⌘K frappé DANS la palette est géré par
  // son propre champ (bascule → fermeture).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.repeat) return;
      if (e.key.toLowerCase() !== "k") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[role=dialog]")) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      e.preventDefault();
      openPalette();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  const revealCancelRef = useRef<(() => void) | null>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => revealCancelRef.current?.(), []);

  // Repli de focus déterministe quand la cible n'apparaît jamais (rangée en fenêtre « Annuler ») :
  // le déclencheur de la toolbar desktop, sinon le champ de recherche mobile — jamais <body>.
  // La toolbar est montée À TOUS les viewports (masquée par `hidden md:block`) : tester sa seule
  // présence dans le DOM laisserait le focus sur <body> en mobile, `focus()` étant sans effet sur
  // un élément `display:none`. D'où le test de visibilité réelle (getClientRects).
  function focusPaletteFallback() {
    const trigger = document.getElementById(PALETTE_TRIGGER_ID);
    if (trigger && trigger.getClientRects().length > 0) {
      trigger.focus();
      return;
    }
    mobileSearchRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }

  // Appelé par la palette APRÈS sa fermeture complète (onCloseAutoFocus) : la cible reçoit le focus.
  function handlePaletteSelect(entry: PaletteEntry) {
    if (entry.kind === "page") {
      router.push(entry.href);
      return;
    }
    // Une recherche active retire les ancres et filtre les rangées ; une catégorie repliée cache
    // les siennes — on rétablit le canvas complet puis on retente en rAF jusqu'au re-rendu.
    setSearchQuery("");
    setCategoryCollapsed(entry.categoryId, false);
    revealCancelRef.current?.();
    revealCancelRef.current =
      entry.kind === "item"
        ? revealEditorTarget(itemRowId(entry.itemId), "item", focusPaletteFallback)
        : revealEditorTarget(categoryAnchorId(entry.categoryId), "category", focusPaletteFallback);
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
        onOpenPalette={openPalette}
      />

      {/* Équivalents mobiles de la toolbar desktop : recherche + Aperçu en haut du
          contenu, chips sticky sous le topbar (enfant direct de la colonne pour que
          le sticky tienne sur toute la hauteur de la page). Publier vit dans la barre
          globale du shell (PublishBar). */}
      <div className="flex items-center gap-2 md:hidden">
        <div ref={mobileSearchRef} className="min-w-0 flex-1">
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
        {/* Région live PERSISTANTE : montée avec l'éditeur, AVANT tout contenu de recherche — une
            région créée en même temps que son texte n'est pas annoncée de façon fiable (NVDA,
            VoiceOver). Elle porte le compteur de résultats ; le bloc « aucun résultat », visuel,
            vit dans le flux ci-dessous et n'a donc pas besoin d'être répété ici. */}
        <div role="status" aria-live="polite" className={isSearching ? undefined : "sr-only"}>
          {isSearching && resultCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("search.results", { count: resultCount })}
            </p>
          )}
          {isSearching && visibleCategories.length === 0 && (
            <span className="sr-only">{t("search.noResults", { query: searchQuery.trim() })}</span>
          )}
        </div>
        {isSearching ? (
          <div className="space-y-6">
            {visibleCategories.length === 0 && (
              <EmptyState
                variant="page"
                icon={SearchX}
                description={t("search.noResults", { query: searchQuery.trim() })}
                action={
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                    {t("search.clear")}
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <>
            {activationChecklist && (
              <ActivationChecklistCard
                checklist={activationChecklist}
                dismissAction={dismissActivationAction}
              />
            )}

            <TodaySection
              menuId={menu.menuId}
              dailyDishes={dailyDishes}
              formulas={formulas}
              planTier={planTier}
              sourceLocale={sourceLocale}
              nowISO={nowISO}
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

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        entries={paletteEntries}
        onSelect={handlePaletteSelect}
      />
    </div>
  );
}

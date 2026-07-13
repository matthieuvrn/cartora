"use client";

import { useTranslations } from "next-intl";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { CategoryChipBar } from "./CategoryChipBar";
import { EditorSearchInput } from "./EditorSearchInput";
import { PreviewDialog } from "./PreviewDialog";
import { PublishButton, type PendingTranslation } from "./PublishButton";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  /** Slug public — lien « Voir mon menu » quand le menu est publié. */
  slug: string;
  planTier: PlanTier;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (
    _prev: ActionState<{ success?: boolean }>,
  ) => Promise<ActionState<{ success?: boolean }>>;
  categories: { id: string; name: string }[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  /** Nudge à la publication (PRO) — transmis à PublishButton. */
  pendingTranslation?: PendingTranslation;
};

/**
 * Barre d'actions persistante de « Ma carte » : recherche + statut + Aperçu +
 * Publier, avec la nav par chips (scroll-spy) en seconde rangée sur desktop.
 * Sortie du flux pour rester atteignable quel que soit le scroll : barre basse
 * fixe sur mobile (pouce-friendly — recherche et chips mobiles vivent en haut
 * du contenu, cf. MenuEditor), toolbar flottante collante sur desktop.
 */
export function MenuActionBar({
  menu,
  restaurantName,
  slug,
  planTier,
  publishAction,
  regenerateQrAction,
  categories,
  searchQuery,
  onSearchQueryChange,
  pendingTranslation,
}: Props) {
  const t = useTranslations("Dashboard");
  const isPublished = menu.status === "PUBLISHED";
  // Trois états lisibles (au lieu d'un binaire Brouillon/Publié) : à jour /
  // modifications en attente de publication / jamais publié.
  const statusLabel = isPublished
    ? t("status.upToDate")
    : menu.publishedAt
      ? t("status.unpublishedChanges")
      : t("status.DRAFT");

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div
      className={cn(
        // Mobile : barre basse fixe, safe-area iOS incluse.
        "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        // Desktop : toolbar flottante collante dans le flux de la colonne.
        "md:sticky md:inset-x-auto md:bottom-auto md:top-4 md:z-20 md:rounded-xl md:border md:px-3 md:py-2.5 md:pb-2.5 md:shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="hidden min-w-0 max-w-xs flex-1 md:block">
          <EditorSearchInput value={searchQuery} onChange={onSearchQueryChange} withShortcut />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-caption text-muted-foreground"
            title={statusLabel}
          >
            <span
              className={cn("size-2 rounded-full", isPublished ? "bg-success" : "bg-warning")}
              aria-hidden
            />
            <span className="sr-only sm:not-sr-only">{statusLabel}</span>
          </span>
          <PreviewDialog menu={menu} restaurantName={restaurantName} planTier={planTier} />
          <PublishButton
            planTier={planTier}
            menuStatus={menu.status}
            publishedAt={menu.publishedAt}
            slug={slug}
            publishAction={publishAction}
            regenerateQrAction={regenerateQrAction}
            pendingTranslation={pendingTranslation}
          />
        </div>
      </div>

      {categories.length > 1 && !isSearching && (
        <CategoryChipBar categories={categories} className="mt-2 hidden md:block" />
      )}
    </div>
  );
}

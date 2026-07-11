"use client";

import { useTranslations } from "next-intl";
import { ListTree } from "lucide-react";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PreviewDialog } from "./PreviewDialog";
import { PublishButton } from "./PublishButton";

/** Ancre stable par catégorie — posée par CategorySection, ciblée par la nav « Aller à… ». */
export function categoryAnchorId(categoryId: string): string {
  return `cat-${categoryId}`;
}

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planTier: PlanTier;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (
    _prev: ActionState<{ success?: boolean }>,
  ) => Promise<ActionState<{ success?: boolean }>>;
  categories: { id: string; name: string }[];
};

/**
 * Barre d'actions persistante de « Ma carte » : navigation par catégorie (« Aller à… »), Aperçu
 * (PreviewDialog), Publier et statut. Sortie du flux pour rester atteignable quel que soit le scroll :
 * barre basse fixe sur mobile (pouce-friendly), toolbar flottante collante (`sticky top`) sur desktop.
 *
 * ⚠ À monter HORS de StaggerReveal : ses enfants sont enveloppés dans un `m.div` (transform), et un
 * ancêtre transformé casse `position: sticky/fixed`.
 */
export function MenuActionBar({
  menu,
  restaurantName,
  planTier,
  publishAction,
  regenerateQrAction,
  categories,
}: Props) {
  const t = useTranslations("Dashboard");
  const isPublished = menu.status === "PUBLISHED";

  function scrollToCategory(categoryId: string) {
    document
      .getElementById(categoryAnchorId(categoryId))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={cn(
        // Mobile : barre basse fixe, safe-area iOS incluse.
        "fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        // Desktop : toolbar flottante collante dans le flux de la colonne.
        "md:sticky md:inset-x-auto md:bottom-auto md:top-4 md:z-20 md:rounded-xl md:border md:px-3 md:py-2.5 md:pb-2.5 md:shadow-sm",
      )}
    >
      {categories.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <ListTree className="size-4 md:mr-2" />
              <span className="sr-only md:not-sr-only">{t("jumpToCategory")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {categories.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => scrollToCategory(c.id)}>
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 text-caption text-muted-foreground"
          title={t(`status.${menu.status}`)}
        >
          <span
            className={cn("size-2 rounded-full", isPublished ? "bg-success" : "bg-warning")}
            aria-hidden
          />
          <span className="sr-only sm:not-sr-only">{t(`status.${menu.status}`)}</span>
        </span>
        <PreviewDialog menu={menu} restaurantName={restaurantName} planTier={planTier} />
        <PublishButton
          planTier={planTier}
          menuStatus={menu.status}
          publishAction={publishAction}
          regenerateQrAction={regenerateQrAction}
        />
      </div>
    </div>
  );
}

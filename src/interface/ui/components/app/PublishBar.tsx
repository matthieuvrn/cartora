"use client";

import { useTranslations } from "next-intl";
import { publishMenuAction, regenerateQrAction } from "@/app/(app)/app/actions";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";
import { cn } from "@/lib/utils";
import { PublishButton } from "../PublishButton";

/**
 * Barre de publication globale, montée dans le shell (AppShell) → présente sur TOUTES
 * les sections `/app`. Là où l'utilisateur modifie sa carte (template, couleurs, plats,
 * langues…), l'affordance « Publier » le suit : plus besoin de revenir sur « Ma carte ».
 * Elle réutilise `PublishButton` (CTA à 3 états, FREE→tarifs, nudge de traduction,
 * récupération QR). Neutre quand publié + à jour ou jamais publié ; ambre uniquement pour
 * « modifications non publiées » — le vrai point de douleur (on avait publié, on a changé
 * quelque chose). Importe les server actions directement (un client component le peut).
 */
export function PublishBar({ state }: { state: PublishBarState }) {
  const t = useTranslations("Dashboard");
  const isPublished = state.status === "PUBLISHED";
  const hasUnpublishedChanges = !isPublished && state.publishedAt != null;

  const statusLabel = isPublished
    ? t("status.upToDate")
    : state.publishedAt
      ? t("status.unpublishedChanges")
      : t("status.DRAFT");

  return (
    <div
      className={cn(
        "sticky top-14 z-20 border-b backdrop-blur md:top-0",
        hasUnpublishedChanges
          ? "border-warning/30 bg-warning/10"
          : "border-transparent bg-background/95",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-10">
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              isPublished ? "bg-success" : "bg-warning",
            )}
            aria-hidden
          />
          <span className="truncate">{statusLabel}</span>
        </span>
        <div className="ml-auto shrink-0">
          <PublishButton
            planTier={state.planTier}
            menuStatus={state.status}
            publishedAt={state.publishedAt}
            slug={state.slug}
            publishAction={publishMenuAction}
            regenerateQrAction={regenerateQrAction}
            pendingTranslation={state.pendingTranslation}
          />
        </div>
      </div>
    </div>
  );
}

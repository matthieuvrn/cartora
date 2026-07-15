"use client";

import { publishMenuAction } from "@/app/(app)/app/actions";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";
import { cn } from "@/lib/utils";
import { PublishButton } from "../PublishButton";
import { PublishShareCluster } from "./PublishShareCluster";
import { StatusDot, publishView } from "./PublishStatusBadge";

/**
 * Contrôle de publication compact, monté à droite du logo dans la topbar mobile
 * (`AppShell`, `md:hidden`). Remplace l'ancienne 2ᵉ barre sticky mobile : point de
 * statut + action essentielle (CTA « Publier » en brouillon/modifications, icônes
 * Copier/Voir quand le menu est en ligne).
 */
export function PublishControlCompact({
  state,
  className,
}: {
  state: PublishBarState;
  className?: string;
}) {
  const view = publishView(state.status, state.publishedAt);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <StatusDot view={view} className="mr-0.5" />
      {view === "published" ? (
        <PublishShareCluster slug={state.slug} compact />
      ) : (
        <PublishButton
          planTier={state.planTier}
          menuStatus={state.status}
          publishedAt={state.publishedAt}
          publishAction={publishMenuAction}
          pendingTranslation={state.pendingTranslation}
          labelVariant="short"
        />
      )}
    </div>
  );
}

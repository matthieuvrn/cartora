"use client";

import { useCallback, useState } from "react";
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
 *
 * Après une publication, le focus est rendu au premier bouton du cluster (« Copier le lien ») :
 * le CTA qui le portait est démonté par le refresh RSC.
 */
export function PublishControlCompact({
  state,
  className,
}: {
  state: PublishBarState;
  className?: string;
}) {
  const view = publishView(state.status, state.publishedAt);
  // Jeton incrémenté à chaque publication réussie depuis CE contrôle : le cluster qui remplace
  // le CTA « Publier » reprend alors le focus (une seule fois par publication).
  const [focusToken, setFocusToken] = useState(0);
  // Stabilisé : `onPublished` entre dans les dépendances du `useCallback` de PublishButton.
  const handlePublished = useCallback(() => setFocusToken((n) => n + 1), []);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <StatusDot view={view} className="mr-0.5" />
      {view === "published" ? (
        <PublishShareCluster slug={state.slug} compact focusToken={focusToken} />
      ) : (
        <PublishButton
          planTier={state.planTier}
          menuStatus={state.status}
          publishedAt={state.publishedAt}
          publishAction={publishMenuAction}
          pendingTranslation={state.pendingTranslation}
          labelVariant="short"
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}

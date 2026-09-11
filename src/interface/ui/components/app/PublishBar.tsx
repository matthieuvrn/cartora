"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { publishMenuAction } from "@/app/(app)/app/actions";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";
import { menuPath } from "@/lib/public-menu-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PublishButton } from "../PublishButton";
import { PublishShareCluster } from "./PublishShareCluster";
import { PublishStatusBadge, publishView } from "./PublishStatusBadge";

/**
 * Barre de publication globale (desktop) — control-center monté en tête de `<main>`, présent sur
 * toutes les sections `/app`. Sur mobile le contrôle vit dans la topbar (`PublishControlCompact`) :
 * cette barre est donc `hidden md:block` (plus de 2ᵉ barre sticky mobile).
 *
 * Trois états dérivés du couple (status, publishedAt) via `publishView` :
 * - `draft`     → neutre, CTA « Publier ».
 * - `published` → calme, cluster de partage (URL / Copier / Voir).
 * - `changes`   → assertif (ambre), « Voir la version en ligne » + « Publier les modifications ».
 *
 * `published` : après une publication depuis cette barre, le focus est rendu au bouton
 * « Copier le lien » du cluster — le CTA qui le portait vient d'être démonté.
 */
export function PublishBar({ state }: { state: PublishBarState }) {
  const t = useTranslations("Dashboard");
  const view = publishView(state.status, state.publishedAt);
  // Jeton incrémenté à chaque publication réussie depuis CETTE barre : le cluster qui remplace
  // le CTA « Publier » reprend alors le focus (une seule fois par publication).
  const [focusToken, setFocusToken] = useState(0);
  // Stabilisé : `onPublished` entre dans les dépendances du `useCallback` de PublishButton.
  const handlePublished = useCallback(() => setFocusToken((n) => n + 1), []);

  return (
    <div
      className={cn(
        "sticky top-0 z-20 hidden border-b backdrop-blur md:block",
        view === "changes" ? "border-warning/40 bg-warning/10" : "border-border bg-background/85",
      )}
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-10">
        <PublishStatusBadge status={state.status} publishedAt={state.publishedAt} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {view === "published" && (
            <PublishShareCluster slug={state.slug} focusToken={focusToken} />
          )}
          {view === "changes" && (
            <Button asChild variant="outline" size="sm">
              <a href={menuPath(state.slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                {t("viewLiveVersion")}
                {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet. */}
                <span className="sr-only">{t("opensInNewTab")}</span>
              </a>
            </Button>
          )}
          <PublishButton
            planTier={state.planTier}
            menuStatus={state.status}
            publishedAt={state.publishedAt}
            publishAction={publishMenuAction}
            pendingTranslation={state.pendingTranslation}
            onPublished={handlePublished}
          />
        </div>
      </div>
    </div>
  );
}

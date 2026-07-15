"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { publishMenuAction } from "@/app/(app)/app/actions";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";
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
 */
export function PublishBar({ state }: { state: PublishBarState }) {
  const t = useTranslations("Dashboard");
  const view = publishView(state.status, state.publishedAt);

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
          {view === "published" && <PublishShareCluster slug={state.slug} />}
          {view === "changes" && (
            <Button asChild variant="outline" size="sm">
              <a href={`/m/${state.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                {t("viewLiveVersion")}
              </a>
            </Button>
          )}
          <PublishButton
            planTier={state.planTier}
            menuStatus={state.status}
            publishedAt={state.publishedAt}
            publishAction={publishMenuAction}
            pendingTranslation={state.pendingTranslation}
          />
        </div>
      </div>
    </div>
  );
}

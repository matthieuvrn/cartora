"use client";

import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Loader2, AlertTriangle, RefreshCw, Check, ExternalLink } from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { flushAllPendingDeletes } from "@/hooks/use-deferred-delete";
import { ErrorMessage } from "./ErrorMessage";
import { PopIn } from "./PopIn";
import { PricingModal } from "./PricingModal";

type RegenerateState = ActionState<{ success?: boolean }>;

type Props = {
  planTier: PlanTier;
  menuStatus: "DRAFT" | "PUBLISHED";
  /** Dernière publication (ISO) — null si le menu n'a jamais été publié. */
  publishedAt: string | null;
  /** Slug public — cible du lien « Voir mon menu ». */
  slug: string;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (_prev: RegenerateState) => Promise<RegenerateState>;
};

export function PublishButton({
  planTier,
  menuStatus,
  publishedAt,
  slug,
  publishAction,
  regenerateQrAction,
}: Props) {
  const t = useTranslations("Dashboard");
  const [pricingOpen, setPricingOpen] = useState(false);

  const wrappedPublish = useCallback(
    async (prev: PublishActionState) => {
      // Publier snapshote l'état SERVEUR : purge d'abord les suppressions en
      // attente (fenêtre « Annuler ») pour ne pas snapshoter un item que
      // l'utilisateur voit déjà supprimé.
      await flushAllPendingDeletes();
      const result = await publishAction(prev);
      if (result.error === null) toast.success(t("toast.published"));
      return result;
    },
    [publishAction, t],
  );
  const [state, formAction, isPending] = useActionState(wrappedPublish, {
    error: null,
  });

  const [regenState, regenAction, isRegenPending] = useActionState(regenerateQrAction, {
    error: null,
  });

  // FREE = pas de publication. Starter et Pro ont le droit de publier.
  // Le serveur (PublishMenu use case) re-vérifie via PlanPolicy.canPublish, qui
  // refuse aussi les status non-ACTIVE (PAST_DUE, CANCELED) — couvert par
  // le code `plan_inactive` côté state.error.
  if (planTier === "FREE") {
    return (
      <>
        <Button variant="default" size="sm" onClick={() => setPricingOpen(true)}>
          <Send className="mr-2 size-4" />
          {t("publish")}
        </Button>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      </>
    );
  }

  // Sémantique explicite au lieu d'un bouton grisé :
  // - PUBLISHED (à jour)      → lien « Voir mon menu » vers /m/[slug] (le vrai résultat).
  // - DRAFT déjà publié       → CTA « Publier les modifications ».
  // - DRAFT jamais publié     → CTA « Publier ».
  // Toute mutation repasse le menu en DRAFT (markMenuAsDraft) → le CTA se rallume seul.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {menuStatus === "PUBLISHED" ? (
          <Button asChild size="sm" variant="outline">
            <a href={`/m/${slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-4" />
              {t("viewMyMenu")}
            </a>
          </Button>
        ) : (
          <form action={formAction}>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {publishedAt ? (
                <>
                  {/* Libellé long sur desktop, court sur la barre basse mobile. */}
                  <span className="sm:hidden">{t("publish")}</span>
                  <span className="hidden sm:inline">{t("publishChanges")}</span>
                </>
              ) : (
                t("publish")
              )}
            </Button>
          </form>
        )}
      </div>

      {state.error && <ErrorMessage error={state.error} namespace="Dashboard.publishError" />}

      {state.warning?.code === "qr_failed" && !regenState.success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground"
        >
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="flex-1">{t("publishWarning.qr_failed")}</span>
          <form action={regenAction}>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isRegenPending}
              className="h-7"
            >
              {isRegenPending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 size-3" />
              )}
              {t("publishWarning.regenerate")}
            </Button>
          </form>
        </div>
      )}

      {regenState.success && (
        <p role="status" className="flex items-center gap-1 text-sm text-success">
          <PopIn>
            <Check className="size-4" aria-hidden="true" />
          </PopIn>
          {t("publishWarning.regenerated")}
        </p>
      )}

      {regenState.error && <ErrorMessage error={regenState.error} />}
    </div>
  );
}

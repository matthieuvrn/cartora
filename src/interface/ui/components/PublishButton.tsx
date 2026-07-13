"use client";

import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { PublishActionState } from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { flushAllPendingDeletes } from "@/hooks/use-deferred-delete";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { ErrorMessage } from "./ErrorMessage";
import { PopIn } from "./PopIn";
import { PricingModal } from "./PricingModal";

type RegenerateState = ActionState<{ success?: boolean }>;

/** Traductions en attente au moment de publier (nudge PRO). */
export type PendingTranslation = {
  /** Champs manquants/obsolètes, toutes langues activées confondues. */
  todoCount: number;
  /** Langues cibles à traduire (celles avec au moins un champ manquant/obsolète). */
  targetLocales: MenuLocale[];
};

type Props = {
  planTier: PlanTier;
  menuStatus: "DRAFT" | "PUBLISHED";
  /** Dernière publication (ISO) — null si le menu n'a jamais été publié. */
  publishedAt: string | null;
  /** Slug public — cible du lien « Voir mon menu ». */
  slug: string;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (_prev: RegenerateState) => Promise<RegenerateState>;
  /**
   * Nudge à la publication (PRO) : si des champs restent à traduire, publier ouvre
   * une confirmation proposant de traduire d'abord. Absent/`todoCount === 0` ⇒
   * publication directe (comportement historique).
   */
  pendingTranslation?: PendingTranslation;
};

export function PublishButton({
  planTier,
  menuStatus,
  publishedAt,
  slug,
  publishAction,
  regenerateQrAction,
  pendingTranslation,
}: Props) {
  const t = useTranslations("Dashboard");
  const tt = useTranslations("Translations");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const { run: runTranslate, progress, isTranslating } = useAutoTranslate();

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

  // Déclenche la publication (dispatch useActionState) sans payload : l'action ne
  // lit que l'état serveur. Équivaut au submit du <form> historique.
  const doPublish = () => formAction();

  const hasPending = pendingTranslation != null && pendingTranslation.todoCount > 0;

  // Clic « Publier » : nudge si des traductions manquent, sinon publication directe.
  const handlePublishClick = () => {
    if (hasPending) setNudgeOpen(true);
    else doPublish();
  };

  // « Traduire puis publier » : traduit toutes les langues incomplètes, puis publie
  // (seulement si tout a réussi — sinon le toast d'erreur laisse l'utilisateur choisir).
  const handleTranslateThenPublish = async () => {
    if (!pendingTranslation) return;
    const ok = await runTranslate(pendingTranslation.targetLocales);
    if (ok) {
      setNudgeOpen(false);
      doPublish();
    }
  };

  const publishAnyway = () => {
    setNudgeOpen(false);
    doPublish();
  };

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
          <Button
            type="button"
            size="sm"
            disabled={isPending || isTranslating}
            onClick={handlePublishClick}
          >
            {isPending || isTranslating ? (
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

      {hasPending && (
        <Dialog open={nudgeOpen} onOpenChange={(open) => !isTranslating && setNudgeOpen(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("publishNudge.title")}</DialogTitle>
              <DialogDescription>
                {t("publishNudge.body", {
                  count: pendingTranslation.todoCount,
                  langs: pendingTranslation.targetLocales
                    .map((l) => MENU_LOCALE_LABELS[l])
                    .join(", "),
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={publishAnyway} disabled={isTranslating}>
                {t("publishNudge.publishAnyway")}
              </Button>
              <Button onClick={handleTranslateThenPublish} disabled={isTranslating}>
                {isTranslating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                {progress
                  ? tt("autoTranslateProgress", {
                      lang: MENU_LOCALE_LABELS[progress.locale],
                      done: progress.done,
                      total: progress.total,
                    })
                  : t("publishNudge.translateAndPublish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

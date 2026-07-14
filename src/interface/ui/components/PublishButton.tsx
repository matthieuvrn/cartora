"use client";

import { startTransition, useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Loader2, Sparkles } from "lucide-react";
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
import { actionErrorText } from "./actionErrorText";
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
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (_prev: RegenerateState) => Promise<RegenerateState>;
  /**
   * Nudge à la publication (PRO) : si des champs restent à traduire, publier ouvre
   * une confirmation proposant de traduire d'abord. Absent/`todoCount === 0` ⇒
   * publication directe (comportement historique).
   */
  pendingTranslation?: PendingTranslation;
  /** `full` (« Publier les modifications ») ou `short` (« Publier ») — court sur la topbar mobile. */
  labelVariant?: "full" | "short";
};

/**
 * CTA de publication (le cluster de partage « URL / Copier / Voir » de l'état publié vit,
 * lui, dans la barre — pas ici). Trois retours :
 * - FREE            → bouton « Publier » ouvrant les tarifs (PricingModal).
 * - PUBLISHED       → `null` (rien à publier ; la barre affiche le partage).
 * - DRAFT (payant)  → bouton « Publier [les modifications] » + nudge de traduction.
 *
 * Tout le feedback (succès / erreur / QR raté / QR régénéré) passe par des **toasts** sonner :
 * la barre globale reste ainsi une seule ligne, sans bloc qui s'y empile.
 */
export function PublishButton({
  planTier,
  menuStatus,
  publishedAt,
  publishAction,
  regenerateQrAction,
  pendingTranslation,
  labelVariant = "full",
}: Props) {
  const t = useTranslations("Dashboard");
  const tt = useTranslations("Translations");
  const tPublishError = useTranslations("Dashboard.publishError");
  const tErrors = useTranslations("Errors");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const { run: runTranslate, progress, isTranslating } = useAutoTranslate();

  const [regenState, regenAction] = useActionState(regenerateQrAction, { error: null });

  // Résultat de la régénération QR (relancée depuis le toast d'avertissement) → toast.
  useEffect(() => {
    if (regenState.success) toast.success(t("publishWarning.regenerated"));
    else if (regenState.error) toast.error(actionErrorText(tErrors, regenState.error));
  }, [regenState, t, tErrors]);

  const wrappedPublish = useCallback(
    async (prev: PublishActionState) => {
      // Publier snapshote l'état SERVEUR : purge d'abord les suppressions en attente (fenêtre
      // « Annuler ») pour ne pas snapshoter un item que l'utilisateur voit déjà supprimé.
      await flushAllPendingDeletes();
      const result = await publishAction(prev);
      if (result.error) {
        toast.error(actionErrorText(tPublishError, result.error));
      } else {
        toast.success(t("toast.published"));
        // QR raté = non-fatal : le menu est publié. Toast avec action pour régénérer.
        if (result.warning?.code === "qr_failed") {
          toast.warning(t("publishWarning.qr_failed"), {
            action: {
              label: t("publishWarning.regenerate"),
              onClick: () => startTransition(() => regenAction()),
            },
          });
        }
      }
      return result;
    },
    [publishAction, regenAction, t, tPublishError],
  );
  const [, formAction, isPending] = useActionState(wrappedPublish, { error: null });

  // Déclenche la publication (dispatch useActionState) sans payload : l'action ne lit que
  // l'état serveur. Un `<form action>` envelopperait le dispatch dans une transition — on le
  // reproduit à la main ici (sinon `isPending` ne se met pas à jour).
  const doPublish = () => startTransition(() => formAction());

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

  // FREE = pas de publication : le CTA ouvre les tarifs. Le serveur re-vérifie de toute façon
  // (PlanPolicy.canPublish refuse FREE + les status non-ACTIVE → toast d'erreur `plan_inactive`).
  if (planTier === "FREE") {
    return (
      <>
        <Button variant="default" size="sm" onClick={() => setPricingOpen(true)}>
          <Send />
          {t("publish")}
        </Button>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      </>
    );
  }

  // PUBLISHED (à jour) : rien à publier — le cluster de partage (URL/Copier/Voir) vit dans la barre.
  if (menuStatus === "PUBLISHED") return null;

  // DRAFT : CTA de publication. Toute mutation repasse le menu en DRAFT (markMenuAsDraft) → il se rallume seul.
  const label =
    labelVariant === "short" ? t("publish") : publishedAt ? t("publishChanges") : t("publish");

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={isPending || isTranslating}
        onClick={handlePublishClick}
      >
        {isPending || isTranslating ? <Loader2 className="animate-spin" /> : <Send />}
        {label}
      </Button>

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
                {isTranslating ? <Loader2 className="animate-spin" /> : <Sparkles />}
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
    </>
  );
}

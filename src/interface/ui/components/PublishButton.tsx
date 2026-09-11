"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Loader2, Sparkles, ExternalLink } from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { PublishActionState } from "@/app/(app)/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { menuPath } from "@/lib/public-menu-url";
import { flushAllPendingDeletes } from "@/hooks/use-deferred-delete";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { actionErrorText } from "./actionErrorText";
import { PricingModal } from "./PricingModal";

/** Plus long que le défaut sonner (4 s) : le toast porte une action à atteindre au clavier. */
const PUBLISHED_TOAST_DURATION_MS = 8000;

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
  /**
   * Nudge à la publication (PRO) : si des champs restent à traduire, publier ouvre
   * une confirmation proposant de traduire d'abord. Absent/`todoCount === 0` ⇒
   * publication directe (comportement historique).
   */
  pendingTranslation?: PendingTranslation;
  /** `full` (« Publier les modifications ») ou `short` (« Publier ») — court sur la topbar mobile. */
  labelVariant?: "full" | "short";
  /**
   * Appelé après une publication réussie (toast déjà émis). Les parents s'en servent pour rendre
   * le focus au cluster de partage : ce bouton est démonté par le refresh RSC. À stabiliser avec
   * `useCallback` côté parent (il entre dans les dépendances de `wrappedPublish`).
   */
  onPublished?: () => void;
};

/**
 * CTA de publication (le cluster de partage « URL / Copier / Voir » de l'état publié vit,
 * lui, dans la barre — pas ici). Trois retours :
 * - FREE            → bouton « Publier » ouvrant les tarifs (PricingModal).
 * - PUBLISHED       → `null` (rien à publier ; la barre affiche le partage).
 * - DRAFT (payant)  → bouton « Publier [les modifications] » + nudge de traduction.
 *
 * Tout le feedback (succès / erreur) passe par des **toasts** sonner : la barre globale
 * reste ainsi une seule ligne, sans bloc qui s'y empile. Le toast de succès porte un lien
 * « Voir mon menu » et prévient le parent (`onPublished`) pour le retour du focus.
 *
 * Ce lien est `variant="default"` (canard plein) alors que le cluster de partage est `outline` :
 * sur mobile le cluster est icône-seule, le toast est donc la seule sortie LIBELLÉE vers le menu
 * publié. Jamais `cta` (corail) : canard = interaction, le climax du viewport reste « Publier ».
 */
export function PublishButton({
  planTier,
  menuStatus,
  publishedAt,
  publishAction,
  pendingTranslation,
  labelVariant = "full",
  onPublished,
}: Props) {
  const t = useTranslations("Dashboard");
  const tt = useTranslations("Translations");
  const tPublishError = useTranslations("Dashboard.publishError");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const { run: runTranslate, progress, isTranslating } = useAutoTranslate();
  // Le CTA lui-même : cible de repli du focus quand une publication échoue (le bouton reste
  // monté mais il a été blurré par son `disabled`, et le nudge — s'il a servi — ne lui a pas
  // rendu le focus, cf. onCloseAutoFocus).
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  // Vrai quand le nudge se ferme SUR une publication (et non sur Échap/Annuler).
  const publishFromNudgeRef = useRef(false);
  // Armé par une publication en échec : le focus doit revenir au CTA une fois la transition finie.
  const refocusAfterErrorRef = useRef(false);

  const wrappedPublish = useCallback(
    async (prev: PublishActionState) => {
      // Publier snapshote l'état SERVEUR : purge d'abord les suppressions en attente (fenêtre
      // « Annuler ») pour ne pas snapshoter un item que l'utilisateur voit déjà supprimé.
      await flushAllPendingDeletes();
      const result = await publishAction(prev);
      if (result.error) {
        toast.error(actionErrorText(tPublishError, result.error));
        // Échec : le CTA reste monté mais il est encore `disabled` à cet instant (la transition
        // n'est pas terminée) — `focus()` y serait un no-op. On arme le repli, l'effet ci-dessous
        // le joue quand le bouton redevient focalisable.
        refocusAfterErrorRef.current = true;
        return result;
      }
      // Le moment métier n° 1 mérite une sortie : lien « Voir mon menu » (nouvel onglet, même
      // pattern que le cluster de partage). Passé en ReactNode : sonner le rend tel quel, dans le
      // scope `.theme-app` (pill + anneau de focus de marque). Pas de `toast.dismiss` au clic :
      // démonter l'élément focalisé renverrait le focus sur <body> — le toast expire seul.
      const slug = result.slug;
      toast.success(t("toast.published"), {
        description: t("toast.publishedDescription"),
        duration: PUBLISHED_TOAST_DURATION_MS,
        action: slug ? (
          // `ml-auto` : le toast sonner est un flex ; seul son bouton natif est poussé à droite
          // par `--toast-button-margin-start`, un ReactNode ne l'est pas.
          <Button asChild variant="default" size="sm" className="ml-auto">
            <a href={menuPath(slug)} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {t("viewMyMenu")}
              {/* WCAG 3.2.5/G201 : annoncer l'ouverture dans un nouvel onglet. */}
              <span className="sr-only">{t("opensInNewTab")}</span>
            </a>
          </Button>
        ) : undefined,
      });
      onPublished?.();
      return result;
    },
    [publishAction, onPublished, t, tPublishError],
  );
  const [, formAction, isPending] = useActionState(wrappedPublish, { error: null });

  // Repli de focus après un échec (WCAG 2.4.3) : pendant la publication le CTA est `disabled`,
  // le navigateur l'a donc blurré (focus sur <body>) — et le nudge, s'il a servi, n'a pas rendu
  // le focus (cf. onCloseAutoFocus). On le rend une fois la transition finie, et seulement si
  // l'utilisateur n'a pas repris la main ailleurs entre-temps.
  useEffect(() => {
    if (isPending || !refocusAfterErrorRef.current) return;
    refocusAfterErrorRef.current = false;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    publishButtonRef.current?.focus({ preventScroll: true });
  }, [isPending]);

  // Déclenche la publication (dispatch useActionState) sans payload : l'action ne lit que
  // l'état serveur. Un `<form action>` envelopperait le dispatch dans une transition — on le
  // reproduit à la main ici (sinon `isPending` ne se met pas à jour).
  const doPublish = () => startTransition(() => formAction());

  const hasPending = pendingTranslation != null && pendingTranslation.todoCount > 0;

  // Clic « Publier » : nudge si des traductions manquent, sinon publication directe.
  const handlePublishClick = () => {
    if (hasPending) {
      // Remis à zéro à chaque ouverture : si le nudge précédent a été démonté sans jouer
      // `onCloseAutoFocus` (passage en PUBLISHED), un drapeau resté vrai neutraliserait le
      // retour de focus Radix d'une fermeture par Échap.
      publishFromNudgeRef.current = false;
      setNudgeOpen(true);
    } else doPublish();
  };

  // « Traduire puis publier » : traduit toutes les langues incomplètes, puis publie
  // (seulement si tout a réussi — sinon le toast d'erreur laisse l'utilisateur choisir).
  const handleTranslateThenPublish = async () => {
    if (!pendingTranslation) return;
    const ok = await runTranslate(pendingTranslation.targetLocales);
    if (ok) {
      publishFromNudgeRef.current = true;
      setNudgeOpen(false);
      doPublish();
    }
  };

  const publishAnyway = () => {
    publishFromNudgeRef.current = true;
    setNudgeOpen(false);
    doPublish();
  };

  // FREE = pas de publication : le CTA ouvre les tarifs. Le serveur re-vérifie de toute façon
  // (PlanPolicy.canPublish refuse FREE + les status non-ACTIVE → toast d'erreur `plan_inactive`).
  if (planTier === "FREE") {
    return (
      <>
        <Button variant="cta" size="sm" onClick={() => setPricingOpen(true)}>
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
        ref={publishButtonRef}
        type="button"
        variant="cta"
        size="sm"
        disabled={isPending || isTranslating}
        onClick={handlePublishClick}
      >
        {isPending || isTranslating ? <Loader2 className="animate-spin" /> : <Send />}
        {label}
      </Button>

      {hasPending && (
        <Dialog open={nudgeOpen} onOpenChange={(open) => !isTranslating && setNudgeOpen(open)}>
          <DialogContent
            className="sm:max-w-md"
            onCloseAutoFocus={(e) => {
              // Fermeture sur Échap/Annuler : retour de focus Radix normal (le CTA est là).
              // Fermeture SUR une publication : le trigger disparaît au refresh RSC et la
              // restitution Radix entrerait en concurrence avec l'effet du cluster de partage
              // (`focusToken`), qui est la cible voulue — on la neutralise.
              if (!publishFromNudgeRef.current) return;
              publishFromNudgeRef.current = false;
              e.preventDefault();
            }}
          >
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

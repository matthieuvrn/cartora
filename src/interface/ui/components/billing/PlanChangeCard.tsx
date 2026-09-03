"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownRight, Check, Loader2, Sparkles } from "lucide-react";
import type { PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import { changePlanAction } from "@/app/(app)/app/billing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { actionErrorText } from "../actionErrorText";

type Props = {
  currentTier: PaidTier;
  /** Résiliation programmée ⇒ changement bloqué (message à la place du bouton). */
  cancelAtPeriodEnd: boolean;
  /** Fin de période formatée : date d'effet d'une rétrogradation, borne du prorata d'upgrade. */
  periodEndLabel: string;
  /** Prorata d'upgrade formaté (« 13,27 € »), `null` si l'aperçu n'a pas pu être calculé. */
  upgradeAmountLabel: string | null;
};

/**
 * Bloc « Changer de formule » d'un abonné actif : présente l'AUTRE formule payante et
 * confirme dans une Dialog qui dit exactement ce qui va se passer (montant prélevé aujourd'hui
 * pour un upgrade, date d'effet pour une rétrogradation — contrat CGU). L'upgrade est le climax
 * de la page (variant `cta`) ; la rétrogradation reste en outline.
 */
export function PlanChangeCard({
  currentTier,
  cancelAtPeriodEnd,
  periodEndLabel,
  upgradeAmountLabel,
}: Props) {
  const t = useTranslations("Billing");
  const tPricing = useTranslations("Pricing");
  const tErrors = useTranslations("Errors");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isUpgrade = currentTier === "STARTER";
  const targetTier: PaidTier = isUpgrade ? "PRO" : "STARTER";
  const targetKey = isUpgrade ? "pro" : "starter";
  const targetPrice = tPricing(`${targetKey}.price`);
  // `features[0]` = « Tout X inclus » — intro de liste, comme sur la landing.
  const [intro, ...features] = tPricing.raw(`${targetKey}.features`) as string[];

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await changePlanAction({ tier: targetTier });
      if (result.error) {
        toast.error(actionErrorText(tErrors, result.error));
        return;
      }
      setOpen(false);
      toast.success(
        isUpgrade
          ? t("change.toastUpgraded")
          : t("change.toastDowngradeScheduled", { date: periodEndLabel }),
      );
    });
  };

  const confirmLabel = isUpgrade
    ? upgradeAmountLabel
      ? t("change.upgradeConfirm", { amount: upgradeAmountLabel })
      : t("change.upgradeConfirmNoPreview")
    : t("change.downgradeConfirm");

  const dialogBody = isUpgrade
    ? upgradeAmountLabel
      ? t("change.upgradeBody", {
          amount: upgradeAmountLabel,
          date: periodEndLabel,
          price: targetPrice,
        })
      : t("change.upgradeBodyNoPreview", { date: periodEndLabel, price: targetPrice })
    : t("change.downgradeBody", { date: periodEndLabel, price: targetPrice });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("change.title")}</CardTitle>
        <CardDescription>{t("change.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-h3">{t(`tier.${targetTier}`)}</span>
            <span className="font-mono text-caption text-muted-foreground">
              {targetPrice} {t("plan.perMonth")}
            </span>
          </div>
          {intro && <p className="font-mono text-caption font-medium text-sand-500">{intro}</p>}
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-sapin-600" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 lg:pl-6">
          {cancelAtPeriodEnd ? (
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("change.blockedByCancellation")}
            </p>
          ) : (
            <Button variant={isUpgrade ? "cta" : "outline"} onClick={() => setOpen(true)}>
              {isUpgrade ? <Sparkles /> : <ArrowDownRight />}
              {isUpgrade ? t("change.upgradeCta") : t("change.downgradeCta")}
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isUpgrade ? t("change.upgradeTitle") : t("change.downgradeTitle")}
            </DialogTitle>
            <DialogDescription>{dialogBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t("change.dismiss")}
            </Button>
            <Button
              variant={isUpgrade ? "cta" : "default"}
              onClick={handleConfirm}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? t("actions.processing") : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

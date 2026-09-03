"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import type { PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import { changePlanAction, resumeSubscriptionAction } from "@/app/(app)/app/billing-actions";
import { Button } from "@/components/ui/button";
import { actionErrorText } from "../actionErrorText";

/**
 * Reprise d'un abonnement dont la résiliation est programmée. Climax du bloc (variant `cta`) :
 * c'est l'action que l'on souhaite, et la seule proposée tant que la résiliation court.
 */
export function ResumeSubscriptionButton() {
  const t = useTranslations("Billing");
  const tErrors = useTranslations("Errors");
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await resumeSubscriptionAction();
      if (result.error) {
        toast.error(actionErrorText(tErrors, result.error));
        return;
      }
      toast.success(t("cancel.toastResumed"));
    });
  };

  return (
    <Button variant="cta" onClick={handleClick} disabled={isPending} aria-busy={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      {isPending ? t("actions.processing") : t("actions.resume")}
    </Button>
  );
}

/** Lève une rétrogradation programmée en re-choisissant la formule courante (`revert_downgrade`). */
export function KeepCurrentPlanButton({ tier }: { tier: PaidTier }) {
  const t = useTranslations("Billing");
  const tErrors = useTranslations("Errors");
  const [isPending, startTransition] = useTransition();
  const tierLabel = t(`tier.${tier}`);

  const handleClick = () => {
    startTransition(async () => {
      const result = await changePlanAction({ tier });
      if (result.error) {
        toast.error(actionErrorText(tErrors, result.error));
        return;
      }
      toast.success(t("change.toastReverted", { tier: tierLabel }));
    });
  };

  return (
    <Button variant="default" onClick={handleClick} disabled={isPending} aria-busy={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      {isPending ? t("actions.processing") : t("actions.keepPlan", { tier: tierLabel })}
    </Button>
  );
}

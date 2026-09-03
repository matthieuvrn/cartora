"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import { cancelSubscriptionAction } from "@/app/(app)/app/billing-actions";
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
  tier: PaidTier;
  /** Fin de période formatée = date de fin d'accès annoncée dans la confirmation. */
  periodEndLabel: string;
};

/**
 * Résiliation depuis Cartora — toujours à la fin de la période (CGU + FAQ). La Dialog dit
 * la date de fin d'accès, la dépublication qui suit et l'absence de remboursement, et rappelle
 * que la reprise reste possible jusque-là. Bouton en outline : pas un climax, jamais destructif
 * visuellement (l'action n'efface rien).
 */
export function CancelSubscriptionCard({ tier, periodEndLabel }: Props) {
  const t = useTranslations("Billing");
  const tErrors = useTranslations("Errors");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.error) {
        toast.error(actionErrorText(tErrors, result.error));
        return;
      }
      setOpen(false);
      toast.success(t("cancel.toastScheduled", { date: periodEndLabel }));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cancel.title")}</CardTitle>
        <CardDescription>{t("cancel.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("cancel.cta")}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancel.dialogTitle", { tier: t(`tier.${tier}`) })}</DialogTitle>
            <DialogDescription>
              {t("cancel.dialogBody", { date: periodEndLabel })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t("cancel.keep")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? t("actions.processing") : t("cancel.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

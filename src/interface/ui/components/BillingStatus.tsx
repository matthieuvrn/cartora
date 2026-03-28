"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import { createCheckoutAction, createPortalAction } from "@/app/(app)/app/billing-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = {
  planStatus: PlanStatus;
  hasBilling: boolean;
};

export function BillingStatus({ planStatus, hasBilling }: Props) {
  const t = useTranslations("Billing");

  if (planStatus === "ACTIVE") {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            Pro
          </span>
          <p className="text-sm text-muted-foreground">{t("activeDescription")}</p>
        </div>
        <form action={createPortalAction}>
          <Button variant="outline" size="sm" type="submit">
            {t("manageSubscription")}
          </Button>
        </form>
      </div>
    );
  }

  if (planStatus === "PAST_DUE") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("pastDueTitle")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{t("pastDueDescription")}</span>
          <form action={createPortalAction}>
            <Button variant="outline" size="sm" type="submit">
              {t("updatePayment")}
            </Button>
          </form>
        </AlertDescription>
      </Alert>
    );
  }

  if (planStatus === "CANCELED") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground">
            {t("canceledBadge")}
          </span>
          <p className="text-sm text-muted-foreground">{t("canceledDescription")}</p>
        </div>
        <form action={hasBilling ? createPortalAction : createCheckoutAction}>
          <Button size="sm" type="submit">
            {t("resubscribe")}
          </Button>
        </form>
      </div>
    );
  }

  // FREE — badge only, no action (PricingModal handles upgrade via PublishButton)
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        {t("freeBadge")}
      </span>
      <p className="text-sm text-muted-foreground">{t("freeDescription")}</p>
    </div>
  );
}

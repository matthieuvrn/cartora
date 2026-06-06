"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { createPortalAction } from "@/app/(app)/app/billing-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PricingModal } from "./PricingModal";

type Props = {
  planStatus: PlanStatus;
  planTier: PlanTier;
  hasBilling: boolean;
};

export function BillingStatus({ planStatus, planTier, hasBilling }: Props) {
  const t = useTranslations("Billing");
  const [pricingOpen, setPricingOpen] = useState(false);

  if (planStatus === "ACTIVE") {
    // Tier détermine le label affiché. STARTER → "Starter", PRO → "Pro".
    const tierLabel = planTier === "STARTER" ? t("starterBadge") : t("proBadge");
    const tierDescription =
      planTier === "STARTER" ? t("starterDescription") : t("activeDescription");
    return (
      <div className="flex items-center justify-between rounded-lg border bg-background p-4">
        <div className="flex items-center gap-3">
          <Badge variant="success">{tierLabel}</Badge>
          <p className="text-sm text-muted-foreground">{tierDescription}</p>
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
    // Resub → on relance un Checkout (pas le Portal) puisque la subscription Stripe
    // est terminée. La PricingModal présente STARTER + PRO et porte le `tier` choisi.
    return (
      <>
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-background p-4">
          <div className="flex items-center gap-3">
            <Badge variant="danger">{t("canceledBadge")}</Badge>
            <p className="text-sm text-muted-foreground">{t("canceledDescription")}</p>
          </div>
          {hasBilling ? (
            <form action={createPortalAction}>
              <Button size="sm" type="submit">
                {t("resubscribe")}
              </Button>
            </form>
          ) : (
            <Button size="sm" onClick={() => setPricingOpen(true)}>
              {t("resubscribe")}
            </Button>
          )}
        </div>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      </>
    );
  }

  // FREE — badge only, no action (PricingModal handles upgrade via PublishButton)
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
      <Badge variant="default">{t("freeBadge")}</Badge>
      <p className="text-sm text-muted-foreground">{t("freeDescription")}</p>
    </div>
  );
}

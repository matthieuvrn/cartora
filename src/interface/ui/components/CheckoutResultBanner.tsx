"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleX } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

type CheckoutResultBannerProps =
  | { result: "success"; tier: Extract<PlanTier, "STARTER" | "PRO"> }
  | { result: "cancel" };

/**
 * Affiche la bannière post-checkout (succès ou annulation) et nettoie l'URL au mount
 * via `window.history.replaceState`. Pas de `router.replace` : on évite un round-trip
 * serveur et l'invalidation du cache de segment, le query param `?checkout=...` est
 * purement cosmétique (la source de vérité est `planStatus`/`planTier` côté DB).
 */
export function CheckoutResultBanner(props: CheckoutResultBannerProps) {
  const t = useTranslations("Dashboard");

  useEffect(() => {
    window.history.replaceState(null, "", "/app");
  }, []);

  if (props.result === "success") {
    return (
      <Alert className="mb-6">
        <CircleCheck className="size-4" />
        <AlertTitle>{t(`checkoutSuccess.${props.tier}.title`)}</AlertTitle>
        <AlertDescription>{t(`checkoutSuccess.${props.tier}.description`)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <CircleX className="size-4" />
      <AlertTitle>{t("checkoutCancel.title")}</AlertTitle>
      <AlertDescription>{t("checkoutCancel.description")}</AlertDescription>
    </Alert>
  );
}

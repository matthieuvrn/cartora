"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Props = {
  /** `?billing_error=<DomainErrorCode>` posé par les actions de hand-off Stripe. */
  error?: string;
  /** `?billing=<notice>` posé au retour d'un flow du portail (ex. `payment_method_updated`). */
  notice?: string;
};

/**
 * Traduit les query params de retour (Stripe / actions redirect) en toasts, puis nettoie
 * l'URL via `history.replaceState` (pas de `router.replace` : aucun round-trip serveur, le
 * paramètre est purement cosmétique — la source de vérité est l'état rendu par la page).
 */
export function BillingUrlFeedback({ error, notice }: Props) {
  const tErrors = useTranslations("Errors");
  const tBilling = useTranslations("Billing");

  useEffect(() => {
    if (!error && !notice) return;
    if (error) {
      toast.error(tErrors(tErrors.has(error) ? error : "generic"));
    } else if (notice && tBilling.has(`feedback.${notice}`)) {
      toast.success(tBilling(`feedback.${notice}`));
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [error, notice, tErrors, tBilling]);

  return null;
}

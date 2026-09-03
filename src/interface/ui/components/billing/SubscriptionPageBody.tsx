import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { SubscriptionOverview } from "@/application/use-cases/GetSubscriptionOverview";
import { SubscriptionChangePolicy } from "@/domain/billing/SubscriptionChangePolicy";
import { formatBillingAmount, formatBillingDate } from "@/lib/billing-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BillingUrlFeedback } from "./BillingUrlFeedback";
import { CancelSubscriptionCard } from "./CancelSubscriptionCard";
import { InvoicesCard } from "./InvoicesCard";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { PlanChangeCard } from "./PlanChangeCard";
import { PricingTiers } from "./PricingTiers";
import { SubscriptionSummaryCard } from "./SubscriptionSummaryCard";

type Props = {
  overview: SubscriptionOverview;
  /** Stripe injoignable au rendu : la page s'affiche sur l'état DB avec un bandeau d'info. */
  stripeUnavailable?: boolean;
  /** `?billing_error=` / `?billing=` — retours des hand-offs Stripe, traduits en toasts. */
  billingError?: string;
  billingNotice?: string;
};

/**
 * Composition présentationnelle de la page Abonnement (Server Component, sans I/O) : la page
 * route charge l'aperçu et délègue ici — ce qui permet aussi de rendre tous les états à partir
 * de données figées (revue visuelle) sans passer par Stripe. Ordre des blocs :
 * formule courante → (grille des formules | changer de formule) → moyen de paiement →
 * factures → résiliation.
 */
export function SubscriptionPageBody({
  overview,
  stripeUnavailable = false,
  billingError,
  billingNotice,
}: Props) {
  const t = useTranslations("Billing");
  const locale = useLocale();

  const { tier, status, subscription } = overview;
  const isPaidTier = SubscriptionChangePolicy.isPaidTier(tier);
  const periodEndLabel = subscription
    ? formatBillingDate(subscription.currentPeriodEndISO, locale)
    : "";

  // Sans abonnement (jamais souscrit, ou terminé) : la grille des formules remplace le bloc
  // « changer de formule » — on repart par le Checkout.
  const showTiers = status === "FREE" || status === "CANCELED";
  // Abonné actif sans rétrogradation programmée (celle-ci se lève depuis la carte de synthèse).
  const showPlanChange =
    status === "ACTIVE" &&
    subscription !== null &&
    isPaidTier &&
    subscription.scheduledTier === null;
  const showCancel =
    subscription !== null &&
    !subscription.cancelAtPeriodEnd &&
    isPaidTier &&
    (status === "ACTIVE" || status === "PAST_DUE");
  const hasBillingAccount = subscription !== null || overview.invoices.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-h2">{t("sectionTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("sectionDescription")}</p>
      </div>

      <BillingUrlFeedback error={billingError} notice={billingNotice} />

      {stripeUnavailable && (
        <Alert>
          <Info />
          <AlertDescription>{t("feedback.stripeUnavailable")}</AlertDescription>
        </Alert>
      )}

      <SubscriptionSummaryCard overview={overview} />

      {showTiers && (
        <section aria-labelledby="billing-choose-title" className="space-y-4">
          <div>
            <h2 id="billing-choose-title" className="text-h3">
              {t("choose.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("choose.description")}</p>
          </div>
          <PricingTiers currentTier="FREE" layout="page" />
        </section>
      )}

      {showPlanChange && isPaidTier && (
        <PlanChangeCard
          currentTier={tier}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          periodEndLabel={periodEndLabel}
          upgradeAmountLabel={
            overview.upgradePreview
              ? formatBillingAmount(
                  overview.upgradePreview.amountDueCents,
                  overview.upgradePreview.currency,
                  locale,
                )
              : null
          }
        />
      )}

      {subscription && <PaymentMethodCard paymentMethod={subscription.paymentMethod} />}

      {hasBillingAccount && <InvoicesCard invoices={overview.invoices} />}

      {showCancel && isPaidTier && (
        <CancelSubscriptionCard tier={tier} periodEndLabel={periodEndLabel} />
      )}
    </div>
  );
}

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import type { SubscriptionPaymentMethod } from "@/application/ports/PaymentGateway";
import { updatePaymentMethodAction } from "@/app/(app)/app/billing-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingSubmitButton } from "./BillingSubmitButton";

/** Libellés lisibles des réseaux Stripe ; les autres (`sepa_debit`, `link`…) passent tels quels. */
const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cartes_bancaires: "Cartes Bancaires",
  sepa_debit: "SEPA",
};

/**
 * Moyen de paiement par défaut (marque, 4 derniers chiffres, expiration) + mise à jour via
 * le deep link du portail Stripe — la seule étape qui reste chez Stripe (données carte / PCI).
 */
export function PaymentMethodCard({
  paymentMethod,
}: {
  paymentMethod: SubscriptionPaymentMethod | null;
}) {
  const t = useTranslations("Billing");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("paymentMethod.title")}</CardTitle>
        <CardDescription>{t("paymentMethod.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-secondary text-muted-foreground">
            <CreditCard className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          {paymentMethod ? (
            <div className="space-y-0.5">
              <p className="font-mono text-sm tabular-nums">
                {paymentMethod.last4
                  ? t("paymentMethod.card", {
                      brand: BRAND_LABELS[paymentMethod.brand] ?? paymentMethod.brand,
                      last4: paymentMethod.last4,
                    })
                  : (BRAND_LABELS[paymentMethod.brand] ?? paymentMethod.brand)}
              </p>
              {paymentMethod.expMonth !== null && paymentMethod.expYear !== null && (
                <p className="text-caption text-muted-foreground">
                  {t("paymentMethod.expires", {
                    month: String(paymentMethod.expMonth).padStart(2, "0"),
                    year: paymentMethod.expYear,
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("paymentMethod.none")}</p>
          )}
        </div>
        <form action={updatePaymentMethodAction} className="shrink-0">
          <BillingSubmitButton label={t("actions.updatePaymentMethod")} size="sm" />
        </form>
      </CardContent>
    </Card>
  );
}

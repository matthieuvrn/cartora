import { useLocale, useTranslations } from "next-intl";
import { Check, CreditCard, TriangleAlert } from "lucide-react";
import type { SubscriptionOverview } from "@/application/use-cases/GetSubscriptionOverview";
import { SubscriptionChangePolicy } from "@/domain/billing/SubscriptionChangePolicy";
import { updatePaymentMethodAction } from "@/app/(app)/app/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBillingDate } from "@/lib/billing-format";
import { BillingSubmitButton } from "./BillingSubmitButton";
import { KeepCurrentPlanButton, ResumeSubscriptionButton } from "./SubscriptionActions";

type View =
  | "free"
  | "canceled"
  | "past_due"
  | "cancel_scheduled"
  | "downgrade_scheduled"
  | "active";

function resolveView(overview: SubscriptionOverview): View {
  if (overview.status === "FREE") return "free";
  if (overview.status === "CANCELED") return "canceled";
  if (overview.status === "PAST_DUE") return "past_due";
  if (overview.subscription?.cancelAtPeriodEnd) return "cancel_scheduled";
  if (overview.subscription?.scheduledTier) return "downgrade_scheduled";
  return "active";
}

const BADGE_VARIANT: Record<View, "default" | "success" | "warning" | "danger" | "info"> = {
  free: "default",
  canceled: "danger",
  past_due: "danger",
  cancel_scheduled: "warning",
  downgrade_scheduled: "info",
  active: "success",
};

/**
 * Carte « Votre formule » (Server Component) : formule + prix, pastille d'état, ligne de
 * situation (échéance, résiliation ou rétrogradation programmée, impayé…) et l'action
 * contextuelle unique — reprendre, rester en Pro, ou régulariser le paiement (climax `cta`
 * en PAST_DUE : c'est LA chose à faire). Les dates sont formatées ici, en heure de Paris.
 */
export function SubscriptionSummaryCard({ overview }: { overview: SubscriptionOverview }) {
  const t = useTranslations("Billing");
  const tPricing = useTranslations("Pricing");
  const locale = useLocale();

  const view = resolveView(overview);
  const { tier, subscription } = overview;
  const tierLabel = t(`tier.${tier}`);
  const tierKey = tier.toLowerCase() as "free" | "starter" | "pro";
  const price = tPricing(`${tierKey}.price`);
  const periodEnd = subscription ? formatBillingDate(subscription.currentPeriodEndISO, locale) : "";
  const scheduledTier = subscription?.scheduledTier ?? null;
  const rawFeatures = tPricing.raw(`${tierKey}.features`) as string[];
  const hasIntro = tier !== "FREE";
  const intro = hasIntro ? rawFeatures[0] : null;
  const features = hasIntro ? rawFeatures.slice(1) : rawFeatures;

  const statusLabel = {
    free: t("status.free"),
    canceled: t("status.canceled"),
    past_due: t("status.pastDue"),
    cancel_scheduled: t("status.cancelScheduled"),
    downgrade_scheduled: scheduledTier
      ? t("status.downgradeScheduled", { tier: t(`tier.${scheduledTier}`) })
      : t("status.active"),
    active: t("status.active"),
  }[view];

  const detail = {
    free: t("plan.freeHint"),
    canceled: t("status.canceledDetail"),
    past_due: t("status.pastDueDetail"),
    cancel_scheduled: t("status.cancelScheduledDetail", { tier: tierLabel, date: periodEnd }),
    downgrade_scheduled: scheduledTier
      ? t("status.downgradeScheduledDetail", {
          current: tierLabel,
          date: periodEnd,
          tier: t(`tier.${scheduledTier}`),
        })
      : "",
    active: subscription ? t("status.renewsOn", { date: periodEnd }) : t("plan.noBillingDetails"),
  }[view];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("plan.title")}</CardTitle>
        <CardAction>
          <Badge variant={BADGE_VARIANT[view]}>
            {view === "past_due" && <TriangleAlert aria-hidden="true" />}
            {statusLabel}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-h1 font-medium tracking-[-0.04em]">{tierLabel}</span>
          <span className="font-mono text-caption text-muted-foreground tabular-nums">
            {tier === "FREE" ? price : `${price} ${t("plan.perMonth")}`}
          </span>
        </div>

        <p
          className={
            view === "past_due" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {detail}
        </p>

        {view === "past_due" && (
          <form action={updatePaymentMethodAction}>
            <BillingSubmitButton
              label={t("actions.updatePaymentMethod")}
              icon={<CreditCard />}
              variant="cta"
            />
          </form>
        )}
        {view === "cancel_scheduled" && <ResumeSubscriptionButton />}
        {view === "downgrade_scheduled" && SubscriptionChangePolicy.isPaidTier(tier) && (
          <KeepCurrentPlanButton tier={tier} />
        )}

        <div className="border-t pt-5">
          <p className="font-mono text-caption font-medium text-sand-500">
            {intro ?? t("plan.includes")}
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-sapin-600" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

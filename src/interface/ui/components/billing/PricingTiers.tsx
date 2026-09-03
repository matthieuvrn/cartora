"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { createCheckoutAction } from "@/app/(app)/app/billing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BillingSubmitButton } from "./BillingSubmitButton";

type Props = {
  /**
   * Formule courante. FREE (défaut) ⇒ Checkout Stripe sur les cartes payantes. Un abonné
   * actif (STARTER/PRO) change de formule depuis la page Abonnement : ses cartes payantes
   * y renvoient (le Checkout refuserait de toute façon `use_portal_to_change_plan`).
   */
  currentTier?: PlanTier;
  /** `modal` : grille compacte centrée verticalement ; `page` : cartes alignées en haut. */
  layout?: "modal" | "page";
};

/** Chemin de la page Abonnement — cible des abonnés actifs. */
const BILLING_PAGE = "/app/abonnement";

/**
 * Grille des trois formules. Partagée par la `PricingModal` (upsell in-app : PublishButton,
 * TodaySection, TranslationUpsell) et la page Abonnement (FREE / abonnement terminé).
 * Starter = carte INVERSÉE calquée sur la featured de LandingPricing : le remap `.section-nuit`
 * rend le CTA primaire automatiquement porcelaine, `bg-background` (→ nuit-900) écrase le
 * bg-card de la primitive, `shadow-frame!` (important requis : la règle non-layered
 * `[data-slot=card]` de globals.css écrase sinon tout shadow-*). C'est LE point corail du viewport.
 */
export function PricingTiers({ currentTier = "FREE", layout = "modal" }: Props) {
  const t = useTranslations("Pricing");

  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "modal" ? "sm:grid-cols-3 sm:items-center" : "lg:grid-cols-3 lg:items-start",
      )}
    >
      {/* Gratuit */}
      <Card className="flex flex-col border-canard-100">
        <CardHeader>
          <CardTitle className="text-lg">{t("free.name")}</CardTitle>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-1">
            <Price value={t("free.price")} />
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <FeatureList
            features={t.raw("free.features") as string[]}
            checkClassName="text-canard-400"
          />
        </CardContent>

        {currentTier === "FREE" && (
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>
              {t("ctaCurrent")}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Starter — carte inversée (scène nuit) */}
      <Card
        className={cn(
          "section-nuit texture-grain relative z-10 flex flex-col overflow-hidden bg-background text-foreground shadow-frame!",
          layout === "modal" ? "sm:scale-[1.02]" : "lg:scale-[1.02]",
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("starter.name")}</CardTitle>
            {/* Badge corail mono (pattern landing) — LE point corail du viewport. */}
            <span className="rounded-full bg-corail-500 px-2.5 py-0.5 font-mono text-micro tracking-wider text-white uppercase">
              {t("recommended")}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-1">
            <Price value={t("starter.price")} />
            {t("starter.period") && (
              <span className="text-sm text-muted-foreground">{t("starter.period")}</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <FeatureList
            features={t.raw("starter.features") as string[]}
            checkClassName="text-sapin-300"
          />
        </CardContent>

        <CardFooter>
          <PaidTierCta tier="STARTER" currentTier={currentTier} variant="cta" />
        </CardFooter>
      </Card>

      {/* Pro */}
      <Card className="flex flex-col border-canard-100">
        <CardHeader>
          <CardTitle className="text-lg">{t("pro.name")}</CardTitle>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-1">
            <Price value={t("pro.price")} />
            {t("pro.period") && (
              <span className="text-sm text-muted-foreground">{t("pro.period")}</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <FeatureList
            features={t.raw("pro.features") as string[]}
            checkClassName="text-canard-400"
          />
        </CardContent>

        <CardFooter>
          <PaidTierCta tier="PRO" currentTier={currentTier} variant="outline" />
        </CardFooter>
      </Card>
    </div>
  );
}

function FeatureList({ features, checkClassName }: { features: string[]; checkClassName: string }) {
  return (
    <ul className="space-y-3 text-sm">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <Check className={cn("mt-0.5 size-4 shrink-0", checkClassName)} aria-hidden="true" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * CTA d'une carte payante : Checkout (FREE), « Plan actuel » désactivé (formule courante),
 * ou lien vers la page Abonnement (autre abonné actif — le changement de formule s'y fait).
 */
function PaidTierCta({
  tier,
  currentTier,
  variant,
}: {
  tier: "STARTER" | "PRO";
  currentTier: PlanTier;
  variant: "cta" | "outline";
}) {
  const t = useTranslations("Pricing");

  if (currentTier === tier) {
    return (
      <Button className="w-full" variant="outline" disabled>
        {t("ctaCurrent")}
      </Button>
    );
  }

  if (currentTier !== "FREE") {
    return (
      <Button asChild className="w-full" variant={variant}>
        <Link href={BILLING_PAGE}>{t("ctaChoose")}</Link>
      </Button>
    );
  }

  return (
    <form action={createCheckoutAction} className="w-full">
      <input type="hidden" name="tier" value={tier} />
      <BillingSubmitButton label={t("ctaChoose")} variant={variant} className="w-full" />
    </form>
  );
}

// Prix en Fraunces (calqué sur LandingPricing) — `font-display` éditorial, pas `font-mono`
// (le mono est réservé aux prix/data inline : items, KPI). `tabular-nums` pour l'alignement des chiffres.
// `text-h1` (40px) plutôt que le `text-display-lg` (52px) de la landing : la grille est plus dense
// (3 colonnes ~180px au breakpoint sm), display-lg ferait déborder « 29,90 € ». Même esprit éditorial.
function Price({ value }: { value: string }) {
  return (
    <span className="font-display text-h1 font-medium tracking-[-0.04em] whitespace-nowrap tabular-nums">
      {value}
    </span>
  );
}

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { cn } from "@/lib/utils";

type TierKey = "free" | "starter" | "pro";

type TierConfig = {
  key: TierKey;
  event: LandingEventName;
  href: string;
  variant: "primary" | "outline";
  highlighted: boolean;
  /** `features[0]` = « Tout X inclus » (clé existante) rendue en intro de liste distincte. */
  hasBaseIntro: boolean;
  ctaKey: "ctaStartFree" | "ctaPublish" | "ctaGoPro";
  taglineKey: "freeTagline" | "starterTagline" | "proTagline";
  /** Ordre desktop (≥ md). En DOM, Starter est premier → mis en avant au scroll mobile. */
  mdOrder: string;
};

// Ordre DOM = ordre mobile : Starter d'abord (l'option recommandée vue en premier).
// Ordre desktop rétabli en Free / Starter / Pro via les classes md:order-*.
const TIERS: readonly TierConfig[] = [
  {
    key: "starter",
    event: "cta_pricing_starter",
    href: "/signup?plan=starter&src=pricing",
    variant: "primary",
    highlighted: true,
    hasBaseIntro: true,
    ctaKey: "ctaPublish",
    taglineKey: "starterTagline",
    mdOrder: "md:order-2",
  },
  {
    key: "free",
    event: "cta_pricing_free",
    href: "/signup?plan=free&src=pricing",
    variant: "outline",
    highlighted: false,
    hasBaseIntro: false,
    ctaKey: "ctaStartFree",
    taglineKey: "freeTagline",
    mdOrder: "md:order-1",
  },
  {
    key: "pro",
    event: "cta_pricing_pro",
    href: "/signup?plan=pro&src=pricing",
    variant: "outline",
    highlighted: false,
    hasBaseIntro: true,
    ctaKey: "ctaGoPro",
    taglineKey: "proTagline",
    mdOrder: "md:order-3",
  },
] as const;

export function LandingPricing() {
  const tLanding = useTranslations("Landing.pricing");
  const tPricing = useTranslations("Pricing");

  return (
    <LandingSection id="pricing">
      {/* Header de section (pattern DA) : eyebrow mono → h2 Fraunces → sous-titre lead. Centré. */}
      <header className="mx-auto mb-14 max-w-[38rem] text-center md:mb-16">
        <span aria-hidden="true" className="eyebrow-thread mx-auto" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {tLanding("kicker")}
        </p>
        <h2 className="mt-6 text-display-xl text-balance text-canard-950">{tLanding("title")}</h2>
        <p className="mt-5 text-lead text-muted-foreground">{tLanding("subtitle")}</p>
      </header>

      {/* Cascade d'entrée (section parente en variant="fade"). Hiérarchie assumée : la carte
          Starter (conversion) est une scène nuit inversée qui domine ; Free/Pro restent des
          cards porcelaine calmes. Cards non cliquables → hover border/couleur uniquement,
          aucun lift (loi anti fausse-affordance). */}
      <StaggerGroup className="grid gap-6 md:grid-cols-3 md:items-start">
        {TIERS.map((tier) => {
          const titleId = `pricing-${tier.key}-title`;
          const period = tPricing(`${tier.key}.period`);
          const rawFeatures = tPricing.raw(`${tier.key}.features`) as string[];
          const intro = tier.hasBaseIntro ? rawFeatures[0] : null;
          const features = tier.hasBaseIntro ? rawFeatures.slice(1) : rawFeatures;

          return (
            <StaggerItem key={tier.key} className={cn("h-full md:h-auto", tier.mdOrder)}>
              <article
                aria-labelledby={titleId}
                className={cn(
                  "flex h-full flex-col rounded-2xl p-8",
                  tier.highlighted
                    ? // Carte inversée : le remap .section-nuit rend le CTA primaire
                      // automatiquement porcelaine — aucune variante dédiée.
                      "section-nuit texture-grain relative z-10 overflow-hidden bg-background text-foreground shadow-frame md:scale-[1.03]"
                    : "border border-sand-200 bg-card transition-colors hover:border-canard-300/70",
                )}
              >
                {tier.highlighted && (
                  <span className="mb-5 w-fit rounded-full bg-corail-500 px-3 py-1 font-mono text-micro tracking-wider text-white uppercase">
                    {tPricing("recommended")}
                  </span>
                )}

                <h3
                  id={titleId}
                  className={cn("text-h3", tier.highlighted ? "text-sand-50" : "text-canard-950")}
                >
                  {tPricing(`${tier.key}.name`)}
                </h3>
                <p
                  className={cn(
                    "mt-1 text-body-sm",
                    tier.highlighted ? "text-sand-300" : "text-sand-600",
                  )}
                >
                  {tLanding(tier.taglineKey)}
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "display text-display-lg tabular-nums",
                      tier.highlighted ? "text-sand-50" : "text-canard-950",
                    )}
                  >
                    {tPricing(`${tier.key}.price`)}
                  </span>
                  {period && (
                    <span className="font-mono text-caption text-muted-foreground">{period}</span>
                  )}
                </div>

                {intro && (
                  <p
                    className={cn(
                      "mt-8 font-mono text-caption font-medium",
                      tier.highlighted ? "text-sand-300" : "text-sand-500",
                    )}
                  >
                    {intro}
                  </p>
                )}
                <ul className={cn("flex-1 space-y-3", intro ? "mt-4" : "mt-8")}>
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className={cn(
                        "flex items-start gap-2.5 text-body-sm",
                        tier.highlighted ? "text-sand-200" : "text-sand-700",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0 stroke-[1.75]",
                          tier.highlighted ? "text-sapin-300" : "text-sapin-600",
                        )}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <TrackedCtaButton
                  event={tier.event}
                  href={tier.href}
                  variant={tier.variant}
                  size="lg"
                  arrow={tier.highlighted}
                  metadata={{ plan: tier.key }}
                  className="mt-8 w-full"
                >
                  {tPricing(tier.ctaKey)}
                </TrackedCtaButton>
              </article>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <p className="mt-10 text-center font-mono text-caption text-sand-500">{tLanding("footer")}</p>
    </LandingSection>
  );
}

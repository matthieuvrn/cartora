import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
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
  ctaKey: "ctaStartFree" | "ctaChoose";
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
    href: "/signup?plan=starter",
    variant: "primary",
    highlighted: true,
    ctaKey: "ctaChoose",
    taglineKey: "starterTagline",
    mdOrder: "md:order-2",
  },
  {
    key: "free",
    event: "cta_pricing_free",
    href: "/signup?plan=free",
    variant: "outline",
    highlighted: false,
    ctaKey: "ctaStartFree",
    taglineKey: "freeTagline",
    mdOrder: "md:order-1",
  },
  {
    key: "pro",
    event: "cta_pricing_pro",
    href: "/signup?plan=pro",
    variant: "outline",
    highlighted: false,
    ctaKey: "ctaChoose",
    taglineKey: "proTagline",
    mdOrder: "md:order-3",
  },
] as const;

export function LandingPricing() {
  const tLanding = useTranslations("Landing.pricing");
  const tPricing = useTranslations("Pricing");

  return (
    <LandingSection id="pricing" innerClassName="py-20 md:py-32">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h1 md:text-h2">{tLanding("title")}</h2>
        <p className="mt-3 text-body-lg text-sand-700">{tLanding("subtitle")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 md:items-center">
        {TIERS.map((tier) => {
          const titleId = `pricing-${tier.key}-title`;
          const period = tPricing(`${tier.key}.period`);
          return (
            <article
              key={tier.key}
              aria-labelledby={titleId}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border p-7",
                tier.mdOrder,
                tier.highlighted
                  ? "z-10 scale-[1.02] border-sapin-500 bg-sand-50 shadow-xl ring-2 ring-sapin-500 shadow-[var(--shadow-glow)] lg:scale-105"
                  : "border-canard-100 bg-card shadow-sm",
              )}
            >
              {tier.highlighted && (
                <span className="absolute top-0 right-0 rounded-tr-xl rounded-bl-lg bg-sapin-600 px-3 py-1 text-caption font-medium text-sand-50">
                  {tPricing("recommended")}
                </span>
              )}

              <h3 id={titleId} className="text-h3 text-canard-900">
                {tPricing(`${tier.key}.name`)}
              </h3>
              <p className="mt-1 text-body-sm text-sand-600">{tLanding(tier.taglineKey)}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-display-lg font-medium tracking-[-0.04em] text-canard-900 tabular-nums">
                  {tPricing(`${tier.key}.price`)}
                </span>
                {period && <span className="text-body text-sand-600">{period}</span>}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {(tPricing.raw(`${tier.key}.features`) as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-body-sm text-canard-800">
                    <Check
                      className="mt-0.5 size-4 shrink-0 stroke-[2] text-sapin-500"
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
                metadata={{ plan: tier.key }}
                className="mt-8 w-full"
              >
                {tPricing(tier.ctaKey)}
              </TrackedCtaButton>
            </article>
          );
        })}
      </div>

      <p className="mt-8 text-center text-body-sm text-canard-700">{tLanding("footer")}</p>
    </LandingSection>
  );
}

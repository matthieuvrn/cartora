import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { cn } from "@/lib/utils";

type TierKey = "free" | "starter" | "pro";

type TierConfig = {
  key: TierKey;
  event: LandingEventName;
  href: string;
  variant: "primary" | "secondary";
  highlighted: boolean;
  ctaKey: "ctaStartFree" | "ctaChoose";
  taglineKey: "freeTagline" | "starterTagline" | "proTagline";
};

const TIERS: readonly TierConfig[] = [
  {
    key: "free",
    event: "cta_pricing_free",
    href: "/signup?plan=free",
    variant: "secondary",
    highlighted: false,
    ctaKey: "ctaStartFree",
    taglineKey: "freeTagline",
  },
  {
    key: "starter",
    event: "cta_pricing_starter",
    href: "/signup?plan=starter",
    variant: "primary",
    highlighted: true,
    ctaKey: "ctaChoose",
    taglineKey: "starterTagline",
  },
  {
    key: "pro",
    event: "cta_pricing_pro",
    href: "/signup?plan=pro",
    variant: "secondary",
    highlighted: false,
    ctaKey: "ctaChoose",
    taglineKey: "proTagline",
  },
] as const;

export function LandingPricing() {
  const tLanding = useTranslations("Landing.pricing");
  const tPricing = useTranslations("Pricing");

  return (
    <LandingSection id="pricing">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{tLanding("title")}</h2>
        <p className="mt-3 text-muted-foreground">{tLanding("subtitle")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const titleId = `pricing-${tier.key}-title`;
          const period = tPricing(`${tier.key}.period`);
          return (
            <Card
              key={tier.key}
              aria-labelledby={titleId}
              className={cn(
                "relative flex flex-col",
                tier.highlighted ? "border-primary shadow-md" : "border-muted",
              )}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {tPricing("recommended")}
                </span>
              )}
              <CardHeader>
                <CardTitle id={titleId} className="text-lg">
                  {tPricing(`${tier.key}.name`)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{tLanding(tier.taglineKey)}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {tPricing(`${tier.key}.price`)}
                  </span>
                  {period && <span className="text-sm text-muted-foreground">{period}</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  {(tPricing.raw(`${tier.key}.features`) as string[]).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <TrackedCtaButton
                  event={tier.event}
                  href={tier.href}
                  variant={tier.variant}
                  size="lg"
                  metadata={{ plan: tier.key }}
                  className="w-full"
                >
                  {tPricing(tier.ctaKey)}
                </TrackedCtaButton>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">{tLanding("footer")}</p>
    </LandingSection>
  );
}

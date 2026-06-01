import { useTranslations } from "next-intl";
import { Clock, ShieldCheck, X } from "lucide-react";
import { PhoneMockup } from "@/interface/ui/components/PhoneMockup";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { HeroMeshCanvas } from "./HeroMeshCanvas";
import demoMobile from "../../../../public/landing/demo-mobile-hero.png";

// Icônes des 3 segments du micro-trust, dans l'ordre de la copy figée
// (« Sans carte bancaire · Configuration en 10 minutes · Résiliable à tout moment »).
const MICRO_TRUST_ICONS = [X, Clock, ShieldCheck] as const;

export function LandingHero() {
  const t = useTranslations("Landing.hero");
  const microTrustItems = t("microTrust")
    .split(" · ")
    .map((label) => label.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden">
      <HeroMeshCanvas className="absolute inset-0 -z-10 opacity-80" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-20 pb-24 md:grid-cols-12 md:items-center md:gap-10 md:pt-28 md:pb-32">
        {/* Texte — élément LCP, rendu immédiat (aucun opacity-gate) */}
        <div className="md:col-span-7">
          <h1
            id="hero-heading"
            className="text-display-lg text-balance text-canard-900 md:text-display-xl lg:text-display-2xl"
          >
            {t.rich("title", {
              em: (chunks) => <em className="font-medium text-sapin-600 italic">{chunks}</em>,
            })}
          </h1>

          <p className="mt-7 max-w-[34rem] text-body-lg text-sand-700">{t("subtitle")}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <TrackedCtaButton
              event="cta_hero_signup"
              href="/signup"
              variant="primary"
              size="lg"
              className="h-12 px-7 shadow-glow hover:shadow-xl"
            >
              {t("ctaPrimary")}
            </TrackedCtaButton>
            <TrackedCtaButton
              event="cta_hero_demo"
              href="/m/demo-cartora"
              external
              variant="ghost"
              size="lg"
              className="group"
            >
              {t("ctaSecondary")}
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </TrackedCtaButton>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-sand-600">
            {microTrustItems.map((label, i) => {
              const Icon = MICRO_TRUST_ICONS[i] ?? ShieldCheck;
              return (
                <li key={label} className="flex items-center gap-1.5">
                  <Icon className="size-3.5 stroke-[1.75] text-sapin-600" aria-hidden="true" />
                  {label}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mockup — contenu secondaire, rendu immédiat lui aussi (robustesse + LCP mobile) */}
        <div className="flex items-center justify-center md:col-span-5 md:justify-end">
          <PhoneMockup
            src={demoMobile}
            alt={t("demoImageAlt")}
            priority
            tilt={-6}
            className="w-[280px] md:w-[320px]"
          />
        </div>
      </div>
    </section>
  );
}

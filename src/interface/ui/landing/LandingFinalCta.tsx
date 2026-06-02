import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BreathingCta } from "@/interface/ui/landing/BreathingCta";
import { HeroMeshCanvas } from "@/interface/ui/landing/HeroMeshCanvas";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

export function LandingFinalCta() {
  const t = useTranslations("Landing.finalCta");

  return (
    <LandingSection
      id="final-cta"
      className="border-t-0 bg-canard-50/40"
      innerClassName="relative overflow-hidden py-24 text-center md:py-32"
    >
      {/* Mesh signature canard/sapin très subtil en fond (statique si reduced-motion). */}
      <HeroMeshCanvas className="pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative">
        <h2 id="final-cta-heading" className="text-display-lg md:text-display-xl">
          {t("title")}
        </h2>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BreathingCta>
            <TrackedCtaButton event="cta_final_signup" href="/signup" variant="primary" size="lg">
              {t("ctaPrimary")}
            </TrackedCtaButton>
          </BreathingCta>
          <TrackedCtaButton
            event="cta_final_demo"
            href="/m/demo-cartora"
            external
            variant="ghost"
            size="lg"
          >
            {t("ctaSecondary")}
          </TrackedCtaButton>
        </div>

        <p className="mt-6 text-caption text-sand-600">{t("microTrust")}</p>
      </div>
    </LandingSection>
  );
}

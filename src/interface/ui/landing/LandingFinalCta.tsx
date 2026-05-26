import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

export function LandingFinalCta() {
  const t = useTranslations("Landing.finalCta");

  return (
    <LandingSection id="final-cta" className="border-t-0 bg-muted/30" innerClassName="text-center">
      <h2 id="final-cta-heading" className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title")}
      </h2>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <TrackedCtaButton event="cta_final_signup" href="/signup" variant="primary" size="lg">
          {t("ctaPrimary")}
        </TrackedCtaButton>
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

      <p className="mt-6 text-sm text-muted-foreground">{t("microTrust")}</p>
    </LandingSection>
  );
}

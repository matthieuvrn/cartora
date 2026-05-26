import { useTranslations } from "next-intl";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

export function LandingHero() {
  const t = useTranslations("Landing.hero");

  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto grid max-w-6xl gap-12 px-6 pt-12 pb-16 md:grid-cols-2 md:items-center md:gap-16 md:pt-20 md:pb-24"
    >
      <div className="flex flex-col gap-6">
        <h1
          id="hero-heading"
          className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl"
        >
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <TrackedCtaButton event="cta_hero_signup" href="/signup" variant="primary" size="lg">
            {t("ctaPrimary")}
          </TrackedCtaButton>
          <TrackedCtaButton
            event="cta_hero_demo"
            href="/m/demo-cartora"
            external
            variant="ghost"
            size="lg"
          >
            {t("ctaSecondary")}
          </TrackedCtaButton>
        </div>

        <p className="text-sm text-muted-foreground">{t("microTrust")}</p>
      </div>

      <div className="flex justify-center md:justify-end">
        <div
          role="img"
          aria-label={t("demoImageAlt")}
          className="aspect-[9/19.5] w-full max-w-[280px] rounded-[2rem] border border-border bg-muted/40"
        />
      </div>
    </section>
  );
}

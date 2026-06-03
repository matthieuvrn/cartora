import { useTranslations } from "next-intl";
import { HeroMeshCanvas } from "./HeroMeshCanvas";
import { HeroIntro } from "./HeroIntro";
import { HeroPhone } from "./HeroPhone";
import demoMobile from "../../../../public/landing/demo-mobile-hero.png";

export function LandingHero() {
  const t = useTranslations("Landing.hero");

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden">
      <HeroMeshCanvas className="absolute inset-0 -z-10 opacity-80" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-20 pb-24 md:grid-cols-12 md:items-center md:gap-10 md:pt-28 md:pb-32">
        {/* Texte — le h1 est l'élément LCP, rendu immédiat (aucun opacity-gate). */}
        <div className="md:col-span-7">
          <h1
            id="hero-heading"
            className="text-display-lg text-balance text-canard-900 md:text-display-xl lg:text-display-2xl"
          >
            {t.rich("title", {
              em: (chunks) => <em className="font-medium text-sapin-600 italic">{chunks}</em>,
            })}
          </h1>

          {/* Sous-titre + CTA + micro-trust : apparition en cascade après le h1. */}
          <HeroIntro />
        </div>

        {/* Mockup — halo + float + parallaxe (statique sous prefers-reduced-motion). */}
        <div className="flex items-center justify-center md:col-span-5 md:justify-end">
          <HeroPhone
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

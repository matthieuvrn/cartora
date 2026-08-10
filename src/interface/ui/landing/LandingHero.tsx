import { useTranslations } from "next-intl";
import { HeroMeshCanvas } from "./HeroMeshCanvas";
import { HeroIntro } from "./HeroIntro";
import { HeroLiveDemo } from "./HeroLiveDemo";
import { HeroQrCard } from "./HeroQrCard";

export function LandingHero() {
  const t = useTranslations("Landing.hero");

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden">
      <HeroMeshCanvas className="absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-20 pb-24 md:grid-cols-12 md:items-center md:gap-10 md:pt-28 md:pb-32">
        {/* Texte — le h1 est l'élément LCP, rendu immédiat (aucun opacity-gate). Le kicker
            porte la catégorie (menu digital restaurateurs) pour laisser le h1 à la promesse. */}
        <div className="md:col-span-7">
          <p className="flex items-center gap-2 text-caption font-medium tracking-[0.08em] text-canard-600 uppercase">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-corail-500" />
            {t("kicker")}
          </p>
          <h1 id="hero-heading" className="mt-4 text-display-2xl text-balance text-canard-900">
            {t.rich("title", {
              em: (chunks) => (
                <em className="relative font-medium text-sapin-600 italic">
                  {chunks}
                  {/* Trait « brush » corail dessiné une fois au chargement (cf. .hero-underline). */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 120 10"
                    preserveAspectRatio="none"
                    className="absolute inset-x-0 -bottom-2 h-2.5 w-full text-corail-500"
                  >
                    <path
                      d="M3 7C32 3.5 64 2.8 117 5.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      pathLength="1"
                      className="hero-underline"
                    />
                  </svg>
                </em>
              ),
            })}
          </h1>

          {/* Sous-titre + CTA + micro-trust : apparition en cascade après le h1. */}
          <HeroIntro />
        </div>

        {/* Menu VIVANT dans le téléphone (cycle des 9 templates + micro-éditions) et
            chevalet QR réellement scannable (SVG généré au build, desktop). */}
        <div className="flex items-center justify-center md:col-span-5 md:justify-end">
          <HeroLiveDemo className="w-[280px] md:w-[320px]" qrCard={<HeroQrCard />} />
        </div>
      </div>
    </section>
  );
}

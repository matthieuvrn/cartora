import { useTranslations } from "next-intl";
import { HeroIntro } from "./HeroIntro";
import { HeroLiveDemo } from "./HeroLiveDemo";
import { HeroQrCard } from "./HeroQrCard";

/**
 * Hero « Nuit de service » : scène nuit pleine largeur (le -mt-16 glisse le fond sous le
 * header sticky transparent), lumière « engineered » statique (grille hairline masquée +
 * glow canard derrière le téléphone + contrepoint corail) — le mouvement vit dans le
 * CONTENU (menu vivant, reveals), jamais dans le fond. Le h1 reste l'élément LCP, rendu
 * immédiat sans opacity-gate.
 */
export function LandingHero() {
  const t = useTranslations("Landing.hero");

  return (
    <section
      aria-labelledby="hero-heading"
      className="section-nuit texture-grain relative isolate -mt-16 overflow-hidden bg-background text-foreground"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit absolute inset-0" />
        {/* Glow principal derrière le téléphone (alphas ≥ 0.25 — un fond doit se voir). */}
        <div
          className="absolute top-[8%] right-[-12%] h-[720px] w-[720px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.058 198 / 0.5), transparent 70%)",
          }}
        />
        {/* Lueur d'appui sous le bloc texte, plus froide et plus discrète. */}
        <div
          className="absolute top-[30%] left-[-16%] h-[560px] w-[560px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.34 0.058 200 / 0.35), transparent 70%)",
          }}
        />
        {/* Contrepoint chaud : petit halo corail près du climax « 10 minutes ». */}
        <div
          className="absolute top-[52%] left-[18%] h-[340px] w-[340px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.55 0.18 38 / 0.12), transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pt-32 pb-24 md:min-h-[88svh] md:grid-cols-12 md:items-center md:gap-10 md:pt-28 md:pb-24">
        {/* Texte — le kicker porte la catégorie pour laisser le h1 à la promesse. */}
        <div className="md:col-span-7">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {t("kicker")}
          </p>
          <h1 id="hero-heading" className="mt-6 text-display-2xl text-balance text-sand-50">
            {t.rich("title", {
              em: (chunks) => (
                <em className="relative font-medium text-corail-300 italic">
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
          <HeroLiveDemo className="w-[300px] md:w-[340px] lg:w-[360px]" qrCard={<HeroQrCard />} />
        </div>
      </div>
    </section>
  );
}

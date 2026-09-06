import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BrowserMockup } from "@/interface/ui/landing/BrowserMockup";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import demoDesktop from "../../../../public/landing/demo-desktop.png";

// Faits produit sous le cadre, en « fiche technique » mono (passe landing 2026-09-06) : les trois
// pilules qui flottaient autour du mockup n'existaient qu'à partir de lg (rien sur mobile, là où
// la carte sera lue), étaient aria-hidden et relevaient du cliché « chips autour d'un mockup ».
// Ici : une ligne <ul> sémantique, séparateurs hairline, visible à tous les breakpoints.
const STAT_KEYS = ["allergens", "languages", "designs"] as const;

/**
 * Section preuve — scène NUIT au moment où la page prouve sa promesse (« créée en
 * 8 minutes »), pivot narratif de l'arc porcelaine→nuit. Lumière « engineered » statique
 * (grille hairline masquée + glow canard centré derrière le mockup + grain) : zéro canvas,
 * zéro rAF — le mouvement vit dans le CONTENU (parallaxe du BrowserMockup).
 */
export function LandingDemoPreview() {
  const t = useTranslations("Landing.demo");

  return (
    <LandingSection
      id="demo"
      className="section-nuit texture-grain relative isolate overflow-hidden bg-background text-foreground"
      innerClassName="py-28 md:py-36"
    >
      {/* Couches décoratives (recette scène nuit) : grille masquée, glow canard CENTRÉ
          derrière le mockup à alpha 0.3 — un fond doit se voir —, puis contrepoint chaud
          discret près du climax corail « 8 minutes ». Coupes franches haut/bas : aucune
          couture en dégradé vers les sections porcelaine voisines. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 620px 520px at 50% 58%, oklch(0.42 0.058 198 / 0.3), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 360px 300px at 62% 12%, oklch(0.55 0.18 38 / 0.1), transparent 70%)",
          }}
        />
      </div>

      <header className="mx-auto mb-16 max-w-2xl text-center">
        <span aria-hidden="true" className="eyebrow-thread mx-auto" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2 className="mt-6 text-display-xl text-balance text-sand-50">
          {t.rich("title", {
            em: (chunks) => <em className="font-medium text-corail-300 italic">{chunks}</em>,
          })}
        </h2>
        <p className="mt-5 text-lead text-sand-200/80">{t("subtitle")}</p>
      </header>

      <div className="relative mx-auto max-w-4xl">
        <BrowserMockup src={demoDesktop} alt={t("imageAlt")} url="cartora.app/m/demo-cartora" />
      </div>

      {/* Sous sm la ligne peut replier : séparateur « · » (un hairline en tête de 2e ligne lisait
          comme une barre orpheline) ; dès sm, hairlines verticales. */}
      <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-caption tracking-wide text-sand-300 sm:gap-x-0">
        {STAT_KEYS.map((key, i) => (
          <li
            key={key}
            className={cn(
              "sm:px-4",
              i > 0 &&
                "before:mr-3 before:text-sand-500 before:content-['·'] sm:border-l sm:border-white/15 sm:before:content-none",
            )}
          >
            {t(`stats.${key}`)}
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-3">
        <TrackedCtaButton
          event="demo_link_click"
          href="/m/demo-cartora"
          external
          variant="primary"
          size="lg"
          arrow
        >
          {t("openCta")}
        </TrackedCtaButton>
        <p className="text-body-sm text-sand-300/75">{t("footnote")}</p>
      </div>
    </LandingSection>
  );
}

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BrowserMockup } from "@/interface/ui/landing/BrowserMockup";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import demoDesktop from "../../../../public/landing/demo-desktop.png";

// Stat-chips flottantes autour du mockup (lg+) : surface nuit OPAQUE, registre mono « data ».
// Opaque, pas glass : les chips chevauchent le mockup blanc — un verre translucide y rendait
// le texte clair illisible (audit visuel 2026-08). pointer-events-none : purement visuelles.
const STAT_CHIP_CLASS =
  "pointer-events-none absolute z-10 hidden items-center rounded-full border border-white/15 " +
  "bg-nuit-800 px-3.5 py-1.5 font-mono text-caption text-sand-100 shadow-md lg:flex";

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

      {/* Stat-chips aria-hidden : elles répètent des faits déjà énoncés avec leur contexte
          dans Features (14 allergènes, 5 langues, 9 designs) — les annoncer ici, hors flux
          et sans structure, serait du bruit pour les lecteurs d'écran. */}
      <div className="relative mx-auto max-w-4xl">
        <BrowserMockup src={demoDesktop} alt={t("imageAlt")} url="cartora.app/m/demo-cartora" />
        <span aria-hidden="true" className={cn(STAT_CHIP_CLASS, "-top-4 -left-6 xl:-left-10")}>
          {t("stats.allergens")}
        </span>
        <span
          aria-hidden="true"
          className={cn(STAT_CHIP_CLASS, "top-1/2 -right-6 -translate-y-1/2 xl:-right-10")}
        >
          {t("stats.languages")}
        </span>
        <span aria-hidden="true" className={cn(STAT_CHIP_CLASS, "bottom-14 -left-7 xl:-left-12")}>
          {t("stats.designs")}
        </span>
      </div>

      <div className="mt-12 flex flex-col items-center gap-3">
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

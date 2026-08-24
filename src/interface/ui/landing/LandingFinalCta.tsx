import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

/**
 * Climax de clôture — scène NUIT miroir du hero (recette DA §3 : grille hairline + glow
 * central + grain), l'acte contrasté qui manquait à la v1 (fond canard-50/40 indiscernable
 * du sand ambiant). Le CTA porte son propre système d'ombre (TrackedCtaButton) — l'ancien
 * BreathingCta (pulsation infinie non câblée au store, non conforme WCAG 2.2.2) est retiré.
 */
export function LandingFinalCta() {
  const t = useTranslations("Landing.finalCta");

  return (
    <LandingSection
      id="final-cta"
      className="section-nuit texture-grain relative isolate overflow-hidden bg-background text-foreground"
      innerClassName="relative py-28 text-center md:py-36"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit absolute inset-0" />
        {/* Glow central : le moment de conversion est le plus éclairé de la page. */}
        <div
          className="absolute top-1/2 left-1/2 h-[640px] w-[900px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.058 198 / 0.32), transparent 70%)",
          }}
        />
        {/* Contrepoint chaud discret, près de l'em corail du titre. */}
        <div
          className="absolute top-[30%] left-[30%] h-[320px] w-[320px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.55 0.18 38 / 0.1), transparent 70%)",
          }}
        />
      </div>

      {/* display-2xl fluide (clamp) — symétrie typographique avec le h1 du hero. */}
      <h2
        id="final-cta-heading"
        className="mx-auto max-w-4xl text-display-2xl text-balance text-sand-50"
      >
        {t.rich("title", {
          em: (chunks) => <em className="font-medium text-corail-300 italic">{chunks}</em>,
        })}
      </h2>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <TrackedCtaButton event="cta_final_signup" href="/signup?src=final" size="xl" arrow>
          {t("ctaPrimary")}
        </TrackedCtaButton>
        <TrackedCtaButton
          event="cta_final_demo"
          href="/m/demo-cartora"
          external
          variant="outline"
          size="xl"
        >
          {t("ctaSecondary")}
        </TrackedCtaButton>
      </div>

      <p className="mt-8 font-mono text-caption tracking-wide text-sand-400">{t("microTrust")}</p>
    </LandingSection>
  );
}

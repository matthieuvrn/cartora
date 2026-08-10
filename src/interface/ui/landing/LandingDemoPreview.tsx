import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BrowserMockup } from "@/interface/ui/landing/BrowserMockup";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import demoDesktop from "../../../../public/landing/demo-desktop.png";

/**
 * Section preuve — RUPTURE full-bleed sombre (Phase 3) : bande canard-950 au moment où la
 * page prouve sa promesse (« créée en 8 minutes »), seule rupture sombre de l'arc — elle
 * casse la zone plate HowItWorks→FAQ. Le mesh clair est remplacé par deux lueurs radiales
 * statiques (zéro canvas ici). `border-t-0` : pas de filet clair sur un fond sombre.
 */
export function LandingDemoPreview() {
  const t = useTranslations("Landing.demo");

  return (
    <LandingSection
      id="demo"
      className="relative isolate overflow-hidden border-t-0 bg-canard-950"
      innerClassName="py-20 md:py-32"
    >
      {/* Lueurs radiales décoratives — profondeur sans canvas (le mesh est calibré fond clair). */}
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/4 -z-10 size-[36rem] rounded-full bg-canard-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -bottom-40 -z-10 size-[30rem] rounded-full bg-sapin-500/10 blur-3xl"
      />

      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h2 text-sand-50 md:text-h1">
          {t.rich("title", {
            em: (chunks) => <em className="font-medium text-corail-400 italic">{chunks}</em>,
          })}
        </h2>
        <p className="mt-3 text-body-lg text-sand-300">{t("subtitle")}</p>
      </header>

      <BrowserMockup
        src={demoDesktop}
        alt={t("imageAlt")}
        url="cartora.app/m/demo-cartora"
        className="mx-auto max-w-4xl"
      />

      <div className="mt-10 flex flex-col items-center gap-3">
        <TrackedCtaButton
          event="demo_link_click"
          href="/m/demo-cartora"
          external
          variant="primary"
          size="lg"
          className="shadow-glow"
        >
          {t("openCta")}
        </TrackedCtaButton>
        <p className="text-body-sm text-sand-400">{t("footnote")}</p>
      </div>
    </LandingSection>
  );
}

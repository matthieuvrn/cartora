import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BrowserMockup } from "@/interface/ui/landing/BrowserMockup";
import { HeroMeshCanvas } from "@/interface/ui/landing/HeroMeshCanvas";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import demoDesktop from "../../../../public/landing/demo-desktop.png";

export function LandingDemoPreview() {
  const t = useTranslations("Landing.demo");

  return (
    <LandingSection
      id="demo"
      className="relative isolate overflow-hidden"
      innerClassName="py-20 md:py-32"
    >
      {/* Fond mesh animé réutilisé du hero — full-bleed (w-screen) clipé par overflow-hidden du
          section. Donne de la profondeur derrière la fenêtre démo (plus de boîte blanche flottante). */}
      <HeroMeshCanvas className="absolute top-0 left-1/2 -z-10 h-full w-screen -translate-x-1/2 opacity-50" />

      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
        <p className="mt-3 text-body-lg text-sand-700">{t("subtitle")}</p>
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
        >
          {t("openCta")}
        </TrackedCtaButton>
        <p className="text-body-sm text-sand-600">{t("footnote")}</p>
      </div>
    </LandingSection>
  );
}

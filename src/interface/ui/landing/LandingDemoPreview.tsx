import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

export function LandingDemoPreview() {
  const t = useTranslations("Landing.demo");

  return (
    <LandingSection id="demo">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400" aria-hidden="true" />
              <span className="size-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
              <span className="size-2.5 rounded-full bg-green-400" aria-hidden="true" />
            </div>
            <div className="mx-auto rounded bg-background px-3 py-0.5 text-xs text-muted-foreground">
              cartora.app/m/demo-cartora
            </div>
          </div>
          {/* TODO: remplacer par <Image src="/landing/demo-desktop.webp" .../> dès l'asset produit (2400×1600 WebP). */}
          <div
            role="img"
            aria-label={t("imageAlt")}
            className="aspect-[3/2] w-full bg-muted/40"
          />

        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <TrackedCtaButton
            event="demo_link_click"
            href="/m/demo-cartora"
            external
            variant="primary"
            size="lg"
          >
            {t("openCta")}
          </TrackedCtaButton>
          <p className="text-sm text-muted-foreground">{t("footnote")}</p>
        </div>
      </div>
    </LandingSection>
  );
}

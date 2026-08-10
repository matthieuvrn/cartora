import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { FeatureCard, type FeatureKey, type FeatureTier } from "./FeatureCard";

// Le tier est un discriminant statique → la couleur du badge ne dépend jamais du texte i18n.
// `qr` en starter : QR et stats n'ont de réalité qu'une fois la carte publiée (STARTER+) —
// aligné avec la feature « Statistiques temps réel » de la carte pricing STARTER.
const FEATURES: ReadonlyArray<{ key: FeatureKey; tier: FeatureTier }> = [
  { key: "editor", tier: "all" },
  { key: "qr", tier: "starter" },
  { key: "allergens", tier: "all" },
  { key: "bilingual", tier: "pro" },
  { key: "daily", tier: "starter" },
  { key: "branding", tier: "pro" },
] as const;

export function LandingFeatures() {
  const t = useTranslations("Landing.features");

  return (
    <LandingSection id="features" innerClassName="py-20 md:py-28">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h2 md:text-h1">{t("title")}</h2>
      </header>

      {/* Stagger d'entrée (Phase 3) — la section parente passe en MotionSection variant="fade". */}
      <StaggerGroup className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, tier }) => (
          <StaggerItem key={key} className="h-full [&>article]:h-full">
            <FeatureCard
              featureKey={key}
              tier={tier}
              title={t(`${key}.title`)}
              body={t(`${key}.body`)}
              tierLabel={t(`${key}.tier`)}
            />
          </StaggerItem>
        ))}
      </StaggerGroup>
    </LandingSection>
  );
}

import { useTranslations } from "next-intl";
import { CreditCard, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

interface TrustItem {
  key: "hostingEu" | "stripe" | "rgpd" | "supportFr";
  Icon: LucideIcon;
}

const items: TrustItem[] = [
  { key: "hostingEu", Icon: MapPin },
  { key: "stripe", Icon: CreditCard },
  { key: "rgpd", Icon: ShieldCheck },
  { key: "supportFr", Icon: MessageSquare },
];

/**
 * Fin de la scène nuit du hero (DA « Nuit de service ») : bande hairline en registre mono,
 * sans grille ni glow — seul le grain signature habille le fond. Aucun border-b : la coupe
 * nuit → porcelaine est franche et assumée.
 */
export function LandingTrustStrip() {
  const t = useTranslations("Landing.trustStrip");

  return (
    <LandingSection
      className="section-nuit texture-grain relative border-t border-white/8 bg-background"
      innerClassName="py-6 md:py-8"
    >
      {/* Mobile : grille 2×2 statique. L'ancienne marquee infinie violait WCAG 2.2.2
          (défilement auto > 5 s sans pause possible au tactile). Dès md : 4 colonnes
          séparées par des hairlines verticales. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 md:gap-0 md:divide-x md:divide-white/8">
        {items.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex items-center gap-2.5 font-mono text-caption text-sand-300 md:justify-center md:px-4"
          >
            <Icon className="size-4 shrink-0 stroke-[1.5] text-sapin-300" aria-hidden="true" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

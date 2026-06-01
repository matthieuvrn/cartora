import { useTranslations } from "next-intl";
import { CreditCard, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { Marquee } from "@/interface/ui/components/Marquee";

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

export function LandingTrustStrip() {
  const t = useTranslations("Landing.trustStrip");

  return (
    <LandingSection
      className="border-t-0 bg-canard-50/60 dark:bg-canard-900/60"
      innerClassName="py-12"
    >
      {/* Mobile : marquee horizontale infinie (les items dépassent la largeur d'écran). */}
      <Marquee className="md:hidden">
        {items.map(({ key, Icon }) => (
          <span
            key={key}
            className="flex shrink-0 items-center gap-2 px-6 text-body-sm font-medium text-canard-800 dark:text-canard-100"
          >
            <Icon
              className="size-[18px] shrink-0 stroke-[1.75] text-sapin-600 dark:text-sapin-300"
              aria-hidden="true"
            />
            {t(key)}
          </span>
        ))}
      </Marquee>

      {/* Desktop : grille 4 colonnes avec séparateurs verticaux discrets. */}
      <ul className="hidden md:grid md:grid-cols-4 md:divide-x md:divide-canard-200/50 dark:md:divide-canard-800/50">
        {items.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex items-center justify-center gap-2.5 px-4 text-body-sm font-medium text-canard-800 dark:text-canard-100"
          >
            <Icon
              className="size-[18px] shrink-0 stroke-[1.75] text-sapin-600 dark:text-sapin-300"
              aria-hidden="true"
            />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

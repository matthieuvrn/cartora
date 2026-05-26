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

export function LandingTrustStrip() {
  const t = useTranslations("Landing.trustStrip");

  return (
    <LandingSection className="bg-muted/30" innerClassName="py-10 md:py-12">
      <ul className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
        {items.map(({ key, Icon }) => (
          <li key={key} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{t(key)}</span>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

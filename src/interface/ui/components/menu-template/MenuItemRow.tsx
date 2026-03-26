import { Sparkles, Flame } from "lucide-react";
import type { PublicMenuItem } from "@/domain/menu/PublicMenuTypes";
import type { ItemBadge } from "@/domain/menu/ItemPolicy";

type Props = {
  item: PublicMenuItem;
  locale: "fr" | "en";
  badgeLabels: Record<"NEW" | "POPULAR", string>;
};

const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; className: string }
> = {
  NEW: { icon: Sparkles, className: "bg-blue-100 text-blue-700" },
  POPULAR: { icon: Flame, className: "bg-orange-100 text-orange-700" },
};

function formatPrice(cents: number, locale: "fr" | "en"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatPriceAria(cents: number, locale: "fr" | "en"): string {
  const euros = Math.floor(cents / 100);
  const remaining = cents % 100;
  if (locale === "fr") {
    return remaining > 0 ? `${euros} euros ${remaining}` : `${euros} euros`;
  }
  return remaining > 0 ? `${euros} euros ${remaining} cents` : `${euros} euros`;
}

function getLocalizedText(fr: string, en: string, locale: "fr" | "en"): string {
  if (locale === "en") return en || fr;
  return fr;
}

export function MenuItemRow({ item, locale, badgeLabels }: Props) {
  const name = getLocalizedText(item.nameFr, item.nameEn, locale);
  const description = getLocalizedText(item.descriptionFr, item.descriptionEn, locale);

  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {item.badge !== "NONE" &&
            (() => {
              const config = badgeConfig[item.badge];
              const Icon = config.icon;
              return (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {badgeLabels[item.badge]}
                </span>
              );
            })()}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <span
        className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums"
        aria-label={formatPriceAria(item.priceCents, locale)}
      >
        {formatPrice(item.priceCents, locale)}
      </span>
    </li>
  );
}

import Image from "next/image";
import { Sparkles, Flame } from "lucide-react";
import type { PublicMenuItem } from "@/domain/menu/PublicMenuTypes";
import type { ItemBadge } from "@/domain/menu/ItemPolicy";
import { formatPrice, formatPriceAria, getLocalizedText } from "@/domain/menu/publicMenuView";
import { itemImageUrl } from "@/lib/storage-url";
import { AllergenIcons, type AllergenLabels } from "../AllergenIcons";

type Props = {
  item: PublicMenuItem;
  locale: "fr" | "en";
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  priority?: boolean;
};

const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; className: string }
> = {
  NEW: { icon: Sparkles, className: "bg-blue-100 text-blue-700" },
  POPULAR: { icon: Flame, className: "bg-orange-100 text-orange-700" },
};

export function MenuItemRow({
  item,
  locale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  priority = false,
}: Props) {
  const name = getLocalizedText(item.nameFr, item.nameEn, locale);
  const description = getLocalizedText(item.descriptionFr, item.descriptionEn, locale);
  const imageUrl = item.imagePath ? itemImageUrl(item.imagePath) : null;
  const altText = getLocalizedText(item.altTextFr, item.altTextEn, locale) || name;

  return (
    <li className="space-y-2 py-3">
      {imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-muted">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(min-width: 768px) 600px, 100vw"
            className="object-cover"
            priority={priority}
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
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
          <AllergenIcons
            allergens={item.allergens}
            labels={allergenLabels}
            listLabel={allergenSectionLabel}
          />
        </div>
        <span
          className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums"
          aria-label={formatPriceAria(item.priceCents, locale)}
          style={{ color: "var(--brand-accent, currentColor)" }}
        >
          {formatPrice(item.priceCents, locale)}
        </span>
      </div>
    </li>
  );
}

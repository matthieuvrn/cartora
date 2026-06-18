import Image from "next/image";
import { Sparkles, Flame } from "lucide-react";
import type { PublicMenuItem } from "@/domain/menu/PublicMenuTypes";
import type { ItemBadge } from "@/domain/menu/ItemPolicy";
import { formatPrice, formatPriceAria } from "@/domain/menu/publicMenuView";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { itemImageUrl } from "@/lib/storage-url";
import { AllergenIcons, type AllergenLabels } from "../AllergenIcons";

type Props = {
  item: PublicMenuItem;
  locale: MenuLocale;
  /** Langue source du menu — dernier repli de `resolveText` (S4). */
  sourceLocale: MenuLocale;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  priority?: boolean;
};

// Couleurs des badges via le contrat `--menu-badge-*` (cf. globals.css), avec un défaut clair
// inline en fallback. Le `var(--token, défaut)` s'applique partout — y compris hors `[data-template]`
// — donc aucune régression ; et les skins sombres (NOIR/NEON) redéfinissent ces tokens pour ne pas
// poser de chip pastel clair sur fond charbon/nuit (cf. Étape 6 — keystone).
const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; bg: string; fg: string }
> = {
  NEW: {
    icon: Sparkles,
    bg: "var(--menu-badge-new-bg, #dbeafe)",
    fg: "var(--menu-badge-new-fg, #1d4ed8)",
  },
  POPULAR: {
    icon: Flame,
    bg: "var(--menu-badge-popular-bg, #ffedd5)",
    fg: "var(--menu-badge-popular-fg, #c2410c)",
  },
};

export function MenuItemRow({
  item,
  locale,
  sourceLocale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  priority = false,
}: Props) {
  const name = resolveText(item.texts.name, locale, sourceLocale);
  const description = resolveText(item.texts.description, locale, sourceLocale);
  const imageUrl = item.imagePath ? itemImageUrl(item.imagePath) : null;
  const altText = resolveText(item.texts.altText ?? {}, locale, sourceLocale) || name;

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
            <span className="menu-item-name font-medium">{name}</span>
            {item.badge !== "NONE" &&
              (() => {
                const config = badgeConfig[item.badge];
                const Icon = config.icon;
                return (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: config.bg, color: config.fg }}
                  >
                    <Icon className="size-3" aria-hidden="true" />
                    {badgeLabels[item.badge]}
                  </span>
                );
              })()}
          </div>
          {description && <p className="menu-muted text-sm">{description}</p>}
          <AllergenIcons
            allergens={item.allergens}
            labels={allergenLabels}
            listLabel={allergenSectionLabel}
          />
        </div>
        <span
          className="menu-price shrink-0 pt-0.5 text-sm font-semibold tabular-nums"
          aria-label={formatPriceAria(item.priceCents, locale)}
        >
          {formatPrice(item.priceCents, locale)}
        </span>
      </div>
    </li>
  );
}

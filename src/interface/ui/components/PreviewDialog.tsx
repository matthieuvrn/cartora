"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Eye, Smartphone, Tablet, Monitor } from "lucide-react";
import type { MenuOverview, CategoryType } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import { PublicationPolicy } from "@/domain/menu/PublicationPolicy";
import { buildPublicSnapshot } from "@/domain/menu/PublicMenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { MenuTemplate } from "./menu-template";
import type { AllergenLabels } from "./AllergenIcons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planStatus: PlanStatus;
};

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT_MAX_WIDTH: Record<Viewport, string> = {
  mobile: "max-w-[375px]",
  tablet: "max-w-[768px]",
  desktop: "max-w-full",
};

export function PreviewDialog({ menu, restaurantName, planStatus }: Props) {
  const t = useTranslations("Dashboard");
  const tp = useTranslations("PublicMenu");
  const tAllergen = useTranslations("Allergen");
  const locale = useLocale() as "fr" | "en";
  const [viewport, setViewport] = useState<Viewport>("mobile");

  const snapshot = buildPublicSnapshot(menu, restaurantName, new Date().toISOString());

  const categoryLabels: Record<CategoryType, string> = {
    STARTERS: tp("category.STARTERS"),
    MAINS: tp("category.MAINS"),
    DESSERTS: tp("category.DESSERTS"),
    DRINKS: tp("category.DRINKS"),
  };

  const badgeLabels: Record<"NEW" | "POPULAR", string> = {
    NEW: tp("badge.NEW"),
    POPULAR: tp("badge.POPULAR"),
  };

  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);

  const viewports: { id: Viewport; icon: typeof Smartphone; label: string }[] = [
    { id: "mobile", icon: Smartphone, label: t("previewViewportMobile") },
    { id: "tablet", icon: Tablet, label: t("previewViewportTablet") },
    { id: "desktop", icon: Monitor, label: t("previewViewportDesktop") },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 size-4" />
          {t("preview")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("previewTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-1 pb-2" role="group" aria-label={t("previewTitle")}>
          {viewports.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              type="button"
              variant={viewport === id ? "default" : "outline"}
              size="sm"
              onClick={() => setViewport(id)}
              aria-label={label}
              aria-pressed={viewport === id}
            >
              <Icon className="mr-2 size-4" />
              {label}
            </Button>
          ))}
        </div>
        <div
          className={cn(
            "mx-auto w-full transition-[max-width] duration-200",
            VIEWPORT_MAX_WIDTH[viewport],
            viewport !== "desktop" && "rounded-2xl border shadow-sm overflow-hidden",
          )}
        >
          <MenuTemplate
            snapshot={snapshot}
            locale={locale}
            showWatermark={PublicationPolicy.shouldShowWatermark(planStatus)}
            categoryLabels={categoryLabels}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={tAllergen("sectionTitle")}
            allergenLegendTitle={tp("allergenLegendTitle")}
            watermarkText={tp("watermark")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

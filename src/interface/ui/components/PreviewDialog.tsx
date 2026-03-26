"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Eye } from "lucide-react";
import type { MenuOverview, CategoryType } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import { PublicationPolicy } from "@/domain/menu/PublicationPolicy";
import { buildPublicSnapshot } from "@/domain/menu/PublicMenuTypes";
import { MenuTemplate } from "./menu-template";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planStatus: PlanStatus;
};

export function PreviewDialog({ menu, restaurantName, planStatus }: Props) {
  const t = useTranslations("Dashboard");
  const tp = useTranslations("PublicMenu");
  const locale = useLocale() as "fr" | "en";

  const snapshot = buildPublicSnapshot(
    menu,
    restaurantName,
    new Date().toISOString(),
  );

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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 size-4" />
          {t("preview")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("previewTitle")}</DialogTitle>
        </DialogHeader>
        <MenuTemplate
          snapshot={snapshot}
          locale={locale}
          showWatermark={PublicationPolicy.shouldShowWatermark(planStatus)}
          categoryLabels={categoryLabels}
          badgeLabels={badgeLabels}
          watermarkText={tp("watermark")}
        />
      </DialogContent>
    </Dialog>
  );
}

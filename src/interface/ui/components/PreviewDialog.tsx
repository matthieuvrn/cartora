"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Smartphone, Tablet, Monitor } from "lucide-react";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MenuPreviewPane } from "./MenuPreviewPane";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planTier: PlanTier;
};

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT_MAX_WIDTH: Record<Viewport, string> = {
  mobile: "max-w-[375px]",
  tablet: "max-w-[768px]",
  desktop: "max-w-full",
};

export function PreviewDialog({ menu, restaurantName, planTier }: Props) {
  const t = useTranslations("Dashboard");
  const [viewport, setViewport] = useState<Viewport>("mobile");

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
      {/* brandScope={false} : le DialogContent reste neutre (:root) pour que le menu prévisualisé
          rende EXACTEMENT comme /m/[slug]. Seule la chrome Cartora (titre, sélecteur de viewport)
          porte `.theme-app`. Le rendu lui-même est délégué à MenuPreviewPane (source unique). */}
      <DialogContent
        brandScope={false}
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader className="theme-app">
          <DialogTitle>{t("previewTitle")}</DialogTitle>
        </DialogHeader>
        <div
          className="theme-app flex justify-center gap-1 pb-2"
          role="group"
          aria-label={t("previewTitle")}
        >
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
        <MenuPreviewPane
          menu={menu}
          restaurantName={restaurantName}
          planTier={planTier}
          className={cn(
            "mx-auto w-full transition-[max-width] duration-200 ease-[var(--ease-out-expo)]",
            VIEWPORT_MAX_WIDTH[viewport],
            viewport !== "desktop" && "overflow-hidden rounded-2xl border shadow-lg",
          )}
        />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { DashboardStats, RealtimeStats } from "@/domain/analytics/AnalyticsTypes";
import type { PublishActionState } from "@/app/(app)/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategorySection } from "./CategorySection";
import { EditableRestaurantName } from "./EditableRestaurantName";
import { PreviewDialog } from "./PreviewDialog";
import { PublishButton } from "./PublishButton";
import { QrCodeCard } from "./QrCodeCard";
import { BillingStatus } from "./BillingStatus";
import { StatsCard } from "./StatsCard";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planStatus: PlanStatus;
  slug: string;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  qrCodeUrl: string | null;
  hasBilling: boolean;
  stats?: DashboardStats;
  realtimeStats?: RealtimeStats;
};

export function MenuDashboard({
  menu,
  restaurantName,
  planStatus,
  slug,
  publishAction,
  qrCodeUrl,
  hasBilling,
  stats,
  realtimeStats,
}: Props) {
  const t = useTranslations("Dashboard");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <EditableRestaurantName currentName={restaurantName} />
          <p className="text-sm text-muted-foreground">{t("title")}</p>
        </div>
        <div className="flex items-center gap-2">
          <PreviewDialog menu={menu} restaurantName={restaurantName} planStatus={planStatus} />
          <PublishButton
            planStatus={planStatus}
            menuStatus={menu.status}
            publishAction={publishAction}
          />
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
            {t(`status.${menu.status}`)}
          </span>
        </div>
      </div>

      <BillingStatus planStatus={planStatus} hasBilling={hasBilling} />

      {menu.publishedAt !== null && (
        <Alert>
          <ExternalLink className="size-4" />
          <AlertTitle>{t("publicLinkTitle")}</AlertTitle>
          <AlertDescription>
            <a
              href={`/m/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("publicLinkLabel")} &rarr; /m/{slug}
            </a>
          </AlertDescription>
        </Alert>
      )}

      {menu.publishedAt !== null && qrCodeUrl !== null && <QrCodeCard qrCodeUrl={qrCodeUrl} />}

      <StatsCard stats={stats} realtimeStats={realtimeStats} />

      {menu.categories.map((category) => (
        <CategorySection key={category.id} category={category} />
      ))}
    </div>
  );
}

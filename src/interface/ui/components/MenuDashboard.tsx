"use client";

import { startTransition, useActionState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import type { DashboardStats, RealtimeStats } from "@/domain/analytics/AnalyticsTypes";
import {
  reorderCategoriesAction,
  type ItemActionState,
  type PublishActionState,
} from "@/app/(app)/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActivationChecklistCard } from "./ActivationChecklist";
import { AddCategoryButton } from "./AddCategoryButton";
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
  activationChecklist: ActivationChecklist | null;
  dismissActivationAction: () => Promise<void>;
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
  activationChecklist,
  dismissActivationAction,
}: Props) {
  const t = useTranslations("Dashboard");

  const reorderInitialState: ItemActionState = { error: null };
  const wrappedReorderCategories = useCallback(
    async (prev: ItemActionState, formData: FormData) => reorderCategoriesAction(prev, formData),
    [],
  );
  const [, reorderCategoriesFormAction] = useActionState(
    wrappedReorderCategories,
    reorderInitialState,
  );

  function handleMoveCategory(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menu.categories.length) return;

    const newIds = menu.categories.map((c) => c.id);
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];

    const formData = new FormData();
    formData.set("orderedIds", JSON.stringify(newIds));
    startTransition(() => reorderCategoriesFormAction(formData));
  }

  return (
    <div className="space-y-8">
      {activationChecklist && (
        <ActivationChecklistCard
          checklist={activationChecklist}
          dismissAction={dismissActivationAction}
        />
      )}

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

      {menu.categories.map((category, index) => (
        <CategorySection
          key={category.id}
          category={category}
          canDelete={menu.categories.length > 1}
          onMoveUp={index > 0 ? () => handleMoveCategory(index, "up") : undefined}
          onMoveDown={
            index < menu.categories.length - 1 ? () => handleMoveCategory(index, "down") : undefined
          }
        />
      ))}

      <div className="flex justify-center pt-4">
        <AddCategoryButton categoriesCount={menu.categories.length} />
      </div>
    </div>
  );
}

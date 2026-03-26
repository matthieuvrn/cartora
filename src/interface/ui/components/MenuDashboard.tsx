"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PublishActionState } from "@/app/(app)/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategorySection } from "./CategorySection";
import { PreviewDialog } from "./PreviewDialog";
import { PublishButton } from "./PublishButton";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  planStatus: PlanStatus;
  slug: string;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
};

export function MenuDashboard({ menu, restaurantName, planStatus, slug, publishAction }: Props) {
  const t = useTranslations("Dashboard");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <PreviewDialog
            menu={menu}
            restaurantName={restaurantName}
            planStatus={planStatus}
          />
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

      {menu.categories.map((category) => (
        <CategorySection key={category.id} category={category} />
      ))}
    </div>
  );
}

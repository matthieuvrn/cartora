import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { QrCode } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { Card, CardContent } from "@/components/ui/card";
import { PublishShareCluster } from "@/interface/ui/components/app/PublishShareCluster";
import { QrStyleEditor } from "@/interface/ui/components/QrStyleEditor";

export default async function SharePage() {
  const { restaurantId } = await requireRestaurant();

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  const menuRepo = new PrismaMenuRepository(prisma);
  const menu = await menuRepo.getMenuByRestaurantId(restaurantId);
  const isPublished = menu?.publishedAt != null;

  const t = await getTranslations("Share");
  const tDash = await getTranslations("Dashboard");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!isPublished ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <QrCode className="size-8 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-h3">{t("notPublishedTitle")}</p>
              <p className="text-body-sm text-muted-foreground">{t("notPublishedDescription")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-body font-medium">{tDash("publicLinkTitle")}</p>
                <p className="truncate font-mono text-body-sm text-muted-foreground">
                  {appUrl}/m/{restaurant.slug}
                </p>
              </div>
              <div className="shrink-0">
                <PublishShareCluster slug={restaurant.slug} />
              </div>
            </CardContent>
          </Card>
          <QrStyleEditor slug={restaurant.slug} appUrl={appUrl} initialStyle={restaurant.qrStyle} />
        </>
      )}
    </div>
  );
}

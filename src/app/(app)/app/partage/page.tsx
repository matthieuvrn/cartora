import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink, QrCode } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
          <Alert>
            <ExternalLink className="size-4" />
            <AlertTitle>{tDash("publicLinkTitle")}</AlertTitle>
            <AlertDescription>
              <a
                href={`/m/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {tDash("publicLinkLabel")} &rarr; /m/{restaurant.slug}
              </a>
            </AlertDescription>
          </Alert>
          <QrStyleEditor
            slug={restaurant.slug}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
            initialStyle={restaurant.qrStyle}
          />
        </>
      )}
    </div>
  );
}

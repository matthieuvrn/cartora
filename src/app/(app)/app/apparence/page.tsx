import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Info, Lock } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/interface/ui/components/TemplateSelector";
import { RestaurantLogoEditor } from "@/interface/ui/components/RestaurantLogoEditor";
import { BrandColorsEditor } from "@/interface/ui/components/BrandColorsEditor";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";

// Section "Apparence" : template public + logo + couleurs de marque, regroupés (avant : deux
// sous-pages /settings/template et /settings/branding). Les aperçus de templates et presets hex
// restent fidèles au rendu /m/[slug] — ne pas y injecter de tokens Cartora.
export default async function AppearancePage() {
  const { restaurantId } = await requireRestaurant();

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const menuRepo = new PrismaMenuRepository(prisma);
  const [restaurant, menu] = await Promise.all([
    restaurantRepo.getRestaurantById(restaurantId),
    menuRepo.getMenuByRestaurantId(restaurantId),
  ]);
  if (!restaurant || !menu) redirect("/app");

  const canUseBranding = PlanPolicy.canUseBranding(restaurant.planTier);
  const t = await getTranslations("Settings");
  const tColors = await getTranslations("Settings.branding.colors");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-h2">{t("appearance")}</h1>
        <p className="text-sm text-muted-foreground">{t("appearanceDescription")}</p>
      </div>

      {restaurant.planTier === "FREE" && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex gap-3 pt-6">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm text-foreground">{t("branding.freeNotice")}</p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-h3">{t("template.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("template.description")}</p>
        </div>
        <TemplateSelector currentTemplate={menu.template} planTier={restaurant.planTier} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("branding.logoLabel")}</CardTitle>
          <CardDescription>{t("branding.logoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantLogoEditor
            initialLogoPath={restaurant.logoPath}
            restaurantName={restaurant.displayName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{tColors("title")}</CardTitle>
              <CardDescription>{tColors("description")}</CardDescription>
            </div>
            {!canUseBranding && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                <Lock className="size-3" aria-hidden="true" />
                PRO
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {canUseBranding ? (
            <BrandColorsEditor
              initialPrimary={restaurant.brandPrimary}
              initialAccent={restaurant.brandAccent}
              initialBackground={restaurant.brandBackground}
            />
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{tColors("proLocked")}</p>
              <Link href="/app/abonnement">
                <Button size="sm">{tColors("upgradeCta")}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

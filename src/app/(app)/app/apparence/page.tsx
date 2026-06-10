import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateSelector } from "@/interface/ui/components/TemplateSelector";
import { RestaurantLogoEditor } from "@/interface/ui/components/RestaurantLogoEditor";
import { BrandColorsEditor } from "@/interface/ui/components/BrandColorsEditor";
import { supportsColorCustomization } from "@/domain/menu/MenuTemplateMeta";

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

  // Couleurs personnalisables uniquement sur les templates qui les consomment (Classic).
  // Plus de gate tier (set 2026 : couleurs ouvertes à tous les forfaits).
  const canCustomizeColors = supportsColorCustomization(menu.template);
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
        <TemplateSelector
          currentTemplate={menu.template}
          planTier={restaurant.planTier}
          menu={menu}
          restaurantName={restaurant.displayName}
        />
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
          <CardTitle>{tColors("title")}</CardTitle>
          <CardDescription>{tColors("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {canCustomizeColors ? (
            <BrandColorsEditor
              initialPrimary={restaurant.brandPrimary}
              initialAccent={restaurant.brandAccent}
              initialBackground={restaurant.brandBackground}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{tColors("classicOnly")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

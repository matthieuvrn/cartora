import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Info, Lock } from "lucide-react";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { RestaurantLogoEditor } from "@/interface/ui/components/RestaurantLogoEditor";
import { BrandColorsEditor } from "@/interface/ui/components/BrandColorsEditor";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";

export default async function BrandingSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const restaurantRow = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurantRow) redirect("/app");

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const restaurant = await restaurantRepo.getRestaurantById(restaurantRow.id);
  if (!restaurant) redirect("/app");

  const t = await getTranslations("Settings.branding");
  const tColors = await getTranslations("Settings.branding.colors");
  const canUseBranding = PlanPolicy.canUseBranding(restaurant.planTier);

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link href="/app/settings">
            <Button variant="ghost" size="icon" aria-label={t("back")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {restaurant.planTier === "FREE" && (
          <Card className="border-warning/30 bg-warning/10">
            <CardContent className="flex gap-3 pt-6">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-sm text-foreground">{t("freeNotice")}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("logoLabel")}</CardTitle>
            <CardDescription>{t("logoDescription")}</CardDescription>
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
                <Link href="/app/settings/billing">
                  <Button size="sm">{tColors("upgradeCta")}</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

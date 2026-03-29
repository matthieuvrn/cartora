import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CircleCheck, CircleX } from "lucide-react";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { logoutAction } from "@/app/(auth)/actions";
import { EnsureRestaurantExists } from "@/application/use-cases/EnsureRestaurantExists";
import { GetMenuForDashboard } from "@/application/use-cases/GetMenuForDashboard";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { prisma } from "@/infrastructure/db/prisma";
import { Button } from "@/components/ui/button";
import { MenuDashboard } from "@/interface/ui/components/MenuDashboard";
import { publishMenuAction } from "./actions";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const ensureRestaurant = new EnsureRestaurantExists(restaurantRepo);
  const { restaurantId } = await ensureRestaurant.execute({
    userId: user.id,
  });

  const menuRepo = new PrismaMenuRepository(prisma);
  const getMenu = new GetMenuForDashboard(menuRepo);
  const menu = await getMenu.execute({ restaurantId });

  const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
  if (!restaurant) redirect("/login");

  const qrAssetRepo = new PrismaQrAssetRepository(prisma);
  const qrAsset = await qrAssetRepo.findByRestaurantId(restaurantId);
  const qrCodeUrl = qrAsset ? new SupabaseStorageService().getPublicUrl(qrAsset.storagePath) : null;

  const billingRepo = new PrismaBillingRepository(prisma);
  const billing = await billingRepo.findByRestaurantId(restaurantId);
  const hasBilling = billing !== null;

  const t = await getTranslations("Dashboard");

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cartora</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              {t("logout")}
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {checkout === "success" && restaurant.planStatus === "ACTIVE" && (
          <Alert className="mb-6">
            <CircleCheck className="size-4" />
            <AlertTitle>{t("checkoutSuccessTitle")}</AlertTitle>
            <AlertDescription>{t("checkoutSuccessDescription")}</AlertDescription>
          </Alert>
        )}
        {checkout === "cancel" && (
          <Alert variant="destructive" className="mb-6">
            <CircleX className="size-4" />
            <AlertTitle>{t("checkoutCancelTitle")}</AlertTitle>
            <AlertDescription>{t("checkoutCancelDescription")}</AlertDescription>
          </Alert>
        )}
        <MenuDashboard
          menu={menu}
          restaurantName={restaurant.displayName}
          planStatus={restaurant.planStatus}
          slug={restaurant.slug}
          publishAction={publishMenuAction}
          qrCodeUrl={qrCodeUrl}
          hasBilling={hasBilling}
        />
      </div>
    </main>
  );
}

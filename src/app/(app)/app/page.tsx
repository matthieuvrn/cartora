import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isDomainError } from "@/domain/errors/DomainError";
import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";
import { EnsureRestaurantExists } from "@/application/use-cases/EnsureRestaurantExists";
import { GetMenuForDashboard } from "@/application/use-cases/GetMenuForDashboard";
import {
  RESTAURANT_TYPES,
  defaultCategoryKeysFor,
  type RestaurantType,
} from "@/domain/restaurant/RestaurantInitPolicy";
import { ActivationPolicy } from "@/domain/restaurant/ActivationPolicy";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { prisma } from "@/infrastructure/db/prisma";
import { GetDashboardStats } from "@/application/use-cases/GetDashboardStats";
import { GetRealtimeStats } from "@/application/use-cases/GetRealtimeStats";
import { Button } from "@/components/ui/button";
import { MenuDashboard } from "@/interface/ui/components/MenuDashboard";
import { CheckoutResultBanner } from "@/interface/ui/components/CheckoutResultBanner";
import { DeleteAccountButton } from "@/interface/ui/components/DeleteAccountButton";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { dismissActivationChecklistAction, publishMenuAction, regenerateQrAction } from "./actions";

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

  const rawType = user.user_metadata?.restaurant_type;
  const restaurantType: RestaurantType | null =
    typeof rawType === "string" && (RESTAURANT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as RestaurantType)
      : null;

  const tCategories = await getTranslations("Categories.default");
  const categories = defaultCategoryKeysFor(restaurantType).map(({ key, order }) => ({
    name: tCategories(key),
    order,
  }));

  const { restaurantId } = await ensureRestaurant.execute({
    userId: user.id,
    restaurantType,
    categories,
  });

  const menuRepo = new PrismaMenuRepository(prisma);
  const getMenu = new GetMenuForDashboard(menuRepo);
  let menu;
  try {
    menu = await getMenu.execute({ restaurantId });
  } catch (e) {
    // `menu_not_found` est un état "vide attendu" (jamais censé arriver après
    // EnsureRestaurantExists au login, mais on reste défensif). On rend
    // `not-found.tsx` plutôt que `error.tsx` — pas de bruit Sentry.
    if (isDomainError(e) && e.code === "menu_not_found") notFound();
    throw e;
  }

  const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
  if (!restaurant) redirect("/login");

  const qrAssetRepo = new PrismaQrAssetRepository(prisma);
  const qrAsset = await qrAssetRepo.findByRestaurantId(restaurantId);
  const qrCodeUrl = qrAsset
    ? new SupabaseStorageService("qr-codes").getPublicUrl(qrAsset.storagePath)
    : null;

  const billingRepo = new PrismaBillingRepository(prisma);
  const billing = await billingRepo.findByRestaurantId(restaurantId);
  const hasBilling = billing !== null;

  const analyticsRepo = new PrismaAnalyticsRepository(prisma);
  const clock = new SystemClock();
  const getDashboardStats = new GetDashboardStats(analyticsRepo, clock);
  const stats = await getDashboardStats.execute({ restaurantId });

  const getRealtimeStats = new GetRealtimeStats(analyticsRepo, clock);
  const realtimeStats = await getRealtimeStats.execute({ restaurantId });

  const totalItems = menu.categories.reduce((acc, c) => acc + c.items.length, 0);
  const checklist =
    restaurant.activationDismissedAt !== null
      ? null
      : ActivationPolicy.compute({
          restaurantName: restaurant.displayName,
          totalItems,
          menuStatus: menu.status,
        });

  const t = await getTranslations("Dashboard");

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cartora</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Link href="/app/settings">
            <Button variant="ghost" size="icon" aria-label={t("settings")}>
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <LocaleSwitcher />
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              {t("logout")}
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {checkout === "success" &&
          restaurant.planStatus === "ACTIVE" &&
          restaurant.planTier !== "FREE" && (
            <CheckoutResultBanner result="success" tier={restaurant.planTier} />
          )}
        {checkout === "cancel" && <CheckoutResultBanner result="cancel" />}
        <MenuDashboard
          menu={menu}
          restaurantName={restaurant.displayName}
          planStatus={restaurant.planStatus}
          planTier={restaurant.planTier}
          slug={restaurant.slug}
          publishAction={publishMenuAction}
          regenerateQrAction={regenerateQrAction}
          qrCodeUrl={qrCodeUrl}
          hasBilling={hasBilling}
          stats={stats}
          realtimeStats={realtimeStats}
          activationChecklist={checklist}
          dismissActivationAction={dismissActivationChecklistAction}
        />

        <div className="mt-16 border-t pt-8">
          <DeleteAccountButton />
        </div>
      </div>
    </main>
  );
}

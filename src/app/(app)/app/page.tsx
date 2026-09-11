import { notFound, redirect } from "next/navigation";
import { isDomainError } from "@/domain/errors/DomainError";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
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
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { prisma } from "@/infrastructure/db/prisma";
import { ListActiveDailyDishes } from "@/application/use-cases/ListActiveDailyDishes";
import { ListActiveFormulas } from "@/application/use-cases/ListActiveFormulas";
import { EditorIdentityHeader } from "@/interface/ui/components/EditorIdentityHeader";
import { MenuEditor } from "@/interface/ui/components/MenuEditor";
import { CheckoutResultBanner } from "@/interface/ui/components/CheckoutResultBanner";
import { dismissActivationChecklistAction } from "./actions";

// Section "Carte" : le canvas d'édition. C'est la racine du shell — elle exécute aussi le
// provisioning initial (EnsureRestaurantExists) et reçoit les retours de paiement Stripe
// (`?checkout=success|cancel`, success_url/cancel_url pointent ici). Les surfaces de consultation
// (stats, QR, facturation) ont leurs propres sections : /app/stats, /app/partage, /app/abonnement.
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

  const clock = new SystemClock();
  // Référentiel temporel unique de la page : sert à la ligne « Expire aujourd'hui à … » (jour
  // calendaire Paris), calculé côté serveur pour éviter tout `new Date()` client (hydratation).
  const nowISO = clock.nowISO();

  const listDailyDishes = new ListActiveDailyDishes(menuRepo, clock);
  const dailyDishes = await listDailyDishes.execute({ restaurantId });

  const listFormulas = new ListActiveFormulas(menuRepo, clock);
  const formulas = await listFormulas.execute({ restaurantId });

  const totalItems = menu.categories.reduce((acc, c) => acc + c.items.length, 0);
  const checklist =
    restaurant.activationDismissedAt !== null
      ? null
      : ActivationPolicy.compute({
          restaurantName: restaurant.displayName,
          totalItems,
          menuStatus: menu.status,
        });

  return (
    <div className="mx-auto max-w-6xl">
      {checkout === "success" &&
        restaurant.planStatus === "ACTIVE" &&
        restaurant.planTier !== "FREE" && (
          <CheckoutResultBanner result="success" tier={restaurant.planTier} />
        )}
      {checkout === "cancel" && <CheckoutResultBanner result="cancel" />}
      {/* En-tête d'identité : rendu ICI, avant l'éditeur, comme les autres sections rendent leur
          PageHeader en premier enfant — dans MenuEditor il disparaîtrait pendant une recherche et
          la page n'aurait plus de h1. */}
      <EditorIdentityHeader
        restaurantName={restaurant.displayName}
        logoPath={restaurant.logoPath}
        template={menu.template}
        status={menu.status}
        publishedAt={menu.publishedAt}
        slug={restaurant.slug}
      />
      <MenuEditor
        menu={menu}
        restaurantName={restaurant.displayName}
        planTier={restaurant.planTier}
        activationChecklist={checklist}
        dismissActivationAction={dismissActivationChecklistAction}
        dailyDishes={dailyDishes}
        formulas={formulas}
        nowISO={nowISO}
      />
    </div>
  );
}

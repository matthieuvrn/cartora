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
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { prisma } from "@/infrastructure/db/prisma";
import { ListActiveDailyDishes } from "@/application/use-cases/ListActiveDailyDishes";
import { ListActiveFormulas } from "@/application/use-cases/ListActiveFormulas";
import { MenuEditor } from "@/interface/ui/components/MenuEditor";
import { CheckoutResultBanner } from "@/interface/ui/components/CheckoutResultBanner";
import { dismissActivationChecklistAction, publishMenuAction, regenerateQrAction } from "./actions";
import { loadTranslationOverview, translationTodoCount } from "./_lib/translationOverview";

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

  const listDailyDishes = new ListActiveDailyDishes(menuRepo, clock);
  const dailyDishes = await listDailyDishes.execute({ restaurantId });

  const listFormulas = new ListActiveFormulas(menuRepo, clock);
  const formulas = await listFormulas.execute({ restaurantId });

  // Nudge à la publication (PRO) : couverture de traduction mutualisée `cache()` avec
  // le compteur de la sidebar (même requête) ⇒ pas de coût de requête supplémentaire.
  const canTranslate =
    PlanPolicy.canUseAutoTranslation(restaurant.planTier) && restaurant.menuLocales.length > 0;
  const translationOverview = canTranslate ? await loadTranslationOverview(restaurantId) : null;
  const pendingTranslation = translationOverview
    ? {
        todoCount: translationTodoCount(translationOverview.coverage),
        targetLocales: translationOverview.coverage
          .filter((c) => c.stale + c.missing > 0)
          .map((c) => c.locale),
      }
    : undefined;

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
      <MenuEditor
        menu={menu}
        restaurantName={restaurant.displayName}
        slug={restaurant.slug}
        logoPath={restaurant.logoPath}
        planTier={restaurant.planTier}
        publishAction={publishMenuAction}
        regenerateQrAction={regenerateQrAction}
        activationChecklist={checklist}
        dismissActivationAction={dismissActivationChecklistAction}
        dailyDishes={dailyDishes}
        formulas={formulas}
        pendingTranslation={pendingTranslation}
      />
    </div>
  );
}

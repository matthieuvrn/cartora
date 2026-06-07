import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * Résolution d'auth partagée par les pages des sections (app). Renvoie l'utilisateur + son
 * restaurant, ou `redirect()` :
 * - pas de session → `/login` ;
 * - session mais aucun restaurant → `/app` (le provisioning initial — EnsureRestaurantExists —
 *   ne s'exécute qu'à l'entrée `/app`, jamais dans les sous-sections).
 *
 * Miroir léger du `getAuthenticatedUser()` de billing-actions, côté lecture de page.
 */
export async function requireRestaurant(): Promise<{
  userId: string;
  email: string;
  restaurantId: string;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const row = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!row) redirect("/app");

  return { userId: user.id, email: user.email, restaurantId: row.id };
}

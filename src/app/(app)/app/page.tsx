import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { EnsureRestaurantExists } from "@/application/use-cases/EnsureRestaurantExists";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { prisma } from "@/infrastructure/db/prisma";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const repo = new PrismaRestaurantRepository(prisma);
  const ensureRestaurant = new EnsureRestaurantExists(repo);
  const { restaurantId } = await ensureRestaurant.execute({
    userId: user.id,
  });

  return (
    <main className="p-8">
      <p className="text-sm text-muted-foreground">Connecté : {user.email}</p>
      <p className="text-sm text-muted-foreground">
        Restaurant : {restaurantId}
      </p>
      <form action={logout} className="mt-4">
        <button type="submit" className="underline text-sm">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

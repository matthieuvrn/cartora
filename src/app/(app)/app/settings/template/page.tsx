import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Button } from "@/components/ui/button";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { TemplateSelector } from "@/interface/ui/components/TemplateSelector";

export default async function TemplateSettingsPage() {
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
  const menuRepo = new PrismaMenuRepository(prisma);
  const [restaurant, menu] = await Promise.all([
    restaurantRepo.getRestaurantById(restaurantRow.id),
    menuRepo.getMenuByRestaurantId(restaurantRow.id),
  ]);
  if (!restaurant || !menu) redirect("/app");

  const t = await getTranslations("Settings");

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Link href="/app/settings">
            <Button variant="ghost" size="icon" aria-label={t("template.back")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{t("template.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("template.description")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <TemplateSelector currentTemplate={menu.template} planTier={restaurant.planTier} />
      </div>
    </main>
  );
}

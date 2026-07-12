import { GeistMono } from "geist/font/mono";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import { AppShell } from "@/interface/ui/components/app/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { loadTranslationOverview, translationTodoCount } from "./app/_lib/translationOverview";

// `theme-app` : scope de marque (canard/sand, Fraunces, focus, charts) en miroir de `.theme-cartora`
// de la landing — voir globals.css. `bg-background text-foreground` re-résout les tokens au niveau du
// scope (sinon le `text-foreground` du <body> reste figé sur la valeur :root). `data-app-shell` :
// marqueur de masquage du footer global, dashboard uniquement (les pages auth gardent leur footer).
// `AppShell` fournit la navigation persistante (rail desktop + sheet mobile) commune à toutes les
// sections (app).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compteur « à relire » de la sidebar (S4). Résolution non bloquante : le layout enveloppe aussi
  // le `/app` de premier login, avant le provisioning (EnsureRestaurantExists) — un restaurant absent
  // ⇒ pas de compteur. Gaté sur `menuLocales > 0` : un compte mono-langue ne paie que la lookup.
  let pendingTranslations = 0;
  if (user) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, menuLocales: true },
    });
    if (restaurant && restaurant.menuLocales.length > 0) {
      const overview = await loadTranslationOverview(restaurant.id);
      pendingTranslations = translationTodoCount(overview.coverage);
    }
  }

  return (
    <div
      data-app-shell
      className={`theme-app min-h-svh bg-background text-foreground ${GeistMono.variable}`}
    >
      <AppShell email={user?.email ?? ""} translationTodoCount={pendingTranslations}>
        {children}
      </AppShell>
      {/* Dans le scope .theme-app : les toasts consomment --popover/--border/--card-shadow. */}
      <Toaster />
    </div>
  );
}

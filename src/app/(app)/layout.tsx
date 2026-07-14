import { GeistMono } from "geist/font/mono";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { AppShell } from "@/interface/ui/components/app/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { loadTranslationOverview, translationTodoCount } from "./app/_lib/translationOverview";
import { loadPublishBarState, type PublishBarState } from "./app/_lib/publishBarState";

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

  // Compteur « à relire » de la sidebar (S4) + état de la barre de publication globale.
  // Résolution non bloquante : le layout enveloppe aussi le `/app` de premier login, avant le
  // provisioning (EnsureRestaurantExists) — un restaurant absent ⇒ pas de compteur ni de barre.
  // Le compteur est gaté sur `menuLocales > 0` (un compte mono-langue ne paie que la lookup) ;
  // `loadPublishBarState` mutualise `loadTranslationOverview` via `cache()` (pas de requête en plus).
  let pendingTranslations = 0;
  let publishBarState: PublishBarState | null = null;
  if (user) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, slug: true, planTier: true, menuLocales: true },
    });
    if (restaurant) {
      if (restaurant.menuLocales.length > 0) {
        const overview = await loadTranslationOverview(restaurant.id);
        pendingTranslations = translationTodoCount(overview.coverage);
      }
      publishBarState = await loadPublishBarState({
        id: restaurant.id,
        slug: restaurant.slug,
        planTier: restaurant.planTier as PlanTier,
        menuLocales: restaurant.menuLocales,
      });
    }
  }

  return (
    <div
      data-app-shell
      className={`theme-app min-h-svh bg-background text-foreground ${GeistMono.variable}`}
    >
      <AppShell
        email={user?.email ?? ""}
        translationTodoCount={pendingTranslations}
        publishBarState={publishBarState}
      >
        {children}
      </AppShell>
      {/* Dans le scope .theme-app : les toasts consomment --popover/--border/--card-shadow. */}
      <Toaster />
    </div>
  );
}

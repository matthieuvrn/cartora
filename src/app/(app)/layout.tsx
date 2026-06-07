import { GeistMono } from "geist/font/mono";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { AppShell } from "@/interface/ui/components/app/AppShell";

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

  return (
    <div
      data-app-shell
      className={`theme-app min-h-svh bg-background text-foreground ${GeistMono.variable}`}
    >
      <AppShell email={user?.email ?? ""}>{children}</AppShell>
    </div>
  );
}

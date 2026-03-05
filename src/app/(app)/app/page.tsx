import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="p-8">
      <p className="text-sm text-muted-foreground">Connecté : {user.email}</p>
      <form action={logout} className="mt-4">
        <button type="submit" className="underline text-sm">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

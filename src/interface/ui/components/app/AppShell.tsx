"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HIT_AREA } from "@/lib/utils";
import { Logo } from "@/interface/ui/components/Logo";
import { AppSidebar } from "./AppSidebar";

/**
 * Shell de l'app produit : rail latéral persistant (desktop ≥ md) + barre supérieure à hamburger
 * (mobile) ouvrant la même nav dans un Sheet. Le contenu de page est rendu dans la zone principale,
 * décalée de la largeur du rail. Monté par (app)/layout.tsx sous le scope `.theme-app`.
 */
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Nav");

  return (
    <div className="min-h-svh">
      {/* Lien d'évitement : 1re cible au clavier, masqué visuellement jusqu'au focus. */}
      <a
        href="#main"
        className="sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:not-sr-only"
      >
        {t("skipToContent")}
      </a>

      {/* Rail desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r md:block">
        <AppSidebar email={email} />
      </aside>

      {/* Barre mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className={HIT_AREA} aria-label={t("openMenu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" aria-describedby={undefined} className="w-64 p-0">
            <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
            <AppSidebar email={email} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Logo variant="lockup" className="h-6" />
      </header>

      {/* Contenu */}
      <main id="main" className="md:pl-60">
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

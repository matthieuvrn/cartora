"use client";

import { useTranslations } from "next-intl";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";
import { Logo } from "@/interface/ui/components/Logo";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";
import { AppSidebar, type SidebarRestaurant } from "./AppSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { MOBILE_TAB_BAR_OFFSET } from "./mobileTabBarOffset";
import { PublishBar } from "./PublishBar";
import { PublishControlCompact } from "./PublishControlCompact";

/**
 * Shell de l'app produit : rail latéral persistant (desktop ≥ md) + topbar mobile (logo et
 * contrôle de publication) + barre d'onglets basse `MobileTabBar` (mobile, < md) dont l'onglet
 * « Plus » ouvre la même nav dans un Sheet par le bas. Le contenu de page est rendu dans la zone
 * principale, décalée de la largeur du rail. Monté par (app)/layout.tsx sous le scope `.theme-app`.
 */
export function AppShell({
  email,
  restaurant,
  translationTodoCount,
  publishBarState,
  children,
}: {
  email: string;
  /** Identité du restaurant (pied de rail) — `null` avant le provisioning du 1er login. */
  restaurant: SidebarRestaurant | null;
  /** Champs de traduction « à relire » — pastille de comptage sur l'entrée « Traductions ». */
  translationTodoCount: number;
  /** État de publication global (barre PublishBar) — `null` avant le provisioning du 1er login. */
  publishBarState: PublishBarState | null;
  children: React.ReactNode;
}) {
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
        <AppSidebar
          email={email}
          restaurant={restaurant}
          translationTodoCount={translationTodoCount}
        />
      </aside>

      {/* Barre mobile — la nav a migré vers la barre d'onglets basse (plus de hamburger). */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
        <Logo variant="lockup" className="h-6" />
        {/* Contrôle de publication fusionné dans la topbar (plus de 2ᵉ barre sticky mobile) :
            unique climax corail du viewport mobile. */}
        {publishBarState && <PublishControlCompact state={publishBarState} className="ml-auto" />}
      </header>

      {/* Contenu — le padding bas réserve la hauteur des overlays du bas (barre d'onglets mobile,
          0 dès md ; bannière cookies tant qu'elle est affichée) : rien ne finit dessous. */}
      <main
        id="main"
        className="md:pl-60"
        style={{
          paddingBottom: `calc(${COOKIE_BANNER_OFFSET} + ${MOBILE_TAB_BAR_OFFSET})`,
        }}
      >
        {publishBarState && <PublishBar state={publishBarState} />}
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>

      {/* En fin de DOM : l'ordre de lecture et de tabulation suit l'ordre visuel. */}
      <MobileTabBar
        email={email}
        restaurant={restaurant}
        translationTodoCount={translationTodoCount}
      />
    </div>
  );
}

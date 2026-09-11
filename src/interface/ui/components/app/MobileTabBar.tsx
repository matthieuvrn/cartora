"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ellipsis, XIcon } from "lucide-react";
import { isAppNavItemActive, isMoreSectionActive, MOBILE_TAB_ITEMS } from "@/lib/app-nav";
import { cn, HIT_AREA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";
import { AppSidebar, type SidebarRestaurant } from "./AppSidebar";
import { APP_NAV_ICONS } from "./appNavIcons";
import { MOBILE_TAB_BAR_OFFSET } from "./mobileTabBarOffset";

/**
 * Barre d'onglets basse du shell mobile (< md) : trois routes (Carte · Stats · Partage) plus un
 * onglet « Plus » qui ouvre la nav COMPLÈTE — le même `AppSidebar` que le rail desktop — dans un
 * Sheet par le bas (zone du pouce). Elle remplace le hamburger de la topbar.
 *
 * Overlay `fixed bottom` : consomme `COOKIE_BANNER_OFFSET` (règle du shell — sinon la bannière
 * cookies, même z-index et dernière dans le DOM, la recouvrirait) et publie sa propre hauteur via
 * `--mobile-tab-bar-h` (globals.css) pour que le contenu et les ancres s'arrêtent au-dessus.
 * Rendue uniquement par `AppShell`, donc jamais sur la landing, les pages auth ou /m/[slug].
 *
 * Aucun `Button` primitive sur les onglets : la règle pilule globale les arrondirait en gélules.
 */

const TAB_BASE =
  "relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 rounded-md text-caption leading-none transition-colors ease-[var(--ease-snappy)]";
// Ancrage canard EN HAUT de l'onglet : pendant vertical de la barre gauche du rail (CSS pur,
// aucune animation de layout). L'état actif n'est donc pas porté par la seule couleur.
const TAB_ACTIVE =
  "text-primary before:absolute before:inset-x-4 before:-top-1 before:h-0.5 before:rounded-b-full before:bg-primary before:content-['']";
const TAB_INACTIVE = "text-muted-foreground hover:text-foreground";

export function MobileTabBar({
  email,
  restaurant,
  translationTodoCount,
}: {
  email: string;
  /** Identité du restaurant (pied du tiroir) — `null` avant le provisioning du 1er login. */
  restaurant: SidebarRestaurant | null;
  /** Champs de traduction « à relire » — pastille de comptage sur l'onglet « Plus ». */
  translationTodoCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Nav");
  // La page courante vit derrière « Plus » : l'onglet prend le style actif comme repère de
  // position ; l'`aria-current="page"` réel vit sur l'entrée du tiroir.
  const moreActive = isMoreSectionActive(pathname);

  return (
    <nav
      aria-label={t("quickNav")}
      className="fixed inset-x-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
      style={{
        bottom: COOKIE_BANNER_OFFSET,
        height: MOBILE_TAB_BAR_OFFSET,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul role="list" className="flex h-full">
        {MOBILE_TAB_ITEMS.map(({ key, href, exact }) => {
          const Icon = APP_NAV_ICONS[key];
          const active = isAppNavItemActive(pathname, { href, exact });
          return (
            // `p-1` : l'anneau de focus de marque (4 px hors boîte) reste visible dans la barre.
            <li key={key} className="flex-1 p-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB_BASE, active ? TAB_ACTIVE : TAB_INACTIVE)}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="max-w-full truncate">{t(`tab.${key}`)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1 p-1">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              {/* `aria-current="true"` (et non "page" : ce n'est pas une page) = repère de
                  position pour les technologies d'assistance quand la section courante est
                  derrière le tiroir — le rail desktop est alors `display:none`. */}
              <button
                type="button"
                aria-current={moreActive ? "true" : undefined}
                className={cn(TAB_BASE, moreActive ? TAB_ACTIVE : TAB_INACTIVE)}
              >
                <span className="relative">
                  <Ellipsis className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {translationTodoCount > 0 && (
                    // Pastille reprise du rail (dette `bg-warning/15` assumée) : sans elle, le
                    // signal « à traduire » disparaîtrait du mobile. Le chiffre est décoratif,
                    // le texte lisible arrive APRÈS le libellé dans le nom accessible.
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 left-full -ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 font-mono text-[0.6875rem] font-medium text-warning tabular-nums"
                    >
                      {translationTodoCount > 9 ? "9+" : translationTodoCount}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{t("tab.more")}</span>
                {translationTodoCount > 0 && (
                  <span className="sr-only">
                    {t("translationsPending", { count: translationTodoCount })}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              aria-describedby={undefined}
              // `bg-card` : le tiroir rend `AppSidebar`, dont le fond est `bg-card` (blanc) ;
              // sans cela le `bg-background` (sand-50) du primitive laissait une bande plus chaude
              // au-dessus du logo, à hauteur de la rangée de fermeture.
              className="max-h-[85svh] gap-0 overflow-hidden rounded-t-xl bg-card p-0"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
              {/* En-tête non défilant : la croix reste atteignable quelle que soit la position
                  du défilement interne (la nav complète dépasse 85svh sur un petit écran). */}
              <div className="flex shrink-0 justify-end px-2 pt-2">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={HIT_AREA}
                    aria-label={t("closeMenu")}
                  >
                    <XIcon className="size-5" />
                  </Button>
                </SheetClose>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <AppSidebar
                  email={email}
                  restaurant={restaurant}
                  translationTodoCount={translationTodoCount}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

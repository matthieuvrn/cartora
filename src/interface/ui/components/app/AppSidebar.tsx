"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { cn } from "@/lib/utils";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { APP_NAV_ITEMS, groupAppNavItems, isAppNavItemActive } from "@/lib/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/interface/ui/components/Logo";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { LogoMonogram } from "@/interface/ui/components/logo/LogoMonogram";
import { TemplateLogo } from "@/interface/ui/components/menu-template/TemplateLogo";
import { logoutAction } from "@/app/(auth)/actions";
import { APP_NAV_ICONS } from "./appNavIcons";

/** Identité affichée en pied de rail : nom, logo (ou monogramme) et forfait courant. */
export type SidebarRestaurant = {
  name: string;
  logoPath: string | null;
  planTier: PlanTier;
};

export function AppSidebar({
  email,
  restaurant = null,
  translationTodoCount = 0,
  onNavigate,
}: {
  email: string;
  /** `null` avant le provisioning du 1er login (le pied ne montre alors que l'e-mail). */
  restaurant?: SidebarRestaurant | null;
  /** Champs de traduction « à relire » — pastille de comptage sur l'entrée « Traductions ». */
  translationTodoCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const tBilling = useTranslations("Billing");
  const logoUrl = restaurant?.logoPath ? restaurantLogoUrl(restaurant.logoPath) : null;
  // Le rail est rendu deux fois dans le DOM (aside desktop + tiroir « Plus » mobile) : un préfixe
  // par instance garantit des `id` de groupe uniques quand le tiroir est ouvert.
  const groupIdPrefix = useId();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="px-5 py-5">
        <Link href="/app" aria-label="Cartora" onClick={onNavigate}>
          <Logo variant="lockup" className="h-7" />
        </Link>
      </div>

      {/* `py-1` : l'anneau de focus de marque déborde de 4 px hors boîte — sans ce padding, le
          conteneur défilant rognerait l'anneau du premier et du dernier lien. */}
      <nav
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-1"
        aria-label={t("navigation")}
      >
        {groupAppNavItems(APP_NAV_ITEMS).map(({ group, items }) => {
          const labelId = `${groupIdPrefix}-${group}`;
          return (
            // Groupe de nav : kicker mono (3e registre typographique, sans point corail — le
            // climax du viewport reste « Publier ») qui nomme le groupe pour les lecteurs d'écran.
            <div key={group} role="group" aria-labelledby={labelId} className="space-y-1">
              <p id={labelId} className="eyebrow block px-3 pb-0.5">
                {t(`group.${group}`)}
              </p>
              {items.map(({ key, href, exact }) => {
                const Icon = APP_NAV_ICONS[key];
                const active = isAppNavItemActive(pathname, { href, exact });
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ease-[var(--ease-snappy)]",
                      active
                        ? // Indicateur d'ancrage : barre canard sur le bord gauche de l'entrée active.
                          "bg-accent text-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:content-['']"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    {t(key)}
                    {key === "traductions" && translationTodoCount > 0 && (
                      // Le chiffre est décoratif (`aria-label` sur un <span> sans rôle est
                      // ignoré : « nom interdit » sur role=generic) ; le texte lisible arrive en
                      // sr-only APRÈS le libellé — nom accessible « Traductions, 3 à traduire ».
                      <>
                        <span
                          aria-hidden="true"
                          className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 font-mono text-[0.6875rem] font-medium text-warning tabular-nums"
                        >
                          {translationTodoCount}
                        </span>
                        <span className="sr-only">
                          {t("translationsPending", { count: translationTodoCount })}
                        </span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-3">
        {restaurant ? (
          // Bloc identité : le restaurateur voit d'un coup d'œil QUEL établissement il édite et
          // SOUS QUEL forfait — la pastille mène à la page Abonnement (levier d'upsell permanent).
          <div className="flex items-center gap-2.5 px-2">
            {logoUrl ? (
              <TemplateLogo src={logoUrl} alt="" className="size-9 shrink-0" sizes="36px" />
            ) : (
              <LogoMonogram name={restaurant.name} className="size-9 shrink-0 text-xs" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={restaurant.name}>
                {restaurant.name}
              </p>
              <p className="truncate text-caption text-muted-foreground" title={email}>
                {email}
              </p>
            </div>
            <Badge
              asChild
              variant={restaurant.planTier === "FREE" ? "outline" : "canard"}
              className="shrink-0 font-mono uppercase"
            >
              <Link
                href="/app/abonnement"
                onClick={onNavigate}
                aria-label={`${tBilling(`tier.${restaurant.planTier}`)} · ${t("managePlan")}`}
              >
                {tBilling(`tier.${restaurant.planTier}`)}
              </Link>
            </Badge>
          </div>
        ) : (
          <p className="truncate px-3 text-caption text-muted-foreground" title={email}>
            {email}
          </p>
        )}
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <form action={logoutAction} className="flex-1">
            <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
              {t("logout")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  CreditCard,
  Languages,
  LayoutGrid,
  Palette,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { cn } from "@/lib/utils";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/interface/ui/components/Logo";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { LogoMonogram } from "@/interface/ui/components/logo/LogoMonogram";
import { TemplateLogo } from "@/interface/ui/components/menu-template/TemplateLogo";
import { logoutAction } from "@/app/(auth)/actions";

/** Identité affichée en pied de rail : nom, logo (ou monogramme) et forfait courant. */
export type SidebarRestaurant = {
  name: string;
  logoPath: string | null;
  planTier: PlanTier;
};

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  /** `true` = actif sur match exact (ex. `/app` ne doit pas s'allumer sous `/app/stats`). */
  exact: boolean;
};

// Nav de marque — source unique d'ordre et de libellés. Carte d'abord (le job), admin/consultation
// ensuite. `exact` sur /app pour qu'il ne s'allume pas sous les sous-sections.
const NAV: readonly NavItem[] = [
  { key: "menu", href: "/app", icon: LayoutGrid, exact: true },
  { key: "stats", href: "/app/stats", icon: BarChart3, exact: false },
  { key: "apparence", href: "/app/apparence", icon: Palette, exact: false },
  { key: "traductions", href: "/app/traductions", icon: Languages, exact: false },
  { key: "partage", href: "/app/partage", icon: QrCode, exact: false },
  { key: "abonnement", href: "/app/abonnement", icon: CreditCard, exact: false },
  { key: "reglages", href: "/app/reglages", icon: Settings, exact: false },
];

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

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="px-5 py-5">
        <Link href="/app" aria-label="Cartora" onClick={onNavigate}>
          <Logo variant="lockup" className="h-7" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label={t("navigation")}>
        {NAV.map(({ key, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
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
                <span
                  className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 font-mono text-[0.6875rem] font-medium text-warning tabular-nums"
                  aria-label={t("translationsPending", { count: translationTodoCount })}
                >
                  {translationTodoCount}
                </span>
              )}
            </Link>
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

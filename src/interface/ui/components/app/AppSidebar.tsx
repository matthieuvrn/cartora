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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/interface/ui/components/Logo";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { logoutAction } from "@/app/(auth)/actions";

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

export function AppSidebar({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

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
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ease-[var(--ease-snappy)]",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        <p className="truncate px-3 text-caption text-muted-foreground" title={email}>
          {email}
        </p>
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

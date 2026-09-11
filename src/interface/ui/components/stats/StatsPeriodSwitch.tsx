"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DEFAULT_STATS_PERIOD,
  STATS_PERIODS,
  type StatsPeriod,
} from "@/domain/analytics/AnalyticsTypes";
import { cn, HIT_AREA_TALL } from "@/lib/utils";

type Props = {
  /** Période active, résolue par la page depuis l'URL (jamais depuis un état local). */
  period: StatsPeriod;
};

/**
 * Sélecteur de fenêtre d'analyse, rendu dans le slot `actions` de `PageHeader`.
 *
 * L'URL EST l'état (`/app/stats` = 7 jours, `?period=30` = 30 jours) : partageable, exacte au
 * rendu serveur, compatible avec le `loading.tsx` de la route et sans stockage local (la règle
 * « exactement six hooks » interdit un hook de persistance dédié). D'où deux `<Link>` natifs dans
 * un `<nav>` plutôt que des `Tabs` Radix : il n'y a aucun panneau tabbé ni aucun état client à
 * tenir, et une navigation client suffit.
 *
 * Le conteneur reste sur `bg-background` : `text-muted-foreground` sur `bg-muted` (sand-100)
 * tombe sous 4,5:1 — le token est calibré pour un fond sand-50. Le vocabulaire actif/inactif est
 * celui, déjà validé, du rail de navigation.
 */
export function StatsPeriodSwitch({ period }: Props) {
  const t = useTranslations("Stats");

  return (
    <nav
      aria-label={t("period.label")}
      className="inline-flex items-center gap-0.5 rounded-full border bg-background p-0.5"
    >
      {STATS_PERIODS.map((days) => {
        const active = days === period;
        return (
          <Link
            key={days}
            href={days === DEFAULT_STATS_PERIOD ? "/app/stats" : `/app/stats?period=${days}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3 font-mono text-caption tabular-nums transition-colors ease-[var(--ease-snappy)]",
              HIT_AREA_TALL,
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("period.option", { days })}
          </Link>
        );
      })}
    </nav>
  );
}

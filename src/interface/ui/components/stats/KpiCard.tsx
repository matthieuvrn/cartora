import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  /** Pastille posée en ligne à droite de la valeur (variation vs période précédente). */
  delta?: ReactNode;
  /** Mini-courbe posée sous la description (tendance de la fenêtre). */
  trend?: ReactNode;
};

/**
 * Tuile KPI : libellé en mono capitales (registre « data » de la DA), valeur mono tabulaire —
 * animée en compteur quand elle est numérique (cf. AnimatedNumber), rendue telle quelle sinon
 * (« — », heure de pointe, appareil).
 *
 * Deux slots optionnels, réservés aux tuiles qui portent une tendance : `delta` (à droite de la
 * valeur, la rangée passe à la ligne en étroit plutôt que de tronquer le chiffre) et `trend`
 * (sous la description). Le composant reste sans directive client.
 */
export function KpiCard({ title, value, icon: Icon, description, delta, trend }: Props) {
  return (
    <Card className="transition-colors hover:border-canard-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-micro text-muted-foreground uppercase">
            {title}
          </span>
          <Icon className="size-4 shrink-0 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="min-w-0 truncate font-mono text-2xl font-bold tabular-nums">
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
          </p>
          {delta}
        </div>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        {trend && <div className="mt-3">{trend}</div>}
      </CardContent>
    </Card>
  );
}

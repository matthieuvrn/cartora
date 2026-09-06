import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
};

/**
 * Tuile KPI : libellé en mono capitales (registre « data » de la DA), valeur mono tabulaire —
 * animée en compteur quand elle est numérique (cf. AnimatedNumber), rendue telle quelle sinon
 * (« — », heure de pointe, appareil).
 */
export function KpiCard({ title, value, icon: Icon, description }: Props) {
  return (
    <Card className="transition-colors hover:border-canard-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-micro text-muted-foreground uppercase">
            {title}
          </span>
          <Icon className="size-4 shrink-0 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-2 truncate font-mono text-2xl font-bold tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

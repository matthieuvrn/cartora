import { useLocale, useTranslations } from "next-intl";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { StatsPeriod, ViewsDelta } from "@/domain/analytics/AnalyticsTypes";
import { Badge } from "@/components/ui/badge";

type Props = {
  /** Variation calculée par le domaine (`AnalyticsPolicy.computeViewsDelta`). */
  delta: ViewsDelta;
  /** Longueur de la fenêtre comparée, pour la phrase lue par les lecteurs d'écran. */
  days: StatsPeriod;
  /** Vues de la fenêtre courante. */
  current: number;
  /** Vues de la fenêtre précédente de même longueur. */
  previous: number;
};

const ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

/**
 * Pastille de variation vs la période précédente de même longueur.
 *
 * Grammaire couleur : la hausse seule est sémantiquement un succès (`variant="success"`, sapin) ;
 * la baisse et le statu quo restent neutres (`outline`) — une baisse de fréquentation n'est ni une
 * erreur (jamais `danger`) ni un climax (jamais corail, réservé au bouton « Publier »).
 *
 * Jamais d'information portée par la seule couleur : icône distincte par état, signe explicite
 * dans le nombre (« +12 % », « -12 % », « 0 % ») et phrase complète en `sr-only` citant les deux
 * totaux. Le nombre visible est `aria-hidden` pour éviter une double lecture.
 *
 * Les cas `none` (rien à comparer) et `new` (première période mesurée) ne rendent RIEN : le
 * silence est plus honnête qu'un libellé « Nouveau » qui entrerait en collision avec le badge
 * d'item du même nom. La fenêtre est de toute façon rappelée sous la valeur (« 7 derniers jours »).
 */
export function ViewsDeltaBadge({ delta, days, current, previous }: Props) {
  const t = useTranslations("Stats");
  const locale = useLocale();

  if (delta.kind === "none" || delta.kind === "new") return null;

  const signedPct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(delta.pct / 100);

  const absPct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "never",
  }).format(delta.pct / 100);

  const Icon = ICONS[delta.kind];

  return (
    <Badge
      variant={delta.kind === "up" ? "success" : "outline"}
      className="gap-1 font-mono tabular-nums"
    >
      <Icon strokeWidth={1.75} aria-hidden="true" />
      <span aria-hidden="true">{signedPct}</span>
      <span className="sr-only">
        {t(`delta.${delta.kind}`, { value: absPct, current, previous, days })}
      </span>
    </Badge>
  );
}

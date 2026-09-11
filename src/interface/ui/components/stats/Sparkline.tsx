import { buildSparklinePaths } from "@/lib/sparkline";
import { cn } from "@/lib/utils";

type Props = {
  /** Série à tracer, dans l'ordre chronologique (un point par jour de la fenêtre). */
  values: number[];
  className?: string;
};

const VIEW_W = 100;
const VIEW_H = 28;
const INSET = 2;

/**
 * Mini-courbe de tendance, en SVG inline sans bibliothèque.
 *
 * Pourquoi pas recharts alors qu'il est déjà dans le chunk : `ChartContainer` impose un
 * `aspect-video` et un `ResponsiveContainer` (ResizeObserver, dimension initiale 320×200 au rendu
 * serveur) qui provoque un saut de dimension à l'hydratation, plus un id de gradient à dédupliquer
 * et une couche tooltip inutile pour 7 à 30 points. Ici : aucun état, aucun effet, aucune mesure
 * DOM — la sortie est identique serveur et client, donc pas de flash de dimension.
 *
 * `aria-hidden` assumé : la DIRECTION est portée par la pastille de delta (phrase complète en
 * `sr-only`) et la SÉRIE détaillée par `ViewsChart` juste dessous (`accessibilityLayer` recharts,
 * navigable au clavier). Pas de point terminal : le `preserveAspectRatio="none"` étire l'axe X,
 * un cercle y deviendrait une ellipse. Aucune animation, donc aucun besoin de `useReducedMotionSafe`.
 */
export function Sparkline({ values, className }: Props) {
  const paths = buildSparklinePaths(values, { width: VIEW_W, height: VIEW_H, inset: INSET });
  if (!paths) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-7 w-full overflow-visible", className)}
    >
      <path d={paths.area} fill="var(--chart-1)" fillOpacity={0.12} stroke="none" />
      <path
        d={paths.line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

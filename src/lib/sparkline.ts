export type SparklinePaths = { line: string; area: string };

type SparklineOptions = {
  /** Largeur du viewBox en unités SVG (le rendu est ensuite étiré par `preserveAspectRatio`). */
  width: number;
  /** Hauteur du viewBox en unités SVG. */
  height: number;
  /** Marge verticale réservée en haut et en bas, pour ne pas rogner le trait aux extrêmes. */
  inset: number;
};

/** Une seule précision pour TOUTES les coordonnées : sortie déterministe serveur/client. */
function fmt(value: number): string {
  return value.toFixed(2);
}

/**
 * Géométrie d'une mini-courbe (sparkline), sans aucune dépendance graphique : deux chaînes `d`
 * SVG, l'une pour le trait, l'autre pour l'aplat refermé sur la base du viewBox.
 *
 * Cas limites volontaires :
 * - moins de 2 points ⇒ `null` (l'appelant ne rend rien : un point isolé n'est pas une tendance) ;
 * - série entièrement nulle ⇒ trait posé sur la ligne de base (`height - inset`), pas au milieu :
 *   un « 0 » ne doit pas ressembler à un plateau ;
 * - série constante non nulle ⇒ trait centré verticalement (aucune échelle n'a de sens).
 *
 * L'échelle verticale va de `min` à `max` (pas de zéro forcé) : sur des séries de vues faibles,
 * c'est la variation relative qui porte l'information, le chiffre exact est dans la tuile.
 */
export function buildSparklinePaths(
  values: number[],
  { width, height, inset }: SparklineOptions,
): SparklinePaths | null {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const usableHeight = height - 2 * inset;

  const x = (index: number) => (index / (values.length - 1)) * width;
  const y = (value: number) => {
    if (range === 0) return max === 0 ? height - inset : height / 2;
    return height - inset - ((value - min) / range) * usableHeight;
  };

  const line = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${fmt(x(index))} ${fmt(y(value))}`)
    .join(" ");

  const area = `${line} L${fmt(width)} ${fmt(height)} L${fmt(0)} ${fmt(height)} Z`;

  return { line, area };
}

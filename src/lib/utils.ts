import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zones tactiles confortables (~44px, Apple HIG) sans grossir l'icône : un pseudo-élément
 * `::after` transparent, centré, capte le tap — un clic sur le pseudo est attribué au bouton
 * parent. Le plancher WCAG 2.2 AA (24px, SC 2.5.8) reste assuré par la taille visuelle ; ceci
 * n'ajoute que du confort. Trois variantes selon le voisinage, pour ne JAMAIS chevaucher une
 * cible adjacente (notamment Supprimer ⟷ Modifier).
 */
// Bouton isolé : zone 44×44 centrée.
export const HIT_AREA =
  "relative after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";
// Voisins horizontaux (Modifier/Supprimer) : haute (44) mais étroite (28) → pas de recouvrement latéral.
export const HIT_AREA_TALL =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";
// Voisins verticaux (réordonner ↑/↓) : large (44) mais courte (24) → pas de recouvrement vertical.
export const HIT_AREA_WIDE =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-6 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Tokens `--text-*` déclarés dans le `@theme` de globals.css. À TENIR EN PHASE : hors de cette
 * liste, tailwind-merge (qui ne connaît que les tailles t-shirt) classe `text-<token>` comme une
 * COULEUR et le supprime dès qu'un `text-<couleur>` le suit dans le même `cn()` — le pricing
 * landing a rendu ses titres et ses prix à 16 px hérités pendant des semaines pour cette raison.
 */
const THEME_TEXT_SIZES = [
  "micro",
  "caption",
  "body-sm",
  "body",
  "body-lg",
  "lead",
  "h1",
  "h2",
  "h3",
  "display-lg",
  "display-xl",
  "display-2xl",
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: THEME_TEXT_SIZES }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * `true` si l'utilisateur préfère un mouvement réduit — à consulter avant tout
 * scroll ou animation programmés (scrollIntoView smooth, Web Animations…).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

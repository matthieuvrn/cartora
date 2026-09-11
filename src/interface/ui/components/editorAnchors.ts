import { prefersReducedMotion } from "@/lib/utils";

/**
 * Ancres et défilement de l'éditeur de carte — module FEUILLE : il ne dépend d'aucun composant,
 * ce qui le rend importable par `ItemRow`, `ItemFormDialog` et la palette de commandes sans créer
 * de cycle (`ItemRow` importe déjà `ItemFormDialog` : exporter l'ancre depuis l'un d'eux formerait
 * une boucle ESM).
 */

/** Ancre stable d'une rangée d'item : posée par `ItemRow`, ciblée après création et par la palette. */
export function itemRowId(itemId: string): string {
  return `item-${itemId}`;
}

/**
 * Décalage haut (px) : hauteur approximative des barres collantes (topbar mobile + chips, ou
 * toolbar desktop) sous lesquelles une catégorie doit se poser. SERT À LA FOIS de cible de
 * défilement au clic ET de ligne de détection du scroll-spy — c'est le fait de partager la même
 * valeur qui garantit que la catégorie sur laquelle on vient de cliquer est bien celle qui
 * s'active (indépendamment de sa valeur exacte, purement cosmétique).
 */
export const EDITOR_STICKY_OFFSET = 116;

/**
 * Amène un élément juste sous les barres collantes. Fait « à la main » (`window.scrollTo` avec
 * décalage explicite) plutôt que via `scrollIntoView`, pour NE PAS empiler le
 * `scroll-padding-top: 4rem` global avec un `scroll-mt` — combinaison qui posait la catégorie trop
 * bas et faisait détecter la catégorie précédente.
 */
export function scrollToBelowStickyBars(el: HTMLElement): void {
  const top = el.getBoundingClientRect().top + window.scrollY - EDITOR_STICKY_OFFSET;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

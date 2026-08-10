import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * `prefers-reduced-motion`, version hydration-safe — remplace `useReducedMotion()` de
 * motion/react dans les composants qui branchent leur STRUCTURE dessus (landing statique).
 *
 * Pourquoi : `useReducedMotion()` vaut `null` au prerender puis la vraie valeur dès le
 * PREMIER rendu client (lecture synchrone de matchMedia, jamais re-souscrite) — sur les
 * pages statiques `/` et `/en`, un visiteur PRM hydrate donc un arbre différent du HTML
 * prérendu (branche animée) : erreur d'hydratation récupérable à chaque visite + bascule
 * full-CSR. Ici, `getServerSnapshot` renvoie `false` → le premier rendu client est
 * identique au HTML (branche animée), puis `useSyncExternalStore` re-rend immédiatement
 * après montage avec la vraie valeur : le visiteur PRM bascule sur la branche statique via
 * une mise à jour React normale. Bonus : la souscription `change` suit les activations de
 * PRM en cours de session (ce que le hook de motion ne fait pas).
 */
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

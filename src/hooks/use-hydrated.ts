import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `false` au rendu serveur ET au premier rendu client (hydratation), `true` juste après.
 *
 * Sert à rendre `null` de façon déterministe des deux côtés pour un composant dont le
 * contenu dépend d'un état purement client (cookie, matchMedia, searchParams…) : le HTML
 * serveur et le premier rendu client coïncident toujours → aucune erreur d'hydratation
 * possible, quel que soit le mode de rendu (statique, dynamique, dev Turbopack) ou une
 * extension navigateur qui retire le nœud avant React. `useSyncExternalStore` garantit
 * la bascule immédiatement après le montage, sans setState-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

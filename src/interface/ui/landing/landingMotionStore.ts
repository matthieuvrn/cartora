import { useSyncExternalStore } from "react";

/**
 * Micro-store client « pause des animations landing » (WCAG 2.2.2 Pause/Stop/Hide, G186 :
 * UN contrôle en haut de page suffit pour tous les mouvements parallèles). Alimenté par le
 * bouton pause du bloc démo (HeroLiveDemo) ; consommé par le cycle du menu vivant et le
 * float du téléphone (les fonds des scènes nuit sont STATIQUES depuis la DA 2026 — plus
 * de canvas animé à suspendre). Même pattern
 * useSyncExternalStore que ConsentContext — état 100 % client, aucune API dynamique, donc
 * compatible pages statiques. Module-level : jamais muté côté serveur (getServerSnapshot).
 */

type Listener = () => void;

let paused = false;
const listeners = new Set<Listener>();

export function setLandingMotionPaused(next: boolean) {
  paused = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLandingMotionPaused(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => paused,
    () => false,
  );
}

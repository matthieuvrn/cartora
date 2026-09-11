/**
 * Contrat CSS de la barre d'onglets basse mobile (`MobileTabBar`). La hauteur est définie en CSS
 * pur dans globals.css (`html:has([data-app-shell])` : 0 dès `md`, 3.5rem + safe-area sous `md`) —
 * aucun JS, aucun ResizeObserver. Module SANS "use client", comme `consent/cookieBannerOffset.ts` :
 * importable tel quel par un composant serveur (depuis un module client, la constante deviendrait
 * une référence client, pas une chaîne).
 *
 * Consommateurs : la barre elle-même (`height`), le `<main>` d'`AppShell` (`padding-bottom`) et
 * `html { scroll-padding-bottom }` (ancres et focus clavier, WCAG 2.4.11).
 */

/** Variable CSS posée sur <html> = hauteur de la barre d'onglets ; 0 hors du shell et dès `md`. */
export const MOBILE_TAB_BAR_HEIGHT_VAR = "--mobile-tab-bar-h";
/** Valeur prête à consommer (`height` / `padding-bottom`) : 0 quand la barre n'est pas rendue. */
export const MOBILE_TAB_BAR_OFFSET = `var(${MOBILE_TAB_BAR_HEIGHT_VAR}, 0px)`;

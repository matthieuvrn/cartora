/**
 * Contrat CSS entre la bannière cookies et ce qu'elle recouvrirait. Module SANS "use client"
 * pour être importable tel quel par des composants serveur (footers) : depuis un module client,
 * une constante exportée deviendrait une référence client, pas une chaîne.
 */

/** Variable CSS posée sur <html> = hauteur de la bannière visible ; retirée sinon. */
export const COOKIE_BANNER_HEIGHT_VAR = "--cookie-banner-h";
/** Valeur prête à consommer (`margin-bottom` / `bottom`) : 0 quand la bannière est absente. */
export const COOKIE_BANNER_OFFSET = `var(${COOKIE_BANNER_HEIGHT_VAR}, 0px)`;

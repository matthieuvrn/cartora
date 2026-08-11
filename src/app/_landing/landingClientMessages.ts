/**
 * Namespaces réellement consommés par les composants CLIENTS de la landing — les seuls que
 * le NextIntlClientProvider des pages `/` et `/en` doit embarquer dans le payload de la page.
 * Les composants SERVEUR (sections, footer) passent par getTranslations/useTranslations RSC
 * et n'ont pas besoin du provider ; embarquer fr.json entier (~44 KB) faisait voyager
 * Dashboard/Privacy/Settings/… chez chaque visiteur pour rien.
 *
 * Inventaire (à re-vérifier avant d'ajouter ici) :
 *  - "Landing"  : HeroIntro/HeroLiveDemo/HeroQrCard (hero), LandingFaqV2 (faq),
 *                 LandingHeader + StickyMobileCTA (header), TrackedCtaButton (racine —
 *                 opensInNewTab)
 *  - "Consent"  : CookieBanner + ManageCookiesButton (rendu par le footer serveur)
 *
 * RÈGLE : tout NOUVEAU composant client de la landing qui consomme un namespace absent
 * d'ici doit l'ajouter à LANDING_CLIENT_NAMESPACES — sinon le symptôme est une erreur
 * console MISSING_MESSAGE au runtime (que rien ne teste). La divergence inverse (namespace
 * listé mais disparu de messages/*.json) casse le typecheck via la contrainte générique.
 */
const LANDING_CLIENT_NAMESPACES = ["Landing", "Consent"] as const;

type LandingClientNamespace = (typeof LANDING_CLIENT_NAMESPACES)[number];

export function landingClientMessages<M extends Record<LandingClientNamespace, unknown>>(
  messages: M,
): Pick<M, LandingClientNamespace> {
  return Object.fromEntries(LANDING_CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]])) as Pick<
    M,
    LandingClientNamespace
  >;
}

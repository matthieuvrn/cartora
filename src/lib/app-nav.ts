/**
 * Nav de marque `/app` — SOURCE UNIQUE d'ordre, de routes et de groupes.
 *
 * Consommée par le rail (`AppSidebar`), le tiroir « Plus » mobile, la barre d'onglets basse
 * (`MobileTabBar`) et la palette de commandes. Chacun ajoutait sinon sa propre liste : trois
 * copies à resynchroniser à chaque nouvelle section.
 *
 * Module FRAMEWORK-FREE, par convention non outillée (`src/lib` n'est pas couvert par les zones
 * d'import ESLint) : aucun import de React, Next ou lucide-react. Les icônes vivent à part dans
 * `src/interface/ui/components/app/appNavIcons.ts` (ce sont des composants React). Règle
 * d'import : les DONNÉES et les HELPERS viennent toujours d'ici, les ICÔNES toujours de là-bas —
 * aucun ré-export, pour qu'un symbole n'ait jamais deux chemins d'import concurrents.
 */

export type AppNavKey =
  | "menu"
  | "stats"
  | "apparence"
  | "traductions"
  | "partage"
  | "abonnement"
  | "reglages";

/** Groupes du rail : le job d'abord (« carte »), puis la diffusion, puis l'administratif. */
export type AppNavGroup = "carte" | "diffusion" | "compte";

export type AppNavItem = {
  key: AppNavKey;
  href: string;
  group: AppNavGroup;
  /** `true` = actif sur match exact (`/app` ne doit pas s'allumer sous `/app/stats`). */
  exact: boolean;
  /** `true` = entrée reprise dans la barre d'onglets basse mobile. */
  mobileTab: boolean;
};

export const APP_NAV_GROUP_ORDER = ["carte", "diffusion", "compte"] as const;

/** Ordre canonique — Carte d'abord (le job), consultation/diffusion ensuite, compte en dernier. */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { key: "menu", href: "/app", group: "carte", exact: true, mobileTab: true },
  { key: "stats", href: "/app/stats", group: "diffusion", exact: false, mobileTab: true },
  { key: "apparence", href: "/app/apparence", group: "diffusion", exact: false, mobileTab: false },
  {
    key: "traductions",
    href: "/app/traductions",
    group: "diffusion",
    exact: false,
    mobileTab: false,
  },
  { key: "partage", href: "/app/partage", group: "diffusion", exact: false, mobileTab: true },
  { key: "abonnement", href: "/app/abonnement", group: "compte", exact: false, mobileTab: false },
  { key: "reglages", href: "/app/reglages", group: "compte", exact: false, mobileTab: false },
];

/** Onglets de la barre basse, dans l'ordre de la nav (le 4ᵉ onglet « Plus » est de l'UI pure). */
export const MOBILE_TAB_ITEMS: readonly AppNavItem[] = APP_NAV_ITEMS.filter((i) => i.mobileTab);

/**
 * Entrée active pour un pathname donné. Durcissement assumé vs l'ancien `startsWith(href)` nu :
 * on exige la frontière de segment, donc `/app/statsX` n'allume plus « Statistiques » et `/app/`
 * (avec slash final, que Next normalise de toute façon) n'allume plus rien.
 */
export function isAppNavItemActive(
  pathname: string,
  item: Pick<AppNavItem, "href" | "exact">,
): boolean {
  return pathname === item.href || (!item.exact && pathname.startsWith(item.href + "/"));
}

/** Vrai si la page courante vit derrière l'onglet « Plus » (aucun onglet visible ne la porte). */
export function isMoreSectionActive(pathname: string): boolean {
  return APP_NAV_ITEMS.some((item) => !item.mobileTab && isAppNavItemActive(pathname, item));
}

/**
 * Regroupe des entrées selon `APP_NAV_GROUP_ORDER` (ordre des groupes indépendant de l'ordre
 * d'entrée), en conservant l'ordre d'entrée DANS chaque groupe et en omettant les groupes vides.
 * Générique : le rail passe des entrées enrichies d'une icône.
 */
export function groupAppNavItems<T extends Pick<AppNavItem, "group">>(
  items: readonly T[],
): { group: AppNavGroup; items: T[] }[] {
  return APP_NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((bucket) => bucket.items.length > 0);
}

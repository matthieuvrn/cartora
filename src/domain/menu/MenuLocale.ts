/**
 * Locales du CONTENU des menus (S4 — multilingue), à distinguer du chrome UI
 * fr/en géré par next-intl : un restaurateur peut proposer sa carte en italien
 * sans que le dashboard existe en italien.
 *
 * Ajouter une langue = étendre `SUPPORTED_MENU_LOCALES` + `MENU_LOCALE_LABELS`
 * (+ le CHECK SQL de `translations.locale` et un fichier `messages/<locale>.json`
 * partiel pour le menu public). Latin uniquement en v1 — RTL/CJK exigeraient un
 * travail fontes/CSS sur les templates.
 */

export const SUPPORTED_MENU_LOCALES = ["fr", "en", "es", "de", "it"] as const;

export type MenuLocale = (typeof SUPPORTED_MENU_LOCALES)[number];

/**
 * Texte localisé par locale. Clé absente ou valeur vide = pas (encore) de
 * traduction — la résolution publique retombe sur la langue source.
 */
export type LocalizedText = Partial<Record<MenuLocale, string>>;

export function isMenuLocale(value: string): value is MenuLocale {
  return (SUPPORTED_MENU_LOCALES as readonly string[]).includes(value);
}

/**
 * Résolution d'affichage avec chaîne de repli EXPLICITE : locale demandée →
 * langue source → "". Le visiteur voit toujours quelque chose (le texte source) ;
 * l'honnêteté sur la couverture réelle vit côté dashboard (`translationStatus`),
 * pas dans le rendu public.
 */
export function resolveText(
  map: LocalizedText,
  requested: MenuLocale,
  sourceLocale: MenuLocale,
): string {
  return map[requested] || map[sourceLocale] || "";
}

/**
 * Endonymes (chaque langue dans sa propre langue) — affichés tels quels dans le
 * switcher du menu public et la page de réglages. Pas de clé i18n : « Español »
 * s'écrit pareil quelle que soit la langue du lecteur.
 */
export const MENU_LOCALE_LABELS: Record<MenuLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
};

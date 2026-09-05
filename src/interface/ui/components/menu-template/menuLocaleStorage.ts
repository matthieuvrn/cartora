import { isMenuLocale, type MenuLocale } from "@/domain/menu/MenuLocale";

/** Clé localStorage de la langue de LECTURE choisie via le switcher du menu public. */
export const MENU_LOCALE_STORAGE_KEY = "cartora_locale";

/**
 * Préférence de langue persistée, validée contre les langues disponibles du snapshot — une
 * valeur orpheline (langue désactivée depuis) ou un storage inaccessible (navigation privée
 * stricte) rendent `null`. Partagée par le switcher (état affiché) et le beacon (langue
 * comptée) pour qu'ils ne divergent jamais.
 */
export function readStoredMenuLocale(available: readonly MenuLocale[]): MenuLocale | null {
  try {
    const saved = localStorage.getItem(MENU_LOCALE_STORAGE_KEY);
    if (saved && isMenuLocale(saved) && available.includes(saved)) return saved;
  } catch {
    // localStorage indisponible : pas de préférence.
  }
  return null;
}

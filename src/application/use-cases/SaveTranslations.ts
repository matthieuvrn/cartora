import type { MenuRepository } from "@/application/ports/MenuRepository";
import type {
  TranslationRepository,
  TranslationRow,
} from "@/application/ports/TranslationRepository";
import { isMenuLocale, type MenuLocale } from "@/domain/menu/MenuLocale";
import { hashSourceText } from "@/domain/menu/textHash";
import { buildTranslationUnits, maxTranslationValueLength } from "@/domain/menu/translationStatus";
import { DomainError } from "@/domain/errors/DomainError";

export type SaveTranslationsInput = {
  restaurantId: string;
  /** Code brut venu de l'UI — validé ET vérifié activé pour ce restaurant. */
  locale: string;
  entries: {
    entityType: string;
    entityId: string;
    field: string;
    value: string;
  }[];
};

export type SaveTranslationsOutput = {
  savedCount: number;
};

/**
 * Enregistre les traductions saisies manuellement dans l'écran de revue (S4),
 * pour UNE langue cible. Chaque entrée doit correspondre à une unité traduisible
 * du restaurant (source non vide) — sinon `ownership_mismatch` (id étranger,
 * champ inconnu ou texte source vide). Le hash de fraîcheur est calculé contre
 * le texte source ACTUEL ; valeur vide ⇒ suppression de la ligne (missing).
 */
export class SaveTranslations {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly translationRepo: TranslationRepository,
  ) {}

  async execute(input: SaveTranslationsInput): Promise<SaveTranslationsOutput> {
    if (!isMenuLocale(input.locale)) {
      throw new DomainError("invalid_locale", { locale: input.locale });
    }
    const locale: MenuLocale = input.locale;

    const menu = await this.menuRepo.getMenuByRestaurantId(input.restaurantId);
    if (!menu) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    if (!menu.enabledLocales.includes(locale) || locale === menu.sourceLocale) {
      throw new DomainError("locale_not_enabled", { locale });
    }

    const [dailyDishes, formulas] = await Promise.all([
      this.menuRepo.listDailyDishes(input.restaurantId),
      this.menuRepo.listFormulas(input.restaurantId),
    ]);
    const units = buildTranslationUnits(menu, dailyDishes, formulas);
    const unitByKey = new Map(
      units.map((u): [string, (typeof units)[number]] => [
        `${u.entityType}:${u.entityId}:${u.field}`,
        u,
      ]),
    );

    const rows: TranslationRow[] = input.entries.map((entry) => {
      const unit = unitByKey.get(`${entry.entityType}:${entry.entityId}:${entry.field}`);
      if (!unit) {
        throw new DomainError("ownership_mismatch", { entityId: entry.entityId });
      }
      const maxLength = maxTranslationValueLength(unit.entityType, unit.field);
      const value = entry.value.trim().slice(0, maxLength);
      return {
        entityType: unit.entityType,
        entityId: unit.entityId,
        field: unit.field,
        locale,
        value,
        // La traduction est validée contre le texte source actuel ⇒ fresh.
        sourceTextHash: value === "" ? null : hashSourceText(unit.sourceText),
      };
    });

    await this.translationRepo.upsertMany({ restaurantId: input.restaurantId, rows });

    return { savedCount: rows.length };
  }
}

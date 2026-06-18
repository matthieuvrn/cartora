import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { TranslationRepository } from "@/application/ports/TranslationRepository";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import {
  buildTranslationUnits,
  computeFieldStatus,
  type LocaleCoverage,
  type TranslationFieldStatus,
  type TranslationUnit,
} from "@/domain/menu/translationStatus";
import { DomainError } from "@/domain/errors/DomainError";

export type GetTranslationOverviewInput = {
  restaurantId: string;
};

export type TranslationUnitView = TranslationUnit & {
  /** Valeur + statut par langue cible activée. */
  perLocale: Partial<Record<MenuLocale, { value: string; status: TranslationFieldStatus }>>;
};

export type GetTranslationOverviewOutput = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  units: TranslationUnitView[];
  coverage: LocaleCoverage[];
};

/**
 * Construit l'état complet de l'écran de revue (S4) : chaque champ traduisible
 * (source non vide) avec sa valeur et son statut (`fresh`/`stale`/`missing`) par
 * langue activée, plus l'agrégat de couverture par langue.
 */
export class GetTranslationOverview {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly translationRepo: TranslationRepository,
  ) {}

  async execute(input: GetTranslationOverviewInput): Promise<GetTranslationOverviewOutput> {
    const menu = await this.menuRepo.getMenuByRestaurantId(input.restaurantId);
    if (!menu) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    const [dailyDishes, formulas, rows] = await Promise.all([
      this.menuRepo.listDailyDishes(input.restaurantId),
      this.menuRepo.listFormulas(input.restaurantId),
      this.translationRepo.listForRestaurant(input.restaurantId),
    ]);

    const units = buildTranslationUnits(menu, dailyDishes, formulas);

    // Index lignes par (entityType:entityId:field:locale)
    const rowByKey = new Map<string, { value: string; sourceTextHash: string | null }>();
    for (const row of rows) {
      rowByKey.set(`${row.entityType}:${row.entityId}:${row.field}:${row.locale}`, {
        value: row.value,
        sourceTextHash: row.sourceTextHash,
      });
    }

    const coverageByLocale = new Map<MenuLocale, LocaleCoverage>(
      menu.enabledLocales.map((locale) => [
        locale,
        { locale, total: units.length, fresh: 0, stale: 0, missing: 0 },
      ]),
    );

    const unitViews: TranslationUnitView[] = units.map((unit) => {
      const perLocale: TranslationUnitView["perLocale"] = {};
      for (const locale of menu.enabledLocales) {
        const row = rowByKey.get(`${unit.entityType}:${unit.entityId}:${unit.field}:${locale}`);
        const status = computeFieldStatus({
          value: row?.value,
          sourceTextHash: row?.sourceTextHash,
          sourceText: unit.sourceText,
        });
        perLocale[locale] = { value: row?.value ?? "", status };
        const coverage = coverageByLocale.get(locale);
        if (coverage) coverage[status] += 1;
      }
      return { ...unit, perLocale };
    });

    return {
      sourceLocale: menu.sourceLocale,
      enabledLocales: menu.enabledLocales,
      units: unitViews,
      coverage: [...coverageByLocale.values()],
    };
  }
}

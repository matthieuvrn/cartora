import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { TranslationRepository } from "@/application/ports/TranslationRepository";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import {
  buildTranslationUnits,
  computeFieldStatus,
  type LocaleCoverage,
} from "@/domain/menu/translationStatus";
import { DomainError } from "@/domain/errors/DomainError";

export type GetTranslationOverviewInput = {
  restaurantId: string;
};

export type GetTranslationOverviewOutput = {
  sourceLocale: MenuLocale;
  enabledLocales: MenuLocale[];
  coverage: LocaleCoverage[];
};

/**
 * Agrège la couverture de traduction par langue activée (`fresh`/`stale`/`missing`)
 * pour l'écran `/app/traductions` (barres de progression) et la pastille de la
 * sidebar. En flux full-auto (S4, refonte 2026), il n'y a plus de saisie manuelle :
 * cette vue est en lecture seule et n'expose que l'agrégat — plus de valeurs par
 * champ ni de matrice. L'auto-traduction (`AutoTranslateMenu`) reconstruit son propre
 * périmètre d'unités à partir de la même base domaine (`buildTranslationUnits`).
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

    for (const unit of units) {
      for (const locale of menu.enabledLocales) {
        const row = rowByKey.get(`${unit.entityType}:${unit.entityId}:${unit.field}:${locale}`);
        const status = computeFieldStatus({
          value: row?.value,
          sourceTextHash: row?.sourceTextHash,
          sourceText: unit.sourceText,
        });
        const coverage = coverageByLocale.get(locale);
        if (coverage) coverage[status] += 1;
      }
    }

    return {
      sourceLocale: menu.sourceLocale,
      enabledLocales: menu.enabledLocales,
      coverage: [...coverageByLocale.values()],
    };
  }
}

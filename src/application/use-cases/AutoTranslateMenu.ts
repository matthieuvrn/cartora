import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type {
  TranslationRepository,
  TranslationRow,
} from "@/application/ports/TranslationRepository";
import type { TranslationService } from "@/application/ports/TranslationService";
import type { TranslationUsageRepository } from "@/application/ports/TranslationUsageRepository";
import type { Clock } from "@/application/ports/Clock";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import {
  DEFAULT_MONTHLY_CHAR_BUDGET,
  TranslationBudgetPolicy,
} from "@/domain/menu/TranslationBudgetPolicy";
import { appCalendarDayISO } from "@/domain/time/appTimeZone";
import { isMenuLocale, type MenuLocale } from "@/domain/menu/MenuLocale";
import { hashSourceText } from "@/domain/menu/textHash";
import {
  buildTranslationUnits,
  computeFieldStatus,
  maxTranslationValueLength,
} from "@/domain/menu/translationStatus";
import { DomainError } from "@/domain/errors/DomainError";

export type AutoTranslateMenuInput = {
  restaurantId: string;
  /** Code brut venu de l'UI — validé + vérifié activé. */
  targetLocale: string;
};

export type AutoTranslateMenuOutput = {
  /** Champs effectivement traduits (manquants + obsolètes). */
  translatedCount: number;
  /** Champs déjà à jour, ignorés (maîtrise du quota). */
  skippedCount: number;
};

/**
 * Traduction automatique d'une langue cible (S4 — PRO uniquement, via DeepL).
 * Cost-aware : ne traduit QUE les champs `missing`/`stale` (jamais ceux déjà
 * `fresh`), pour ne pas reconsommer le quota externe à chaque clic. Les valeurs
 * traduites sont écrites avec un hash frais (⇒ `fresh` au prochain affichage).
 *
 * Budget durable (anti-abus) : avant tout appel DeepL, la consommation est vérifiée
 * contre `TranslationBudgetPolicy` (plafonds jour/restaurant + budget mensuel global)
 * via le compteur DB `TranslationUsageRepository` — le seul garde-fou qui survit aux
 * cold starts Vercel, contrairement au rate limiter d'action. La réservation est
 * pessimiste : comptée AVANT l'envoi (un appel DeepL en échec reste compté) ; un appel
 * refusé par la policy ne compte RIEN (le spam post-blocage ne brûle pas le budget).
 */
export class AutoTranslateMenu {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly translationRepo: TranslationRepository,
    private readonly translationService: TranslationService,
    private readonly usageRepo: TranslationUsageRepository,
    private readonly clock: Clock,
    /** Budget mensuel GLOBAL en caractères (env `DEEPL_MONTHLY_CHAR_BUDGET` au root). */
    private readonly monthlyCharBudget: number = DEFAULT_MONTHLY_CHAR_BUDGET,
  ) {}

  async execute(input: AutoTranslateMenuInput): Promise<AutoTranslateMenuOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseAutoTranslation(restaurant.planTier)) {
      throw new DomainError("auto_translation_not_allowed", { tier: restaurant.planTier });
    }

    if (!isMenuLocale(input.targetLocale)) {
      throw new DomainError("invalid_locale", { locale: input.targetLocale });
    }
    const targetLocale: MenuLocale = input.targetLocale;

    const menu = await this.menuRepo.getMenuByRestaurantId(input.restaurantId);
    if (!menu) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    if (!menu.enabledLocales.includes(targetLocale) || targetLocale === menu.sourceLocale) {
      throw new DomainError("locale_not_enabled", { locale: targetLocale });
    }

    const [dailyDishes, formulas, rows] = await Promise.all([
      this.menuRepo.listDailyDishes(input.restaurantId),
      this.menuRepo.listFormulas(input.restaurantId),
      this.translationRepo.listForRestaurant(input.restaurantId),
    ]);

    const rowByKey = new Map<string, { value: string; sourceTextHash: string | null }>();
    for (const row of rows) {
      if (row.locale !== targetLocale) continue;
      rowByKey.set(`${row.entityType}:${row.entityId}:${row.field}`, {
        value: row.value,
        sourceTextHash: row.sourceTextHash,
      });
    }

    const units = buildTranslationUnits(menu, dailyDishes, formulas);

    // Ne garder que missing + stale (jamais fresh) → maîtrise du quota.
    const toTranslate = units.filter((unit) => {
      const existing = rowByKey.get(`${unit.entityType}:${unit.entityId}:${unit.field}`);
      const status = computeFieldStatus({
        value: existing?.value,
        sourceTextHash: existing?.sourceTextHash,
        sourceText: unit.sourceText,
      });
      return status !== "fresh";
    });

    if (toTranslate.length === 0) {
      return { translatedCount: 0, skippedCount: units.length };
    }

    const requestChars = TranslationBudgetPolicy.charsOf(toTranslate.map((u) => u.sourceText));
    const day = appCalendarDayISO(new Date(this.clock.nowISO()));
    const monthStart = `${day.slice(0, 7)}-01`;

    const usage = await this.usageRepo.getUsage({
      restaurantId: input.restaurantId,
      day,
      monthStart,
    });
    const violation = TranslationBudgetPolicy.check({
      usage,
      requestChars,
      monthlyCharBudget: this.monthlyCharBudget,
    });
    if (violation) throw new DomainError(violation.code, violation.metadata);

    await this.usageRepo.recordUsage({
      restaurantId: input.restaurantId,
      day,
      calls: 1,
      chars: requestChars,
    });

    const translated = await this.translationService.translateBatch({
      sourceLocale: menu.sourceLocale,
      targetLocale,
      texts: toTranslate.map((u) => u.sourceText),
    });

    const newRows: TranslationRow[] = toTranslate.map((unit, i) => {
      const maxLength = maxTranslationValueLength(unit.entityType, unit.field);
      return {
        entityType: unit.entityType,
        entityId: unit.entityId,
        field: unit.field,
        locale: targetLocale,
        value: (translated[i] ?? "").trim().slice(0, maxLength),
        sourceTextHash: hashSourceText(unit.sourceText),
      };
    });

    await this.translationRepo.upsertMany({ restaurantId: input.restaurantId, rows: newRows });

    // Des traductions cibles sont embarquées dans le snapshot à la publication → repasse en
    // DRAFT jusqu'à republication. Uniquement quand des lignes ont été écrites : si tout était
    // déjà à jour (`toTranslate.length === 0`, retour anticipé), rien n'a changé.
    await this.menuRepo.markMenuAsDraft(input.restaurantId);

    return {
      translatedCount: newRows.length,
      skippedCount: units.length - newRows.length,
    };
  }
}

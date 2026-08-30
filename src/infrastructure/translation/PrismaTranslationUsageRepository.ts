import type { TranslationUsageRepository } from "@/application/ports/TranslationUsageRepository";
import type { TranslationUsageWindow } from "@/domain/menu/TranslationBudgetPolicy";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Compteur de consommation DeepL sur la table `translation_usage` (une ligne par
 * (restaurant, jour Paris), colonnes `calls`/`chars` incrémentées atomiquement).
 *
 * Colonne `day` en `@db.Date` : Prisma sérialise depuis les composantes UTC de la
 * `Date` JS, d'où le minuit UTC forcé — même convention que les stats quotidiennes
 * (cf. `appCalendarDateUTC`).
 */
export class PrismaTranslationUsageRepository implements TranslationUsageRepository {
  constructor(private readonly db: PrismaClient) {}

  private static dayToDate(day: string): Date {
    return new Date(`${day}T00:00:00.000Z`);
  }

  async getUsage(params: {
    restaurantId: string;
    day: string;
    monthStart: string;
  }): Promise<TranslationUsageWindow> {
    const day = PrismaTranslationUsageRepository.dayToDate(params.day);
    const monthStart = PrismaTranslationUsageRepository.dayToDate(params.monthStart);

    const [dayRow, monthAgg] = await Promise.all([
      this.db.translationUsage.findUnique({
        where: { restaurantId_day: { restaurantId: params.restaurantId, day } },
        select: { calls: true, chars: true },
      }),
      // Somme GLOBALE (tous restaurants) : protège le quota DeepL partagé, pas un tenant.
      this.db.translationUsage.aggregate({
        _sum: { chars: true },
        where: { day: { gte: monthStart } },
      }),
    ]);

    return {
      dayCalls: dayRow?.calls ?? 0,
      dayChars: dayRow?.chars ?? 0,
      monthCharsGlobal: monthAgg._sum.chars ?? 0,
    };
  }

  async recordUsage(params: {
    restaurantId: string;
    day: string;
    calls: number;
    chars: number;
  }): Promise<void> {
    const day = PrismaTranslationUsageRepository.dayToDate(params.day);
    await this.db.translationUsage.upsert({
      where: { restaurantId_day: { restaurantId: params.restaurantId, day } },
      create: { restaurantId: params.restaurantId, day, calls: params.calls, chars: params.chars },
      update: { calls: { increment: params.calls }, chars: { increment: params.chars } },
    });
  }
}

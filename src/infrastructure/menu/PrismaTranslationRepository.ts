import type {
  TranslationEntityType,
  TranslationField,
  TranslationRepository,
  TranslationRow,
} from "@/application/ports/TranslationRepository";
import {
  TRANSLATION_ENTITY_TYPES,
  TRANSLATION_FIELDS,
} from "@/application/ports/TranslationRepository";
import { isMenuLocale } from "@/domain/menu/MenuLocale";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaTranslationRepository implements TranslationRepository {
  constructor(private readonly db: PrismaClient) {}

  async listForRestaurant(restaurantId: string): Promise<TranslationRow[]> {
    const rows = await this.db.translation.findMany({
      where: { restaurantId },
      select: {
        entityType: true,
        entityId: true,
        field: true,
        locale: true,
        value: true,
        sourceTextHash: true,
      },
    });

    const out: TranslationRow[] = [];
    for (const row of rows) {
      // Normalisation minuscules (lignes legacy 'FR'/'EN' de la fenêtre 076 → 077)
      // + filtrage défensif des valeurs hors contrat (CHECK SQL côté DB).
      const locale = row.locale.toLowerCase();
      if (!isMenuLocale(locale)) continue;
      if (!(TRANSLATION_ENTITY_TYPES as readonly string[]).includes(row.entityType)) continue;
      if (!(TRANSLATION_FIELDS as readonly string[]).includes(row.field)) continue;
      out.push({
        entityType: row.entityType as TranslationEntityType,
        entityId: row.entityId,
        field: row.field as TranslationField,
        locale,
        value: row.value,
        sourceTextHash: row.sourceTextHash,
      });
    }
    return out;
  }

  async upsertMany(params: { restaurantId: string; rows: TranslationRow[] }): Promise<void> {
    const { restaurantId, rows } = params;
    await this.db.$transaction(async (tx) => {
      for (const row of rows) {
        const key = {
          entityType: row.entityType,
          entityId: row.entityId,
          field: row.field,
          locale: row.locale,
        };

        if (row.value.trim() === "") {
          await tx.translation.deleteMany({ where: { ...key, restaurantId } });
          continue;
        }

        // updateMany scoped par restaurantId (et non upsert sur la clé unique seule) :
        // une ligne appartenant à un autre restaurant ne peut pas être réécrite — le
        // create lèverait alors une violation d'unicité au lieu d'écraser silencieusement.
        const updated = await tx.translation.updateMany({
          where: { ...key, restaurantId },
          data: { value: row.value, sourceTextHash: row.sourceTextHash },
        });
        if (updated.count === 0) {
          await tx.translation.create({
            data: { ...key, value: row.value, sourceTextHash: row.sourceTextHash, restaurantId },
          });
        }
      }
    });
  }
}

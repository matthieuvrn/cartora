/**
 * One-shot post-076 : pose `source_text_hash` sur les lignes de traduction CIBLES
 * migrées (hash absent), en les considérant synchronisées avec le texte source
 * actuel (baseline « fresh »). Sans ce backfill, toutes les traductions migrées
 * s'affichent « stale » — simplement conservateur, pas faux.
 *
 * Le texte source d'une ligne cible = la ligne de MÊME (entity_type, entity_id,
 * field) dont la locale est la `source_locale` du restaurant. Rejouable : ne touche
 * que les lignes avec hash NULL.
 *
 * Usage : pnpm db:backfill-translation-hashes
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSourceText } from "../src/domain/menu/textHash";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, sourceLocale: true },
    });
    const sourceLocaleByRestaurant = new Map(restaurants.map((r) => [r.id, r.sourceLocale]));

    const rows = await prisma.translation.findMany({
      select: {
        id: true,
        entityType: true,
        entityId: true,
        field: true,
        locale: true,
        restaurantId: true,
        sourceTextHash: true,
      },
    });

    // Index des textes sources : entityType:entityId:field → value (locale source du resto)
    const values = await prisma.translation.findMany({
      select: { entityType: true, entityId: true, field: true, locale: true, value: true },
    });
    const sourceTextByKey = new Map<string, string>();
    for (const v of values) {
      sourceTextByKey.set(`${v.entityType}:${v.entityId}:${v.field}:${v.locale}`, v.value);
    }

    let updated = 0;
    let skippedNoSource = 0;

    for (const row of rows) {
      const sourceLocale = sourceLocaleByRestaurant.get(row.restaurantId) ?? "fr";
      const isTarget = row.locale.toLowerCase() !== sourceLocale;
      if (!isTarget || row.sourceTextHash !== null) continue;

      const sourceText = sourceTextByKey.get(
        `${row.entityType}:${row.entityId}:${row.field}:${sourceLocale}`,
      );
      if (sourceText === undefined || sourceText.trim() === "") {
        // Pas de texte source (ex. altText cible orphelin) — laisser NULL ⇒ stale.
        skippedNoSource++;
        continue;
      }

      await prisma.translation.update({
        where: { id: row.id },
        data: { sourceTextHash: hashSourceText(sourceText) },
      });
      updated++;
    }

    console.log(`Backfill done: ${updated} hash(es) set, ${skippedNoSource} skipped (no source).`);
  } catch (error) {
    console.error("Backfill FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

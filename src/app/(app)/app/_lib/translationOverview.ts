import { cache } from "react";
import { GetTranslationOverview } from "@/application/use-cases/GetTranslationOverview";
import type { LocaleCoverage } from "@/domain/menu/translationStatus";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PrismaTranslationRepository } from "@/infrastructure/menu/PrismaTranslationRepository";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * Chargement de l'aperçu des traductions, mémoïsé par requête (`cache()` React) :
 * le layout (compteur de la sidebar) et la page `/app/traductions` (tableau de
 * revue + résumé de couverture) le consomment dans la même requête sans
 * refetcher — la déduplication ne vaut que pour un même `restaurantId`.
 */
export const loadTranslationOverview = cache((restaurantId: string) =>
  new GetTranslationOverview(
    new PrismaMenuRepository(prisma),
    new PrismaTranslationRepository(prisma),
  ).execute({ restaurantId }),
);

/** Nombre total de champs « à relire » (obsolètes + manquants), toutes langues activées confondues. */
export function translationTodoCount(coverage: readonly LocaleCoverage[]): number {
  return coverage.reduce((acc, c) => acc + c.stale + c.missing, 0);
}

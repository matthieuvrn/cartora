import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { prisma } from "@/infrastructure/db/prisma";
import type { PendingTranslation } from "@/interface/ui/components/PublishButton";
import { loadTranslationOverview, translationTodoCount } from "./translationOverview";

/** État alimentant la barre de publication globale (PublishBar) montée dans le shell. */
export type PublishBarState = {
  status: "DRAFT" | "PUBLISHED";
  /** Dernière publication (ISO) — null si le menu n'a jamais été publié. */
  publishedAt: string | null;
  slug: string;
  planTier: PlanTier;
  /** Nudge PRO : champs restant à traduire au moment de publier (absent si aucun). */
  pendingTranslation?: PendingTranslation;
};

/**
 * Résout l'état de la barre de publication globale depuis le layout `(app)` (composition
 * root). Réutilise `getMenuPublishState` (statut + dernière publication) et
 * `loadTranslationOverview` — ce dernier est `cache()`-mémoïsé par requête, donc partagé
 * sans coût avec le compteur de la sidebar. Renvoie `null` avant le provisioning du premier
 * login (restaurant sans menu) → le shell n'affiche alors pas de barre.
 */
export async function loadPublishBarState(restaurant: {
  id: string;
  slug: string;
  planTier: PlanTier;
  menuLocales: string[];
}): Promise<PublishBarState | null> {
  const publishState = await new PrismaMenuRepository(prisma).getMenuPublishState(restaurant.id);
  if (!publishState) return null;

  let pendingTranslation: PendingTranslation | undefined;
  if (PlanPolicy.canUseAutoTranslation(restaurant.planTier) && restaurant.menuLocales.length > 0) {
    const overview = await loadTranslationOverview(restaurant.id);
    pendingTranslation = {
      todoCount: translationTodoCount(overview.coverage),
      targetLocales: overview.coverage.filter((c) => c.stale + c.missing > 0).map((c) => c.locale),
    };
  }

  return {
    status: publishState.status,
    publishedAt: publishState.publishedAt,
    slug: restaurant.slug,
    planTier: restaurant.planTier,
    pendingTranslation,
  };
}

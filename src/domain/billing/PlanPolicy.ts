import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";

export type PlanTier = "FREE" | "STARTER" | "PRO";

export type PublishGateResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_free" | "billing_issue" | "no_items" };

/**
 * Centralise tout le gating produit par tier (FREE / STARTER / PRO) et l'état de
 * facturation (PlanStatus). `PlanStatus` reste le miroir de Stripe (ACTIVE / PAST_DUE
 * / CANCELED / FREE) ; `PlanTier` reflète le forfait acheté.
 *
 * Règles :
 * - FREE  : pas de publication, watermark on, quotas serrés.
 * - STARTER (9,90 €) : publication possible, sans watermark, quotas intermédiaires.
 * - PRO (29,90 €) : publication possible, sans watermark, quotas illimités.
 *
 * Le check de publication exige tier >= STARTER ET status === ACTIVE — un Pro en
 * PAST_DUE ne peut pas publier tant que le paiement n'est pas régularisé.
 */
export class PlanPolicy {
  /** Publication autorisée si tier payant + facturation OK + au moins un item disponible. */
  static canPublish(tier: PlanTier, status: PlanStatus, itemCount: number): PublishGateResult {
    if (itemCount <= 0) return { allowed: false, reason: "no_items" };
    if (tier === "FREE") return { allowed: false, reason: "plan_free" };
    if (status !== "ACTIVE") return { allowed: false, reason: "billing_issue" };
    return { allowed: true };
  }

  /** Watermark uniquement en FREE. STARTER + PRO sont sans watermark. */
  static shouldShowWatermark(tier: PlanTier): boolean {
    return tier === "FREE";
  }

  /** Quota max de catégories par tier. Infinity = illimité (PRO). */
  static maxCategoriesFor(tier: PlanTier): number {
    if (tier === "FREE") return 6;
    if (tier === "STARTER") return 10;
    return Infinity;
  }

  /** Quota max de photos par tier. Infinity = illimité (PRO). */
  static maxPhotosFor(tier: PlanTier): number {
    if (tier === "FREE") return 5;
    if (tier === "STARTER") return 20;
    return Infinity;
  }

  /**
   * Templates de rendu autorisés par tier. CLASSIC est libre pour tous,
   * ELEGANT et MODERN sont réservés au tier PRO. Centralisé ici plutôt qu'un
   * fichier séparé pour rester aligné avec la doctrine "PlanPolicy = source unique
   * du gating tier" (cf. CLAUDE.md).
   */
  static canUseTemplate(tier: PlanTier, template: MenuTemplate): boolean {
    if (template === "CLASSIC") return true;
    return tier === "PRO";
  }

  /**
   * Personnalisation des couleurs du menu (S2.4) — réservée au tier PRO.
   * Distinct du logo (S2.3) qui reste accessible à tous les tiers : le logo
   * est l'identité de base (équivalent favicon), les couleurs sont du branding
   * avancé qui justifie l'upgrade PRO.
   */
  static canUseBranding(tier: PlanTier): boolean {
    return tier === "PRO";
  }

  /**
   * Mappe un Stripe price.id vers le PlanTier correspondant en lisant les variables
   * d'environnement. Retourne null si le price n'est associé à aucun tier connu —
   * indique typiquement une configuration Stripe désynchronisée du code.
   *
   * Note : la fonction lit `process.env` à chaque appel pour rester pur côté tests
   * (les tests injectent les valeurs via `vi.stubEnv`).
   */
  static resolveTierFromPriceId(priceId: string): PlanTier | null {
    if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return "STARTER";
    if (priceId === process.env.STRIPE_PRICE_ID) return "PRO";
    return null;
  }
}

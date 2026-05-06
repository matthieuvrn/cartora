import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";

export type PlanStatus = "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export type PublishResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_inactive" | "no_items" };

/**
 * Wrapper rétro-compatible autour de PlanPolicy. Conserve l'API historique (un seul
 * `planStatus` paramétré) pour ne pas casser tous les callers, mais délègue à
 * PlanPolicy qui distingue désormais tier et status.
 *
 * Note pour S2.1+ : préférer appeler `PlanPolicy` directement quand on dispose du
 * tier — typiquement dans `PublishMenu` (tier dispo via le Restaurant) et dans la
 * page publique `/m/[slug]` (tier inclus dans le snapshot output).
 */
export class PublicationPolicy {
  /**
   * Variante historique : ne peut publier QUE si planStatus === "ACTIVE" et items > 0.
   * Reste utilisée par les callers qui n'ont pas encore le tier sous la main.
   * Équivalent à : PlanPolicy.canPublish(tier === "FREE" ? "FREE" : "PRO", status, items).
   */
  static canPublish(planStatus: PlanStatus, itemCount: number): PublishResult {
    if (planStatus !== "ACTIVE") {
      return { allowed: false, reason: "plan_inactive" };
    }
    if (itemCount <= 0) {
      return { allowed: false, reason: "no_items" };
    }
    return { allowed: true };
  }

  /**
   * Watermark : signature historique acceptant `planStatus`. ACTIVE = pas de watermark
   * (couvre Starter ACTIVE et Pro ACTIVE) ; FREE / PAST_DUE / CANCELED = watermark.
   * Garder PAST_DUE avec watermark crée une pression utile sur l'utilisateur à
   * régulariser son paiement.
   *
   * Préférer `shouldShowWatermarkForTier(tier)` quand le tier est directement
   * disponible (page publique alimentée par snapshot, dashboard).
   */
  static shouldShowWatermark(planStatus: PlanStatus): boolean {
    return planStatus !== "ACTIVE";
  }

  /** Variante explicite par tier — à préférer dès que le tier est disponible. */
  static shouldShowWatermarkForTier(tier: PlanTier): boolean {
    return PlanPolicy.shouldShowWatermark(tier);
  }
}

import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import { TEMPLATE_META } from "@/domain/menu/MenuTemplateMeta";

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
   * Templates de rendu autorisés par tier. La règle vit dans `TEMPLATE_META`
   * (domaine) : `requiredTier === "FREE"` ⇒ sélectionnable par tous (set 2026 : la
   * **Base** CLASSIC + CARTORA), sinon réservé au tier PRO (les 5 templates premium).
   * Le « payant pour publier » est porté par `canPublish`, pas par ce gate — un FREE
   * peut sélectionner/prévisualiser une Base, mais ne peut pas publier. Lecture du meta
   * domaine plutôt que du registry interface (React) pour ne pas violer `domain → interface`.
   */
  static canUseTemplate(tier: PlanTier, template: MenuTemplate): boolean {
    return TEMPLATE_META[template].requiredTier === "FREE" || tier === "PRO";
  }

  /**
   * Menu du jour (S3.1) — accessible à partir de STARTER. Le plat du jour est
   * culturellement standard en restauration FR ; le bloquer derrière PRO crée
   * une friction injustifiée pour un STARTER qui peut déjà publier. FREE seul
   * est exclu (de toute façon, FREE ne peut pas publier — `canPublish` filtre déjà).
   */
  static canUseDailyDishes(tier: PlanTier): boolean {
    return tier === "STARTER" || tier === "PRO";
  }

  /**
   * Formules de menu (S3.2) — accessible à partir de STARTER, même justification
   * que `canUseDailyDishes` : feature culturellement standard en restauration FR
   * (menu du midi, brunch, menu enfant). Bloquer derrière PRO créerait une friction
   * injustifiée pour un STARTER qui peut déjà publier sa carte.
   */
  static canUseFormulas(tier: PlanTier): boolean {
    return tier === "STARTER" || tier === "PRO";
  }

  /**
   * Langues cibles supplémentaires (en plus de la langue source) par tier (S4).
   * FREE = 0 (langue source seule), STARTER = 1 (typiquement l'anglais),
   * PRO = illimité. Le multilingue est un levier d'upgrade explicite.
   */
  static maxExtraMenuLocalesFor(tier: PlanTier): number {
    if (tier === "FREE") return 0;
    if (tier === "STARTER") return 1;
    return Infinity;
  }

  /**
   * Traduction automatique (S4) — réservée PRO. La saisie manuelle des traductions
   * reste possible sur toute langue activée quel que soit le tier ; seul le bouton
   * « Traduire automatiquement » (DeepL) est gated, car il consomme un quota
   * externe partagé.
   */
  static canUseAutoTranslation(tier: PlanTier): boolean {
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

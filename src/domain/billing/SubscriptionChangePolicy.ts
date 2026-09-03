import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

/** Formules payantes — seules cibles possibles d'un changement de formule. */
export type PaidTier = Extract<PlanTier, "STARTER" | "PRO">;

const TIER_RANK: Record<PlanTier, number> = { FREE: 0, STARTER: 1, PRO: 2 };

export type PlanChangeContext = {
  /** Formule courante (source de vérité : la DB, miroir des webhooks Stripe). */
  currentTier: PlanTier;
  planStatus: PlanStatus;
  targetTier: PaidTier;
  /** Résiliation programmée à la fin de la période (lu en direct chez Stripe). */
  cancelAtPeriodEnd: boolean;
  /** Formule programmée par une rétrogradation en attente (fin de période), sinon `null`. */
  scheduledTier: PlanTier | null;
};

export type PlanChangeDecision =
  /** Formule supérieure : effet immédiat, différence facturée au prorata (CGU). */
  | { allowed: true; kind: "upgrade" }
  /** Formule inférieure : effet à la fin de la période en cours, sans remboursement (CGU). */
  | { allowed: true; kind: "downgrade" }
  /** Cible = formule courante alors qu'une rétrogradation est programmée : on l'annule. */
  | { allowed: true; kind: "revert_downgrade" }
  | { allowed: false; reason: "subscription_not_active" | "cancellation_pending" | "same_plan" };

export type CancellationRequest = "cancel" | "resume";

export type CancellationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "subscription_not_active" | "cancellation_pending" | "no_pending_cancellation";
    };

/**
 * Règles de la page Abonnement : changement de formule et résiliation, décidés côté
 * Cartora (le portail Stripe n'est plus la surface de décision — il ne garde que le
 * moyen de paiement et les coordonnées de facturation).
 *
 * Contrat avec les CGU (« Tarifs et paiement ») :
 * - upgrade  ⇒ immédiat, prorata facturé sur-le-champ ;
 * - downgrade ⇒ fin de période, l'accès à la formule payée est conservé jusque-là ;
 * - résiliation ⇒ fin de période, sans remboursement ; réversible tant que la période court.
 *
 * Un seul changement en attente à la fois : une résiliation programmée bloque le changement
 * de formule (il faut d'abord reprendre l'abonnement), et une rétrogradation programmée se
 * lève en re-choisissant la formule courante (`revert_downgrade`).
 */
export class SubscriptionChangePolicy {
  static isPaidTier(tier: PlanTier): tier is PaidTier {
    return tier === "STARTER" || tier === "PRO";
  }

  /** Ordre des formules : FREE < STARTER < PRO. Négatif si `a` est inférieure à `b`. */
  static compareTiers(a: PlanTier, b: PlanTier): number {
    return TIER_RANK[a] - TIER_RANK[b];
  }

  static decidePlanChange(ctx: PlanChangeContext): PlanChangeDecision {
    // Seul un abonnement ACTIVE se modifie : FREE/CANCELED passent par le Checkout,
    // PAST_DUE doit d'abord régulariser son paiement (un prorata sur une carte en échec
    // ne ferait qu'empiler les impayés).
    if (ctx.planStatus !== "ACTIVE") {
      return { allowed: false, reason: "subscription_not_active" };
    }
    if (ctx.cancelAtPeriodEnd) {
      return { allowed: false, reason: "cancellation_pending" };
    }
    if (ctx.targetTier === ctx.currentTier) {
      if (ctx.scheduledTier !== null && ctx.scheduledTier !== ctx.currentTier) {
        return { allowed: true, kind: "revert_downgrade" };
      }
      return { allowed: false, reason: "same_plan" };
    }
    if (ctx.scheduledTier === ctx.targetTier) {
      return { allowed: false, reason: "same_plan" };
    }
    return SubscriptionChangePolicy.compareTiers(ctx.targetTier, ctx.currentTier) > 0
      ? { allowed: true, kind: "upgrade" }
      : { allowed: true, kind: "downgrade" };
  }

  static decideCancellation(ctx: {
    planStatus: PlanStatus;
    cancelAtPeriodEnd: boolean;
    request: CancellationRequest;
  }): CancellationDecision {
    // Un PAST_DUE peut résilier (« résiliable à tout moment ») : il n'est pas prisonnier
    // d'un paiement en échec. FREE/CANCELED n'ont rien à résilier ni à reprendre.
    if (ctx.planStatus !== "ACTIVE" && ctx.planStatus !== "PAST_DUE") {
      return { allowed: false, reason: "subscription_not_active" };
    }
    if (ctx.request === "cancel" && ctx.cancelAtPeriodEnd) {
      return { allowed: false, reason: "cancellation_pending" };
    }
    if (ctx.request === "resume" && !ctx.cancelAtPeriodEnd) {
      return { allowed: false, reason: "no_pending_cancellation" };
    }
    return { allowed: true };
  }
}

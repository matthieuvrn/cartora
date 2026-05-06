import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

export type ResolveResult = { status: PlanStatus } | { status: null; reason: "unhandled_event" };

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; reason: "no_change" }
  | { allowed: false; reason: "invalid_transition" };

const EVENT_TO_STATUS: Record<string, PlanStatus> = {
  "checkout.session.completed": "ACTIVE",
  "invoice.paid": "ACTIVE",
  "invoice.payment_failed": "PAST_DUE",
  "customer.subscription.created": "ACTIVE",
  // .updated couvre tier change (Starter↔Pro), reactivation post-PAST_DUE,
  // changement de PM, etc. Le status reste ACTIVE — un éventuel cancel_at_period_end
  // ne déclenche PAS .updated → CANCELED ; le passage en CANCELED arrive uniquement
  // via .deleted (à la fin de la période payée).
  "customer.subscription.updated": "ACTIVE",
  "customer.subscription.deleted": "CANCELED",
};

const VALID_TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  FREE: ["ACTIVE"],
  // ACTIVE → ACTIVE est désormais autorisé : permet de capter un tier change
  // (Starter → Pro) émis via customer.subscription.updated alors que le status
  // ne bouge pas. Le repo gère l'idempotence (no-op si rien ne change).
  ACTIVE: ["ACTIVE", "PAST_DUE", "CANCELED"],
  PAST_DUE: ["ACTIVE", "CANCELED"],
  CANCELED: ["ACTIVE"],
};

export class BillingPolicy {
  static resolveNewPlanStatus(eventType: string): ResolveResult {
    const status = EVENT_TO_STATUS[eventType];
    if (!status) {
      return { status: null, reason: "unhandled_event" };
    }
    return { status };
  }

  static checkTransition(current: PlanStatus, next: PlanStatus): TransitionResult {
    // Cas spécial : ACTIVE → ACTIVE est autorisé pour les tier changes.
    if (current === next && current !== "ACTIVE") {
      return { allowed: false, reason: "no_change" };
    }
    if (VALID_TRANSITIONS[current].includes(next)) {
      return { allowed: true };
    }
    return { allowed: false, reason: "invalid_transition" };
  }
}

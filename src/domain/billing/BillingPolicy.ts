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
  "customer.subscription.deleted": "CANCELED",
};

const VALID_TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  FREE: ["ACTIVE"],
  ACTIVE: ["PAST_DUE", "CANCELED"],
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
    if (current === next) {
      return { allowed: false, reason: "no_change" };
    }
    if (VALID_TRANSITIONS[current].includes(next)) {
      return { allowed: true };
    }
    return { allowed: false, reason: "invalid_transition" };
  }
}

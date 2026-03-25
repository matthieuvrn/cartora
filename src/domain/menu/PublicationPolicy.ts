export type PlanStatus = "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export type PublishResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_inactive" | "no_items" };

export class PublicationPolicy {
  static canPublish(planStatus: PlanStatus, itemCount: number): PublishResult {
    if (planStatus !== "ACTIVE") {
      return { allowed: false, reason: "plan_inactive" };
    }
    if (itemCount <= 0) {
      return { allowed: false, reason: "no_items" };
    }
    return { allowed: true };
  }

  static shouldShowWatermark(planStatus: PlanStatus): boolean {
    return planStatus !== "ACTIVE";
  }
}

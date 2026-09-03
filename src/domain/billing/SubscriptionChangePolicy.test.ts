import { describe, it, expect } from "vitest";
import { SubscriptionChangePolicy, type PlanChangeContext } from "./SubscriptionChangePolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const activeStarter = (overrides: Partial<PlanChangeContext> = {}): PlanChangeContext => ({
  currentTier: "STARTER",
  planStatus: "ACTIVE",
  targetTier: "PRO",
  cancelAtPeriodEnd: false,
  scheduledTier: null,
  ...overrides,
});

describe("SubscriptionChangePolicy", () => {
  describe("isPaidTier / compareTiers", () => {
    it("recognises STARTER and PRO as paid tiers, not FREE", () => {
      expect(SubscriptionChangePolicy.isPaidTier("FREE")).toBe(false);
      expect(SubscriptionChangePolicy.isPaidTier("STARTER")).toBe(true);
      expect(SubscriptionChangePolicy.isPaidTier("PRO")).toBe(true);
    });

    it("orders FREE < STARTER < PRO", () => {
      expect(SubscriptionChangePolicy.compareTiers("FREE", "STARTER")).toBeLessThan(0);
      expect(SubscriptionChangePolicy.compareTiers("STARTER", "PRO")).toBeLessThan(0);
      expect(SubscriptionChangePolicy.compareTiers("PRO", "STARTER")).toBeGreaterThan(0);
      expect(SubscriptionChangePolicy.compareTiers("PRO", "PRO")).toBe(0);
    });
  });

  describe("decidePlanChange", () => {
    it("upgrades STARTER → PRO on an active subscription", () => {
      expect(SubscriptionChangePolicy.decidePlanChange(activeStarter())).toEqual({
        allowed: true,
        kind: "upgrade",
      });
    });

    it("downgrades PRO → STARTER on an active subscription", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(
          activeStarter({ currentTier: "PRO", targetTier: "STARTER" }),
        ),
      ).toEqual({ allowed: true, kind: "downgrade" });
    });

    it("reverts a scheduled downgrade when the current tier is chosen again", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(
          activeStarter({ currentTier: "PRO", targetTier: "PRO", scheduledTier: "STARTER" }),
        ),
      ).toEqual({ allowed: true, kind: "revert_downgrade" });
    });

    it("rejects same_plan when the current tier is chosen with nothing scheduled", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(
          activeStarter({ currentTier: "PRO", targetTier: "PRO" }),
        ),
      ).toEqual({ allowed: false, reason: "same_plan" });
    });

    it("rejects same_plan when the target is already scheduled", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(
          activeStarter({ currentTier: "PRO", targetTier: "STARTER", scheduledTier: "STARTER" }),
        ),
      ).toEqual({ allowed: false, reason: "same_plan" });
    });

    it.each(["FREE", "PAST_DUE", "CANCELED"] as PlanStatus[])(
      "rejects subscription_not_active when planStatus is %s",
      (planStatus) => {
        expect(SubscriptionChangePolicy.decidePlanChange(activeStarter({ planStatus }))).toEqual({
          allowed: false,
          reason: "subscription_not_active",
        });
      },
    );

    it("rejects cancellation_pending while a cancellation is scheduled", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(activeStarter({ cancelAtPeriodEnd: true })),
      ).toEqual({ allowed: false, reason: "cancellation_pending" });
    });

    it("checks the status before the same-plan shortcut", () => {
      expect(
        SubscriptionChangePolicy.decidePlanChange(
          activeStarter({ currentTier: "PRO", targetTier: "PRO", planStatus: "PAST_DUE" }),
        ),
      ).toEqual({ allowed: false, reason: "subscription_not_active" });
    });
  });

  describe("decideCancellation", () => {
    it("allows cancelling an ACTIVE subscription without pending cancellation", () => {
      expect(
        SubscriptionChangePolicy.decideCancellation({
          planStatus: "ACTIVE",
          cancelAtPeriodEnd: false,
          request: "cancel",
        }),
      ).toEqual({ allowed: true });
    });

    it("allows cancelling a PAST_DUE subscription (no lock-in on a failed payment)", () => {
      expect(
        SubscriptionChangePolicy.decideCancellation({
          planStatus: "PAST_DUE",
          cancelAtPeriodEnd: false,
          request: "cancel",
        }),
      ).toEqual({ allowed: true });
    });

    it("rejects a second cancellation while one is pending", () => {
      expect(
        SubscriptionChangePolicy.decideCancellation({
          planStatus: "ACTIVE",
          cancelAtPeriodEnd: true,
          request: "cancel",
        }),
      ).toEqual({ allowed: false, reason: "cancellation_pending" });
    });

    it("allows resuming only when a cancellation is pending", () => {
      expect(
        SubscriptionChangePolicy.decideCancellation({
          planStatus: "ACTIVE",
          cancelAtPeriodEnd: true,
          request: "resume",
        }),
      ).toEqual({ allowed: true });
      expect(
        SubscriptionChangePolicy.decideCancellation({
          planStatus: "ACTIVE",
          cancelAtPeriodEnd: false,
          request: "resume",
        }),
      ).toEqual({ allowed: false, reason: "no_pending_cancellation" });
    });

    it.each(["FREE", "CANCELED"] as PlanStatus[])(
      "rejects cancel and resume when planStatus is %s",
      (planStatus) => {
        expect(
          SubscriptionChangePolicy.decideCancellation({
            planStatus,
            cancelAtPeriodEnd: false,
            request: "cancel",
          }),
        ).toEqual({ allowed: false, reason: "subscription_not_active" });
        expect(
          SubscriptionChangePolicy.decideCancellation({
            planStatus,
            cancelAtPeriodEnd: true,
            request: "resume",
          }),
        ).toEqual({ allowed: false, reason: "subscription_not_active" });
      },
    );
  });
});

import { describe, it, expect } from "vitest";
import { BillingPolicy } from "./BillingPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

describe("BillingPolicy", () => {
  describe("resolveNewPlanStatus", () => {
    it("maps checkout.session.completed to ACTIVE", () => {
      expect(BillingPolicy.resolveNewPlanStatus("checkout.session.completed")).toEqual({
        status: "ACTIVE",
      });
    });

    it("maps invoice.paid to ACTIVE", () => {
      expect(BillingPolicy.resolveNewPlanStatus("invoice.paid")).toEqual({ status: "ACTIVE" });
    });

    it("maps invoice.payment_failed to PAST_DUE", () => {
      expect(BillingPolicy.resolveNewPlanStatus("invoice.payment_failed")).toEqual({
        status: "PAST_DUE",
      });
    });

    it("maps customer.subscription.deleted to CANCELED", () => {
      expect(BillingPolicy.resolveNewPlanStatus("customer.subscription.deleted")).toEqual({
        status: "CANCELED",
      });
    });

    it("returns unhandled_event for unknown event types", () => {
      expect(BillingPolicy.resolveNewPlanStatus("customer.updated")).toEqual({
        status: null,
        reason: "unhandled_event",
      });
    });
  });

  describe("checkTransition", () => {
    const validTransitions: [PlanStatus, PlanStatus][] = [
      ["FREE", "ACTIVE"],
      ["ACTIVE", "PAST_DUE"],
      ["ACTIVE", "CANCELED"],
      ["PAST_DUE", "ACTIVE"],
      ["PAST_DUE", "CANCELED"],
      ["CANCELED", "ACTIVE"],
    ];

    it.each(validTransitions)("allows %s → %s", (current, next) => {
      expect(BillingPolicy.checkTransition(current, next)).toEqual({ allowed: true });
    });

    const sameStatusCases: PlanStatus[] = ["FREE", "ACTIVE", "PAST_DUE", "CANCELED"];

    it.each(sameStatusCases)("returns no_change for %s → %s", (status) => {
      expect(BillingPolicy.checkTransition(status, status)).toEqual({
        allowed: false,
        reason: "no_change",
      });
    });

    const invalidTransitions: [PlanStatus, PlanStatus][] = [
      ["FREE", "PAST_DUE"],
      ["FREE", "CANCELED"],
      ["CANCELED", "PAST_DUE"],
    ];

    it.each(invalidTransitions)("rejects %s → %s as invalid_transition", (current, next) => {
      expect(BillingPolicy.checkTransition(current, next)).toEqual({
        allowed: false,
        reason: "invalid_transition",
      });
    });
  });
});

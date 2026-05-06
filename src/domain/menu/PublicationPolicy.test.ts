import { describe, it, expect } from "vitest";
import { PublicationPolicy } from "./PublicationPolicy";
import type { PlanStatus } from "./PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

describe("PublicationPolicy", () => {
  describe("canPublish", () => {
    it("allows ACTIVE plan with items", () => {
      const result = PublicationPolicy.canPublish("ACTIVE", 3);
      expect(result).toEqual({ allowed: true });
    });

    it("rejects FREE plan", () => {
      const result = PublicationPolicy.canPublish("FREE", 3);
      expect(result).toEqual({ allowed: false, reason: "plan_inactive" });
    });

    it("rejects PAST_DUE plan", () => {
      const result = PublicationPolicy.canPublish("PAST_DUE", 3);
      expect(result).toEqual({ allowed: false, reason: "plan_inactive" });
    });

    it("rejects CANCELED plan", () => {
      const result = PublicationPolicy.canPublish("CANCELED", 3);
      expect(result).toEqual({ allowed: false, reason: "plan_inactive" });
    });

    it("rejects ACTIVE plan with zero items", () => {
      const result = PublicationPolicy.canPublish("ACTIVE", 0);
      expect(result).toEqual({ allowed: false, reason: "no_items" });
    });

    it("prioritizes plan_inactive over no_items", () => {
      const result = PublicationPolicy.canPublish("FREE", 0);
      expect(result).toEqual({ allowed: false, reason: "plan_inactive" });
    });

    it("allows ACTIVE plan with exactly 1 item", () => {
      const result = PublicationPolicy.canPublish("ACTIVE", 1);
      expect(result).toEqual({ allowed: true });
    });
  });

  describe("shouldShowWatermark", () => {
    it("shows watermark for FREE plan", () => {
      expect(PublicationPolicy.shouldShowWatermark("FREE")).toBe(true);
    });

    it("shows watermark for PAST_DUE plan", () => {
      expect(PublicationPolicy.shouldShowWatermark("PAST_DUE")).toBe(true);
    });

    it("shows watermark for CANCELED plan", () => {
      expect(PublicationPolicy.shouldShowWatermark("CANCELED")).toBe(true);
    });

    it("does not show watermark for ACTIVE plan", () => {
      expect(PublicationPolicy.shouldShowWatermark("ACTIVE")).toBe(false);
    });

    it.each(["FREE", "PAST_DUE", "CANCELED"] satisfies PlanStatus[])(
      "returns true for %s",
      (status) => {
        expect(PublicationPolicy.shouldShowWatermark(status)).toBe(true);
      },
    );
  });

  describe("shouldShowWatermarkForTier", () => {
    it("shows watermark for FREE tier", () => {
      expect(PublicationPolicy.shouldShowWatermarkForTier("FREE")).toBe(true);
    });

    it.each(["STARTER", "PRO"] satisfies PlanTier[])("hides watermark for %s tier", (tier) => {
      expect(PublicationPolicy.shouldShowWatermarkForTier(tier)).toBe(false);
    });
  });
});

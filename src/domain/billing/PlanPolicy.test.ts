import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PlanPolicy, type PlanTier } from "./PlanPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

describe("PlanPolicy", () => {
  describe("canPublish", () => {
    it("rejects when no items, regardless of tier/status", () => {
      expect(PlanPolicy.canPublish("PRO", "ACTIVE", 0)).toEqual({
        allowed: false,
        reason: "no_items",
      });
      expect(PlanPolicy.canPublish("FREE", "FREE", 0)).toEqual({
        allowed: false,
        reason: "no_items",
      });
    });

    it("rejects FREE tier even with items + ACTIVE status", () => {
      // ACTIVE + FREE est une combinaison "impossible" en pratique (jamais émise par
      // le webhook), mais la policy doit rester defensive et refuser.
      expect(PlanPolicy.canPublish("FREE", "ACTIVE", 3)).toEqual({
        allowed: false,
        reason: "plan_free",
      });
    });

    it("rejects STARTER tier with non-ACTIVE status", () => {
      expect(PlanPolicy.canPublish("STARTER", "PAST_DUE", 3)).toEqual({
        allowed: false,
        reason: "billing_issue",
      });
      expect(PlanPolicy.canPublish("STARTER", "CANCELED", 3)).toEqual({
        allowed: false,
        reason: "billing_issue",
      });
    });

    it("rejects PRO tier with non-ACTIVE status", () => {
      expect(PlanPolicy.canPublish("PRO", "PAST_DUE", 3)).toEqual({
        allowed: false,
        reason: "billing_issue",
      });
    });

    it("allows STARTER tier with ACTIVE status and items", () => {
      expect(PlanPolicy.canPublish("STARTER", "ACTIVE", 1)).toEqual({ allowed: true });
    });

    it("allows PRO tier with ACTIVE status and items", () => {
      expect(PlanPolicy.canPublish("PRO", "ACTIVE", 10)).toEqual({ allowed: true });
    });

    it("prioritizes no_items over plan_free over billing_issue", () => {
      // no_items doit être le premier check (le plus contextuel UX-wise).
      expect(PlanPolicy.canPublish("FREE", "FREE", 0)).toEqual({
        allowed: false,
        reason: "no_items",
      });
    });
  });

  describe("shouldShowWatermark", () => {
    it("shows watermark for FREE tier", () => {
      expect(PlanPolicy.shouldShowWatermark("FREE")).toBe(true);
    });

    it("hides watermark for STARTER tier", () => {
      expect(PlanPolicy.shouldShowWatermark("STARTER")).toBe(false);
    });

    it("hides watermark for PRO tier", () => {
      expect(PlanPolicy.shouldShowWatermark("PRO")).toBe(false);
    });
  });

  describe("maxCategoriesFor", () => {
    it("FREE = 6", () => {
      expect(PlanPolicy.maxCategoriesFor("FREE")).toBe(6);
    });

    it("STARTER = 10", () => {
      expect(PlanPolicy.maxCategoriesFor("STARTER")).toBe(10);
    });

    it("PRO = Infinity", () => {
      expect(PlanPolicy.maxCategoriesFor("PRO")).toBe(Infinity);
    });
  });

  describe("maxPhotosFor", () => {
    it("FREE = 5", () => {
      expect(PlanPolicy.maxPhotosFor("FREE")).toBe(5);
    });

    it("STARTER = 20", () => {
      expect(PlanPolicy.maxPhotosFor("STARTER")).toBe(20);
    });

    it("PRO = Infinity", () => {
      expect(PlanPolicy.maxPhotosFor("PRO")).toBe(Infinity);
    });
  });

  describe("resolveTierFromPriceId", () => {
    beforeEach(() => {
      vi.stubEnv("STRIPE_PRICE_ID", "price_pro_id_123");
      vi.stubEnv("STRIPE_PRICE_ID_STARTER", "price_starter_id_456");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns STARTER for the starter price id", () => {
      expect(PlanPolicy.resolveTierFromPriceId("price_starter_id_456")).toBe("STARTER");
    });

    it("returns PRO for the pro price id", () => {
      expect(PlanPolicy.resolveTierFromPriceId("price_pro_id_123")).toBe("PRO");
    });

    it("returns null for an unknown price id", () => {
      expect(PlanPolicy.resolveTierFromPriceId("price_unknown_xxx")).toBe(null);
    });
  });

  describe("type contracts", () => {
    it("covers all tiers in canPublish", () => {
      const tiers: PlanTier[] = ["FREE", "STARTER", "PRO"];
      const statuses: PlanStatus[] = ["FREE", "ACTIVE", "PAST_DUE", "CANCELED"];
      for (const tier of tiers) {
        for (const status of statuses) {
          // Smoke : vérifie que la fonction ne throw jamais sur les combinaisons valides
          expect(() => PlanPolicy.canPublish(tier, status, 1)).not.toThrow();
        }
      }
    });
  });
});

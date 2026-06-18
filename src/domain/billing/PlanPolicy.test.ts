import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PlanPolicy, type PlanTier } from "./PlanPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import { MENU_TEMPLATE_VALUES } from "@/domain/menu/MenuTypes";
import { TEMPLATE_META } from "@/domain/menu/MenuTemplateMeta";

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

  describe("canUseTemplate", () => {
    // Set 2026 : la Base (CLASSIC + CARTORA, `requiredTier: "FREE"`) est sélectionnable
    // par tous les tiers ; les premium sont réservés PRO. Le gating lit `TEMPLATE_META`.
    it("allows CLASSIC for every tier", () => {
      expect(PlanPolicy.canUseTemplate("FREE", "CLASSIC")).toBe(true);
      expect(PlanPolicy.canUseTemplate("STARTER", "CLASSIC")).toBe(true);
      expect(PlanPolicy.canUseTemplate("PRO", "CLASSIC")).toBe(true);
    });

    it("allows CARTORA for every tier (Base, requiredTier FREE)", () => {
      expect(PlanPolicy.canUseTemplate("FREE", "CARTORA")).toBe(true);
      expect(PlanPolicy.canUseTemplate("STARTER", "CARTORA")).toBe(true);
      expect(PlanPolicy.canUseTemplate("PRO", "CARTORA")).toBe(true);
    });

    it("locks every premium (requiredTier PRO) template for FREE and STARTER tiers", () => {
      // Dérivé de TEMPLATE_META → couvre automatiquement tout futur template premium
      // (BISTRO/NOIR/SOLAR/ZEN/NEON/RIVAGE/VELOURS, …) sans liste en dur à maintenir.
      const premium = MENU_TEMPLATE_VALUES.filter((t) => TEMPLATE_META[t].requiredTier === "PRO");
      expect(premium.length).toBeGreaterThan(0);
      for (const template of premium) {
        expect(PlanPolicy.canUseTemplate("FREE", template)).toBe(false);
        expect(PlanPolicy.canUseTemplate("STARTER", template)).toBe(false);
      }
    });

    it("allows every template for PRO tier", () => {
      for (const template of MENU_TEMPLATE_VALUES) {
        expect(PlanPolicy.canUseTemplate("PRO", template)).toBe(true);
      }
    });
  });

  describe("canUseDailyDishes (S3.1)", () => {
    it("forbids FREE", () => {
      expect(PlanPolicy.canUseDailyDishes("FREE")).toBe(false);
    });
    it("allows STARTER", () => {
      expect(PlanPolicy.canUseDailyDishes("STARTER")).toBe(true);
    });
    it("allows PRO", () => {
      expect(PlanPolicy.canUseDailyDishes("PRO")).toBe(true);
    });
  });

  describe("canUseFormulas (S3.2)", () => {
    it("forbids FREE", () => {
      expect(PlanPolicy.canUseFormulas("FREE")).toBe(false);
    });
    it("allows STARTER", () => {
      expect(PlanPolicy.canUseFormulas("STARTER")).toBe(true);
    });
    it("allows PRO", () => {
      expect(PlanPolicy.canUseFormulas("PRO")).toBe(true);
    });
  });

  describe("maxExtraMenuLocalesFor (S4)", () => {
    it("FREE = 0 (langue source seule)", () => {
      expect(PlanPolicy.maxExtraMenuLocalesFor("FREE")).toBe(0);
    });
    it("STARTER = 1", () => {
      expect(PlanPolicy.maxExtraMenuLocalesFor("STARTER")).toBe(1);
    });
    it("PRO = Infinity", () => {
      expect(PlanPolicy.maxExtraMenuLocalesFor("PRO")).toBe(Infinity);
    });
  });

  describe("canUseAutoTranslation (S4)", () => {
    it("forbids FREE and STARTER", () => {
      expect(PlanPolicy.canUseAutoTranslation("FREE")).toBe(false);
      expect(PlanPolicy.canUseAutoTranslation("STARTER")).toBe(false);
    });
    it("allows PRO", () => {
      expect(PlanPolicy.canUseAutoTranslation("PRO")).toBe(true);
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

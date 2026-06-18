import { describe, it, expect } from "vitest";
import { GetPublicMenu } from "./GetPublicMenu";
import { createMockSnapshotRepo } from "./__fixtures__/snapshotRepoMock";
import type { Clock } from "@/application/ports/Clock";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";

const FIXED_NOW = "2026-03-25T12:00:00.000Z";
const clock: Clock = { nowISO: () => FIXED_NOW };

// Snapshots reçus par GetPublicMenu = déjà normalisés (v2) par PrismaSnapshotRepository.
const EMPTY_TEXTS = { name: {}, description: {}, altText: {} };

const SNAPSHOT_FIXTURE: PublicMenuSnapshot = {
  snapshotVersion: 2,
  sourceLocale: "fr",
  availableLocales: ["fr", "en"],
  restaurantName: "Mon Restaurant",
  categories: [
    {
      name: "Entrées",
      texts: { name: { fr: "Entrées" } },
      items: [
        {
          nameFr: "Soupe",
          nameEn: "Soup",
          descriptionFr: "Soupe du jour",
          descriptionEn: "Soup of the day",
          texts: {
            name: { fr: "Soupe", en: "Soup" },
            description: { fr: "Soupe du jour", en: "Soup of the day" },
            altText: {},
          },
          priceCents: 850,
          badge: "NONE",
          allergens: [],
          imagePath: null,
          altTextFr: "",
          altTextEn: "",
        },
      ],
    },
  ],
  publishedAt: "2026-03-25T12:00:00.000Z",
};

/** Snapshot par défaut pour les tests GetPublicMenu : PRO ACTIVE avec snapshot trivial. */
const defaultSnapshotRepo = () =>
  createMockSnapshotRepo({
    getSnapshotBySlug: async () => ({
      restaurantId: "resto-1",
      snapshotData: SNAPSHOT_FIXTURE,
      publishedAt: "2026-03-25T12:00:00.000Z",
      planStatus: "ACTIVE" as const,
      planTier: "PRO" as const,
    }),
  });

describe("GetPublicMenu", () => {
  it("returns snapshot, planStatus and planTier for existing slug", async () => {
    const uc = new GetPublicMenu(defaultSnapshotRepo(), clock);

    const result = await uc.execute({ slug: "resto-abcd1234" });

    expect(result).toEqual({
      snapshot: SNAPSHOT_FIXTURE,
      planStatus: "ACTIVE",
      planTier: "PRO",
    });
  });

  it("returns null for unknown slug", async () => {
    const uc = new GetPublicMenu(createMockSnapshotRepo(), clock);

    const result = await uc.execute({ slug: "unknown" });

    expect(result).toBeNull();
  });

  describe("daily menu filtering (S3.1)", () => {
    it("strips dailyItems whose validUntilISO is in the past", async () => {
      const snapshotWithDaily: PublicMenuSnapshot = {
        ...SNAPSHOT_FIXTURE,
        dailyItems: [
          {
            id: "active",
            nameFr: "Plat du jour actif",
            nameEn: "Today's special active",
            descriptionFr: "",
            descriptionEn: "",
            priceCents: 1500,
            badge: "NONE",
            allergens: [],
            imagePath: null,
            altTextFr: "",
            altTextEn: "",
            texts: EMPTY_TEXTS,
            validUntilISO: "2026-03-25T23:59:59.000Z", // > FIXED_NOW
          },
          {
            id: "expired",
            nameFr: "Plat expiré",
            nameEn: "Expired special",
            descriptionFr: "",
            descriptionEn: "",
            priceCents: 1200,
            badge: "NONE",
            allergens: [],
            imagePath: null,
            altTextFr: "",
            altTextEn: "",
            texts: EMPTY_TEXTS,
            validUntilISO: "2026-03-25T11:00:00.000Z", // < FIXED_NOW
          },
        ],
      };
      const uc = new GetPublicMenu(
        createMockSnapshotRepo({
          getSnapshotBySlug: async () => ({
            restaurantId: "resto-1",
            snapshotData: snapshotWithDaily,
            publishedAt: FIXED_NOW,
            planStatus: "ACTIVE" as const,
            planTier: "PRO" as const,
          }),
        }),
        clock,
      );

      const result = await uc.execute({ slug: "resto-abcd1234" });

      expect(result?.snapshot.dailyItems).toHaveLength(1);
      expect(result?.snapshot.dailyItems?.[0].id).toBe("active");
    });

    it("drops dailyItems key entirely when all are expired", async () => {
      const snapshotWithDaily: PublicMenuSnapshot = {
        ...SNAPSHOT_FIXTURE,
        dailyItems: [
          {
            id: "expired",
            nameFr: "Plat expiré",
            nameEn: "Expired",
            descriptionFr: "",
            descriptionEn: "",
            priceCents: 1200,
            badge: "NONE",
            allergens: [],
            imagePath: null,
            altTextFr: "",
            altTextEn: "",
            texts: EMPTY_TEXTS,
            validUntilISO: "2026-03-25T11:00:00.000Z",
          },
        ],
      };
      const uc = new GetPublicMenu(
        createMockSnapshotRepo({
          getSnapshotBySlug: async () => ({
            restaurantId: "resto-1",
            snapshotData: snapshotWithDaily,
            publishedAt: FIXED_NOW,
            planStatus: "ACTIVE" as const,
            planTier: "PRO" as const,
          }),
        }),
        clock,
      );

      const result = await uc.execute({ slug: "resto-abcd1234" });

      expect(result?.snapshot.dailyItems).toBeUndefined();
    });

    it("passes through snapshots without dailyItems (pre-S3.1 retro-compat)", async () => {
      const uc = new GetPublicMenu(defaultSnapshotRepo(), clock);
      const result = await uc.execute({ slug: "resto-abcd1234" });
      expect(result?.snapshot).toEqual(SNAPSHOT_FIXTURE);
      expect("dailyItems" in (result?.snapshot ?? {})).toBe(false);
    });
  });
});

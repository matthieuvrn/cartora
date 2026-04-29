import { describe, it, expect } from "vitest";
import { GetPublicMenu } from "./GetPublicMenu";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";

const SNAPSHOT_FIXTURE: PublicMenuSnapshot = {
  restaurantName: "Mon Restaurant",
  categories: [
    {
      name: "Entrées",
      items: [
        {
          nameFr: "Soupe",
          nameEn: "Soup",
          descriptionFr: "Soupe du jour",
          descriptionEn: "Soup of the day",
          priceCents: 850,
          badge: "NONE",
          allergens: [],
        },
      ],
    },
  ],
  publishedAt: "2026-03-25T12:00:00.000Z",
};

function createMockSnapshotRepo(overrides: Partial<SnapshotRepository> = {}): SnapshotRepository {
  return {
    upsertSnapshot: async () => {},
    getSnapshotBySlug: async () => ({
      restaurantId: "resto-1",
      snapshotData: SNAPSHOT_FIXTURE,
      publishedAt: "2026-03-25T12:00:00.000Z",
      planStatus: "ACTIVE" as const,
    }),
    listPublished: async () => [],
    ...overrides,
  };
}

describe("GetPublicMenu", () => {
  it("returns snapshot and planStatus for existing slug", async () => {
    const uc = new GetPublicMenu(createMockSnapshotRepo());

    const result = await uc.execute({ slug: "resto-abcd1234" });

    expect(result).toEqual({ snapshot: SNAPSHOT_FIXTURE, planStatus: "ACTIVE" });
  });

  it("returns null for unknown slug", async () => {
    const uc = new GetPublicMenu(createMockSnapshotRepo({ getSnapshotBySlug: async () => null }));

    const result = await uc.execute({ slug: "unknown" });

    expect(result).toBeNull();
  });
});

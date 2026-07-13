import { describe, it, expect, vi } from "vitest";
import { UpdateMenuLocales } from "./UpdateMenuLocales";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";

describe("UpdateMenuLocales", () => {
  it("persists normalized locales for PRO (unlimited quota)", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("PRO")),
    });
    const useCase = new UpdateMenuLocales(repo);

    const result = await useCase.execute({
      restaurantId: "resto-1",
      locales: ["en", "es", "de", "it"],
    });

    expect(repo.updateMenuLocales).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      menuLocales: ["en", "es", "de", "it"],
    });
    expect(result).toEqual({ menuLocales: ["en", "es", "de", "it"] });
  });

  it("normalizes input: trims, lowercases, dedupes, strips the source locale", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("PRO")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await useCase.execute({ restaurantId: "resto-1", locales: [" EN ", "fr", "en", "ES"] });

    expect(repo.updateMenuLocales).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      menuLocales: ["en", "es"],
    });
  });

  it("rejects STARTER with any extra locale (multilingue PRO-only, limit 0)", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("STARTER")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await expect(
      useCase.execute({ restaurantId: "resto-1", locales: ["en"] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "locale_quota_exceeded",
      metadata: { limit: 0, current: 1, tier: "STARTER" },
    });
    expect(repo.updateMenuLocales).not.toHaveBeenCalled();
  });

  it("allows clearing every extra locale regardless of tier", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("FREE")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await useCase.execute({ restaurantId: "resto-1", locales: [] });

    expect(repo.updateMenuLocales).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      menuLocales: [],
    });
  });

  it("rejects STARTER with 2 extra locales (locale_quota_exceeded + metadata)", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("STARTER")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await expect(
      useCase.execute({ restaurantId: "resto-1", locales: ["en", "es"] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "locale_quota_exceeded",
      metadata: { limit: 0, current: 2, tier: "STARTER" },
    });
    expect(repo.updateMenuLocales).not.toHaveBeenCalled();
  });

  it("rejects FREE with any extra locale (limit 0)", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("FREE")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await expect(
      useCase.execute({ restaurantId: "resto-1", locales: ["en"] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "locale_quota_exceeded",
      metadata: { limit: 0, current: 1, tier: "FREE" },
    });
    expect(repo.updateMenuLocales).not.toHaveBeenCalled();
  });

  it("rejects unknown locale codes with invalid_locale + the offending code", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => restaurantFixtureForTier("PRO")),
    });
    const useCase = new UpdateMenuLocales(repo);

    await expect(
      useCase.execute({ restaurantId: "resto-1", locales: ["en", "xx"] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_locale",
      metadata: { field: "locale", locale: "xx" },
    });
    expect(repo.updateMenuLocales).not.toHaveBeenCalled();
  });

  it("throws restaurant_not_found when the restaurant does not exist", async () => {
    const repo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => null),
    });
    const useCase = new UpdateMenuLocales(repo);

    await expect(useCase.execute({ restaurantId: "ghost", locales: ["en"] })).rejects.toMatchObject(
      {
        name: "DomainError",
        code: "restaurant_not_found",
        metadata: { entityId: "ghost" },
      },
    );
    expect(repo.updateMenuLocales).not.toHaveBeenCalled();
  });
});

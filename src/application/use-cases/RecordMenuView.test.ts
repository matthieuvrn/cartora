import { describe, it, expect } from "vitest";
import { RecordMenuView } from "./RecordMenuView";
import { createMockAnalyticsRepo } from "./__fixtures__/analyticsRepoMock";
import { createMockSnapshotRepo } from "./__fixtures__/snapshotRepoMock";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";

const SNAPSHOT_FIXTURE = {
  restaurantId: "resto-1",
  snapshotData: {
    sourceLocale: "fr",
    availableLocales: ["fr", "en"],
    restaurantName: "Test",
    categories: [],
    publishedAt: "2026-03-25T12:00:00.000Z",
  } as PublicMenuSnapshot,
  publishedAt: "2026-03-25T12:00:00.000Z",
  planStatus: "ACTIVE" as const,
  planTier: "PRO" as const,
};

const defaultSnapshotRepo = () =>
  createMockSnapshotRepo({ getSnapshotBySlug: async () => SNAPSHOT_FIXTURE });

describe("RecordMenuView", () => {
  it("records a view for an existing slug", async () => {
    const analyticsRepo = createMockAnalyticsRepo();
    const uc = new RecordMenuView(analyticsRepo, defaultSnapshotRepo());

    const result = await uc.execute({
      slug: "resto-abcd1234",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      locale: "fr",
      utmSource: "qr",
    });

    expect(result).toEqual({ recorded: true });
    expect(analyticsRepo.recordView).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      slug: "resto-abcd1234",
      locale: "fr",
      deviceType: "MOBILE",
      source: "QR",
    });
  });

  it("returns recorded: false for unknown slug", async () => {
    const analyticsRepo = createMockAnalyticsRepo();
    const uc = new RecordMenuView(analyticsRepo, createMockSnapshotRepo());

    const result = await uc.execute({
      slug: "unknown",
      userAgent: "Mozilla/5.0",
      locale: "fr",
    });

    expect(result).toEqual({ recorded: false });
    expect(analyticsRepo.recordView).not.toHaveBeenCalled();
  });

  it("parses desktop device and direct source", async () => {
    const analyticsRepo = createMockAnalyticsRepo();
    const uc = new RecordMenuView(analyticsRepo, defaultSnapshotRepo());

    await uc.execute({
      slug: "resto-abcd1234",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      locale: "en",
    });

    expect(analyticsRepo.recordView).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      slug: "resto-abcd1234",
      locale: "en",
      deviceType: "DESKTOP",
      source: "DIRECT",
    });
  });

  it("parses link source from referrer", async () => {
    const analyticsRepo = createMockAnalyticsRepo();
    const uc = new RecordMenuView(analyticsRepo, defaultSnapshotRepo());

    await uc.execute({
      slug: "resto-abcd1234",
      userAgent: "Mozilla/5.0",
      locale: "fr",
      referrer: "https://google.com",
    });

    expect(analyticsRepo.recordView).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      slug: "resto-abcd1234",
      locale: "fr",
      deviceType: "DESKTOP",
      source: "LINK",
    });
  });
});

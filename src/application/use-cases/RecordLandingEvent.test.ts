import { describe, it, expect, vi } from "vitest";
import { RecordLandingEvent } from "./RecordLandingEvent";
import { createMockLandingEventRepo } from "./__fixtures__/landingEventRepoMock";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

describe("RecordLandingEvent", () => {
  it("enregistre un event mobile avec source direct par défaut (UA non persisté)", async () => {
    const repo = createMockLandingEventRepo();
    const uc = new RecordLandingEvent(repo);

    const result = await uc.execute({
      eventName: "cta_hero_signup",
      locale: "fr",
      userAgent: IPHONE_UA,
    });

    expect(result).toEqual({ recorded: true });
    expect(repo.record).toHaveBeenCalledWith({
      eventName: "cta_hero_signup",
      locale: "fr",
      deviceType: "MOBILE",
      source: "direct",
      metadata: null,
      userAgent: null,
      referer: null,
    });
  });

  it("enregistre source=qr quand utmSource=qr est fourni", async () => {
    const repo = createMockLandingEventRepo();
    const uc = new RecordLandingEvent(repo);

    await uc.execute({
      eventName: "cta_hero_demo",
      locale: "en",
      userAgent: DESKTOP_UA,
      utmSource: "qr",
    });

    expect(repo.record).toHaveBeenCalledWith({
      eventName: "cta_hero_demo",
      locale: "en",
      deviceType: "DESKTOP",
      source: "qr",
      metadata: null,
      userAgent: null,
      referer: null,
    });
  });

  it("enregistre source=link quand un referrer est présent et n'en garde que le host", async () => {
    const repo = createMockLandingEventRepo();
    const uc = new RecordLandingEvent(repo);

    await uc.execute({
      eventName: "faq_opened",
      locale: "fr",
      userAgent: DESKTOP_UA,
      referer: "https://www.google.com/search?q=carte+restaurant+qr&pii=abc",
      metadata: { questionId: "q3" },
    });

    expect(repo.record).toHaveBeenCalledWith({
      eventName: "faq_opened",
      locale: "fr",
      deviceType: "DESKTOP",
      source: "link",
      metadata: { questionId: "q3" },
      userAgent: null,
      referer: "www.google.com",
    });
  });

  it("locale défaut 'fr' quand non fourni et drop un referer non parseable", async () => {
    const repo = createMockLandingEventRepo();
    const uc = new RecordLandingEvent(repo);

    await uc.execute({
      eventName: "scroll_depth_75",
      userAgent: "a".repeat(800),
      referer: "not-a-url",
    });

    const call = vi.mocked(repo.record).mock.calls[0][0];
    expect(call.locale).toBe("fr");
    expect(call.userAgent).toBeNull();
    expect(call.referer).toBeNull();
  });
});

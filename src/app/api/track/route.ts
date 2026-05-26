import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { PrismaLandingEventRepository } from "@/infrastructure/db/PrismaLandingEventRepository";
import { RecordMenuView } from "@/application/use-cases/RecordMenuView";
import { RecordLandingEvent } from "@/application/use-cases/RecordLandingEvent";
import { createRateLimiter } from "@/infrastructure/rate-limit/createRateLimiter";
import { LANDING_EVENT_NAMES } from "@/domain/analytics/LandingEventNames";
import type { RateLimiter } from "@/application/ports/RateLimiter";

const analyticsRepo = new PrismaAnalyticsRepository(prisma);
const snapshotRepo = new PrismaSnapshotRepository(prisma);
const recordMenuView = new RecordMenuView(analyticsRepo, snapshotRepo);

const landingEventRepo = new PrismaLandingEventRepository(prisma);
const recordLandingEvent = new RecordLandingEvent(landingEventRepo);

const menuRateLimiter = createRateLimiter({
  limit: 15,
  windowSeconds: 60,
  prefix: "track",
});
const landingRateLimiter = createRateLimiter({
  limit: 50,
  windowSeconds: 60,
  prefix: "track-landing",
});

const MenuTrackBodySchema = z.object({
  slug: z.string().min(1).max(255),
  locale: z.enum(["fr", "en", "FR", "EN"]).optional(),
  source: z.enum(["qr"]).optional(),
});

const LandingTrackBodySchema = z.object({
  type: z.literal("landing"),
  event: z.enum(LANDING_EVENT_NAMES),
  locale: z.enum(["fr", "en"]).optional(),
  source: z.string().max(32).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function applyRateLimit(limiter: RateLimiter, ip: string) {
  const limit = await limiter.check(ip);
  if (limit.success) return null;
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": String(limit.remaining),
        "X-RateLimit-Reset": String(limit.resetAt),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? undefined;

  const body = await request.json().catch(() => null);

  if (body?.type === "landing") {
    const rateLimited = await applyRateLimit(landingRateLimiter, ip);
    if (rateLimited) return rateLimited;

    const parsed = LandingTrackBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    try {
      await recordLandingEvent.execute({
        eventName: parsed.data.event,
        locale: parsed.data.locale,
        userAgent,
        referer,
        utmSource: parsed.data.source,
        metadata: parsed.data.metadata,
      });
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      Sentry.captureException(error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const rateLimited = await applyRateLimit(menuRateLimiter, ip);
  if (rateLimited) return rateLimited;

  const parsed = MenuTrackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await recordMenuView.execute({
      slug: parsed.data.slug,
      userAgent,
      locale: parsed.data.locale?.toLowerCase() ?? "fr",
      utmSource: parsed.data.source,
      referrer: referer,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
import { isMenuLocale } from "@/domain/menu/MenuLocale";
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

// Tolérant par principe : un label inattendu (utm posé par un tiers, locale
// legacy en majuscules, referrer hors borne) est neutralisé à l'exécution via
// `.catch(undefined)`, jamais sanctionné d'un 400 qui coûterait une vue légitime
// — seul un slug invalide rejette. `referrer` = document.referrer transmis par le
// client — le header Referer du POST est l'URL de la page émettrice (same-origin),
// inutilisable pour classer la source de la visite.
const MenuTrackBodySchema = z.object({
  slug: z.string().min(1).max(255),
  locale: z.string().max(8).optional().catch(undefined),
  source: z.string().max(64).optional().catch(undefined),
  referrer: z.string().max(2048).optional().catch(undefined),
});

const LandingTrackBodySchema = z.object({
  type: z.literal("landing"),
  event: z.enum(LANDING_EVENT_NAMES),
  locale: z.enum(["fr", "en"]).optional().catch(undefined),
  source: z.string().max(32).optional().catch(undefined),
  referrer: z.string().max(2048).optional().catch(undefined),
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
        referer: parsed.data.referrer,
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

  // Langue de LECTURE du menu (MenuLocale) ; valeur inconnue ⇒ repli "fr".
  const rawLocale = parsed.data.locale?.toLowerCase();

  try {
    await recordMenuView.execute({
      slug: parsed.data.slug,
      userAgent,
      locale: rawLocale && isMenuLocale(rawLocale) ? rawLocale : "fr",
      utmSource: parsed.data.source,
      referrer: parsed.data.referrer,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

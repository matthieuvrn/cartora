import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { RecordMenuView } from "@/application/use-cases/RecordMenuView";
import { createRateLimiter } from "@/infrastructure/rate-limit/createRateLimiter";

const analyticsRepo = new PrismaAnalyticsRepository(prisma);
const snapshotRepo = new PrismaSnapshotRepository(prisma);
const recordMenuView = new RecordMenuView(analyticsRepo, snapshotRepo);

const rateLimiter = createRateLimiter({
  limit: 15,
  windowSeconds: 60,
  prefix: "track",
});

const TrackBodySchema = z.object({
  slug: z.string().min(1).max(255),
  locale: z.enum(["fr", "en", "FR", "EN"]).optional(),
  source: z.enum(["qr"]).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limit = await rateLimiter.check(ip);
  if (!limit.success) {
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

  const parsed = TrackBodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { slug, locale, source } = parsed.data;
  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? undefined;

  try {
    await recordMenuView.execute({
      slug,
      userAgent,
      locale: locale?.toLowerCase() ?? "fr",
      utmSource: source,
      referrer,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

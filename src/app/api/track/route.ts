import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { RecordMenuView } from "@/application/use-cases/RecordMenuView";

const analyticsRepo = new PrismaAnalyticsRepository(prisma);
const snapshotRepo = new PrismaSnapshotRepository(prisma);
const recordMenuView = new RecordMenuView(analyticsRepo, snapshotRepo);

// --- Rate limiter in-memory (sliding window par IP) ---
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100; // max per IP per window

const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS;
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip);
  }
}, WINDOW_MS);

const TrackBodySchema = z.object({
  slug: z.string().min(1).max(255),
  locale: z.enum(["fr", "en", "FR", "EN"]).optional(),
  source: z.enum(["qr"]).optional(),
  screenWidth: z.number().int().min(0).max(16384).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

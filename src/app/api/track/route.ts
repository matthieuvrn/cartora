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

const TrackBodySchema = z.object({
  slug: z.string(),
  locale: z.string().optional(),
  source: z.string().optional(),
  screenWidth: z.number().optional(),
});

export async function POST(request: NextRequest) {
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
      locale: locale ?? "fr",
      utmSource: source,
      referrer,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error);
    console.error("Track error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

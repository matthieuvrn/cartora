import type { PrismaClient } from "@/generated/prisma/client";
import {
  Locale,
  DeviceType as PrismaDeviceType,
  ViewSource as PrismaViewSource,
} from "@/generated/prisma/client";
import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { DailyStatRow, DeviceType, ViewSource } from "@/domain/analytics/AnalyticsTypes";
import { appCalendarDateUTC } from "@/domain/time/appTimeZone";

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async recordView(event: {
    restaurantId: string;
    slug: string;
    locale: string;
    deviceType: DeviceType;
    source: ViewSource;
  }): Promise<void> {
    const locale = event.locale.toUpperCase() as Locale;
    const deviceType = event.deviceType as PrismaDeviceType;
    const source = event.source as PrismaViewSource;

    // Jour calendaire en fuseau applicatif (Europe/Paris), pas en UTC :
    // une vue après minuit Paris doit être rattachée au bon jour local.
    const today = appCalendarDateUTC(new Date());

    await this.prisma.$transaction([
      this.prisma.menuViewEvent.create({
        data: {
          restaurantId: event.restaurantId,
          slug: event.slug,
          locale,
          deviceType,
          source,
        },
      }),
      this.prisma.menuViewDailyStat.upsert({
        where: {
          restaurantId_date_locale_deviceType_source: {
            restaurantId: event.restaurantId,
            date: today,
            locale,
            deviceType,
            source,
          },
        },
        update: {
          viewCount: { increment: 1 },
        },
        create: {
          restaurantId: event.restaurantId,
          date: today,
          locale,
          deviceType,
          source,
          viewCount: 1,
        },
      }),
    ]);
  }

  async getEventTimestamps(restaurantId: string, since: Date): Promise<{ createdAt: Date }[]> {
    return this.prisma.menuViewEvent.findMany({
      where: { restaurantId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async getDailyStats(restaurantId: string, from: string, to: string): Promise<DailyStatRow[]> {
    const rows = await this.prisma.menuViewDailyStat.findMany({
      where: {
        restaurantId,
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: "asc" },
    });

    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      locale: row.locale,
      deviceType: row.deviceType as DeviceType,
      source: row.source as ViewSource,
      viewCount: row.viewCount,
    }));
  }
}

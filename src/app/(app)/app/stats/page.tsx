import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { GetDashboardStats } from "@/application/use-cases/GetDashboardStats";
import { GetRealtimeStats } from "@/application/use-cases/GetRealtimeStats";
import { PageHeader } from "@/interface/ui/components/app/PageHeader";
import { StatsCard } from "@/interface/ui/components/StatsCard";

export default async function StatsPage() {
  const { restaurantId } = await requireRestaurant();

  const analyticsRepo = new PrismaAnalyticsRepository(prisma);
  const clock = new SystemClock();
  const [stats, realtimeStats] = await Promise.all([
    new GetDashboardStats(analyticsRepo, clock).execute({ restaurantId }),
    new GetRealtimeStats(analyticsRepo, clock).execute({ restaurantId }),
  ]);

  const t = await getTranslations("Stats");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <StatsCard stats={stats} realtimeStats={realtimeStats} />
    </div>
  );
}

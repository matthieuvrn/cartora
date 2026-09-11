import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAnalyticsRepository } from "@/infrastructure/analytics/PrismaAnalyticsRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { GetDashboardStats } from "@/application/use-cases/GetDashboardStats";
import { GetRealtimeStats } from "@/application/use-cases/GetRealtimeStats";
import { AnalyticsPolicy } from "@/domain/analytics/AnalyticsPolicy";
import { PageHeader } from "@/interface/ui/components/app/PageHeader";
import { StatsPeriodSwitch } from "@/interface/ui/components/stats/StatsPeriodSwitch";
import { StatsCard } from "@/interface/ui/components/StatsCard";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { restaurantId } = await requireRestaurant();

  // La fenêtre d'analyse vient de l'URL (partageable, rejouable), mais elle est validée par le
  // domaine AVANT tout appel : le use case ne reçoit jamais une chaîne brute. Le proxy protège
  // déjà `/app/:path*`, query comprise.
  const { period: rawPeriod } = await searchParams;
  const period = AnalyticsPolicy.parseStatsPeriod(rawPeriod);

  const analyticsRepo = new PrismaAnalyticsRepository(prisma);
  const clock = new SystemClock();
  const [stats, realtimeStats] = await Promise.all([
    new GetDashboardStats(analyticsRepo, clock).execute({ restaurantId, period }),
    new GetRealtimeStats(analyticsRepo, clock).execute({ restaurantId }),
  ]);

  const t = await getTranslations("Stats");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<StatsPeriodSwitch period={period} />}
      />
      <StatsCard stats={stats} realtimeStats={realtimeStats} />
    </div>
  );
}

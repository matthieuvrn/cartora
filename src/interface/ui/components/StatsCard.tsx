"use client";

import { useTranslations } from "next-intl";
import { Eye, Monitor, QrCode, Smartphone, Tablet, Globe, Link2 } from "lucide-react";
import type { DashboardStats, DeviceType, ViewSource } from "@/domain/analytics/AnalyticsTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "./stats/KpiCard";
import { ViewsChart } from "./stats/ViewsChart";
import { BreakdownSection } from "./stats/BreakdownSection";

type Props = {
  stats?: DashboardStats;
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const DEVICE_ICONS = { MOBILE: Smartphone, DESKTOP: Monitor, TABLET: Tablet } as const;
const SOURCE_ICONS = { QR: QrCode, DIRECT: Globe, LINK: Link2 } as const;
const DEVICE_KEYS: DeviceType[] = ["MOBILE", "DESKTOP", "TABLET"];
const SOURCE_KEYS: ViewSource[] = ["QR", "DIRECT", "LINK"];

function topEntry<K extends string>(record: Record<K, number>): K | null {
  let best: K | null = null;
  let max = 0;
  for (const [key, count] of Object.entries(record) as [K, number][]) {
    if (count > max) {
      best = key;
      max = count;
    }
  }
  return best;
}

export function StatsCard({ stats }: Props) {
  const t = useTranslations("Stats");

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("last7Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const topDevice = topEntry(stats.byDevice);
  const topSource = topEntry(stats.bySource);

  const deviceEntries = DEVICE_KEYS.filter((key) => (stats.byDevice[key] ?? 0) > 0)
    .sort((a, b) => (stats.byDevice[b] ?? 0) - (stats.byDevice[a] ?? 0))
    .map((key, i) => ({
      label: t(`device.${key}`),
      count: stats.byDevice[key] ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const sourceEntries = SOURCE_KEYS.filter((key) => (stats.bySource[key] ?? 0) > 0)
    .sort((a, b) => (stats.bySource[b] ?? 0) - (stats.bySource[a] ?? 0))
    .map((key, i) => ({
      label: t(`source.${key}`),
      count: stats.bySource[key] ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const localeEntries = Object.entries(stats.byLocale)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, count], i) => ({
      label: t(`locale.${key}`),
      count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const hasBreakdowns =
    deviceEntries.length > 0 || sourceEntries.length > 0 || localeEntries.length > 0;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          title={t("totalViews")}
          value={stats.totalViews}
          icon={Eye}
          description={t("last7Days")}
        />
        <KpiCard
          title={t("topDevice")}
          value={topDevice ? t(`device.${topDevice}`) : "—"}
          icon={topDevice ? DEVICE_ICONS[topDevice] : Monitor}
        />
        <KpiCard
          title={t("topSource")}
          value={topSource ? t(`source.${topSource}`) : "—"}
          icon={topSource ? SOURCE_ICONS[topSource] : Globe}
        />
        <KpiCard
          title={t("chartTitle")}
          value={stats.viewsByDay.reduce((sum, d) => sum + d.count, 0)}
          icon={Eye}
          description={t("last7Days")}
        />
      </div>

      {/* Area chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
          <CardDescription>{t("last7Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsChart viewsByDay={stats.viewsByDay} />
        </CardContent>
      </Card>

      {/* Breakdowns — only when there's data */}
      {hasBreakdowns && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {deviceEntries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <BreakdownSection title={t("deviceBreakdown")} entries={deviceEntries} />
              </CardContent>
            </Card>
          )}
          {sourceEntries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <BreakdownSection title={t("sourceBreakdown")} entries={sourceEntries} />
              </CardContent>
            </Card>
          )}
          {localeEntries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <BreakdownSection title={t("localeBreakdown")} entries={localeEntries} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

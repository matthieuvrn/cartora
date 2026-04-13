"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Timer,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import type {
  DashboardStats,
  DeviceType,
  RealtimeStats,
  ViewSource,
} from "@/domain/analytics/AnalyticsTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "./stats/KpiCard";
import { ViewsChart } from "./stats/ViewsChart";
import { HourlyChart } from "./stats/HourlyChart";
import { BreakdownSection } from "./stats/BreakdownSection";

type Props = {
  stats?: DashboardStats;
  realtimeStats?: RealtimeStats;
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const DEVICE_ICONS = { MOBILE: Smartphone, DESKTOP: Monitor, TABLET: Tablet } as const;
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

function formatPeakHour(hour: number, locale: string): string {
  if (locale === "en") {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  }
  return `${hour}h`;
}

function findPeakDay(viewsByDay: { date: string; count: number }[], locale: string): string | null {
  let best: { date: string; count: number } | null = null;
  for (const day of viewsByDay) {
    if (!best || day.count > best.count) best = day;
  }
  if (!best || best.count === 0) return null;
  return new Date(best.date + "T00:00:00").toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function StatsCard({ stats, realtimeStats }: Props) {
  const t = useTranslations("Stats");
  const locale = useLocale();

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
  const peakDay = findPeakDay(stats.viewsByDay, locale);

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
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          title={t("totalViews")}
          value={stats.totalViews}
          icon={Eye}
          description={t("last7Days")}
        />
        <KpiCard title={t("last24h")} value={realtimeStats?.viewsLast24h ?? "—"} icon={Timer} />
        <KpiCard title={t("last60Min")} value={realtimeStats?.viewsLast60Min ?? "—"} icon={Clock} />
        <KpiCard
          title={t("peakHour")}
          value={
            realtimeStats?.peakHour != null ? formatPeakHour(realtimeStats.peakHour, locale) : "—"
          }
          icon={TrendingUp}
        />
        <KpiCard title={t("peakDay")} value={peakDay ?? "—"} icon={CalendarDays} />
        <KpiCard
          title={t("topDevice")}
          value={topDevice ? t(`device.${topDevice}`) : "—"}
          icon={topDevice ? DEVICE_ICONS[topDevice] : Monitor}
        />
      </div>

      {/* Area chart — daily views */}
      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
          <CardDescription>{t("last7Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsChart viewsByDay={stats.viewsByDay} />
        </CardContent>
      </Card>

      {/* Bar chart — hourly distribution */}
      {realtimeStats && (
        <Card>
          <CardHeader>
            <CardTitle>{t("hourlyTitle")}</CardTitle>
            <CardDescription>{t("hourlyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyChart
              hourlyDistribution={realtimeStats.hourlyDistribution}
              peakHour={realtimeStats.peakHour}
            />
          </CardContent>
        </Card>
      )}

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

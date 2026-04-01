"use client";

import { useLocale, useTranslations } from "next-intl";
import type { DashboardStats, DeviceType, ViewSource } from "@/domain/analytics/AnalyticsTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  stats?: DashboardStats;
};

export function StatsCard({ stats }: Props) {
  const t = useTranslations("Stats");
  const locale = useLocale();

  if (!stats || stats.totalViews === 0) {
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

  const maxCount = Math.max(...stats.viewsByDay.map((d) => d.count), 1);

  const deviceKeys: DeviceType[] = ["MOBILE", "DESKTOP", "TABLET"];
  const sourceKeys: ViewSource[] = ["QR", "DIRECT", "LINK"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("last7Days")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <span className="text-3xl font-bold">{stats.totalViews}</span>{" "}
          <span className="text-sm text-muted-foreground">{t("views")}</span>
        </div>

        <div className="flex items-end gap-2 h-24">
          {stats.viewsByDay.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-primary"
                style={{ height: `${Math.max((day.count / maxCount) * 100, 2)}%` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {new Date(day.date + "T00:00:00").toLocaleDateString(locale, {
                  weekday: "short",
                })}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <BreakdownRow
            entries={Object.entries(stats.byLocale)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([key, count]) => ({ label: t(`locale.${key}`), count }))}
          />
          <BreakdownRow
            entries={deviceKeys
              .filter((key) => (stats.byDevice[key] ?? 0) > 0)
              .sort((a, b) => (stats.byDevice[b] ?? 0) - (stats.byDevice[a] ?? 0))
              .map((key) => ({ label: t(`device.${key}`), count: stats.byDevice[key] ?? 0 }))}
          />
          <BreakdownRow
            entries={sourceKeys
              .filter((key) => (stats.bySource[key] ?? 0) > 0)
              .sort((a, b) => (stats.bySource[b] ?? 0) - (stats.bySource[a] ?? 0))
              .map((key) => ({ label: t(`source.${key}`), count: stats.bySource[key] ?? 0 }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ entries }: { entries: { label: string; count: number }[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map((entry) => (
        <span key={entry.label} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          {entry.label} · {entry.count}
        </span>
      ))}
    </div>
  );
}

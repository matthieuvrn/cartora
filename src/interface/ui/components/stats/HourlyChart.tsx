"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { HourlyCount } from "@/domain/analytics/AnalyticsTypes";

type Props = {
  hourlyDistribution: HourlyCount[];
  peakHour: number | null;
};

const chartConfig = {
  views: {
    label: "Vues",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatHour(hour: number, locale: string): string {
  if (locale === "en") {
    if (hour === 0) return "12AM";
    if (hour === 12) return "12PM";
    return hour < 12 ? `${hour}AM` : `${hour - 12}PM`;
  }
  return `${hour}h`;
}

export function HourlyChart({ hourlyDistribution, peakHour }: Props) {
  const locale = useLocale();
  const t = useTranslations("Stats");

  const data = hourlyDistribution.map(({ hour, count }) => ({
    hour,
    views: count,
    label: formatHour(hour, locale),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <BarChart data={data} accessibilityLayer margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          interval={2}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          fontSize={11}
          tickMargin={4}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => {
                const item = payload?.[0]?.payload;
                if (item == null) return _value;
                return `${formatHour(item.hour, locale)} — ${item.views} ${t("views")}`;
              }}
            />
          }
        />
        <Bar dataKey="views" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              fill={entry.hour === peakHour ? "var(--chart-2)" : "var(--color-views)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

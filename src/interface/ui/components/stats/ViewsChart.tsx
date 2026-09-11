"use client";

import { useLocale } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StatsPeriod } from "@/domain/analytics/AnalyticsTypes";

type Props = {
  viewsByDay: { date: string; count: number }[];
  /** Longueur de la fenêtre : au-delà de 7 points, l'axe X s'allège (ticks et libellés). */
  period: StatsPeriod;
};

const chartConfig = {
  views: {
    label: "Vues",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ViewsChart({ viewsByDay, period }: Props) {
  const locale = useLocale();

  // À 30 points dans ~200 px, le jour de semaine devient illisible : on garde « 12 mars » et on
  // laisse recharts espacer les ticks. Sur 7 jours, le rendu actuel est conservé à l'identique.
  const dense = period > 7;

  const data = viewsByDay.map((day) => ({
    date: day.date,
    views: day.count,
    label: new Date(day.date + "T00:00:00").toLocaleDateString(
      locale,
      dense ? { day: "numeric", month: "short" } : { weekday: "short", day: "numeric" },
    ),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <AreaChart data={data} accessibilityLayer margin={{ left: -20, right: 4, top: 4 }}>
        <defs>
          <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          interval={dense ? "preserveStartEnd" : undefined}
          minTickGap={dense ? 24 : undefined}
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
                if (!item?.date) return _value;
                return new Date(item.date + "T00:00:00").toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                });
              }}
            />
          }
        />
        <Area
          dataKey="views"
          type="monotone"
          fill="url(#fillViews)"
          stroke="var(--color-views)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

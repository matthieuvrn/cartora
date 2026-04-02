"use client";

import { useLocale } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Props = {
  viewsByDay: { date: string; count: number }[];
};

const chartConfig = {
  views: {
    label: "Vues",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ViewsChart({ viewsByDay }: Props) {
  const locale = useLocale();

  const data = viewsByDay.map((day) => ({
    date: day.date,
    views: day.count,
    label: new Date(day.date + "T00:00:00").toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
    }),
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
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
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

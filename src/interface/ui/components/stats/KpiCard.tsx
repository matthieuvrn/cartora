import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
};

export function KpiCard({ title, value, icon: Icon, description }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

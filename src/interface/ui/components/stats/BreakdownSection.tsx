type Entry = {
  label: string;
  count: number;
  color: string;
};

type Props = {
  title: string;
  entries: Entry[];
};

export function BreakdownSection({ title, entries }: Props) {
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <div className="space-y-2.5">
        {entries.map((entry) => {
          const pct = total > 0 ? (entry.count / total) * 100 : 0;
          return (
            <div key={entry.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {entry.count} <span className="text-xs">({Math.round(pct)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: entry.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette miroir de la page Statistiques : en-tête (kicker + titre + sélecteur de période +
 * sous-titre), 6 tuiles KPI dont la première porte une mini-courbe, 2 graphes.
 */
export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              {i === 0 && <Skeleton className="h-7 w-full" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

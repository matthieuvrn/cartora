import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Squelette miroir de la page Abonnement : en-tête, carte formule, deux cartes de gestion. */
export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="grid gap-2 border-t pt-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-48 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

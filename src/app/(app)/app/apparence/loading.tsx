import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette miroir de la page Apparence : en-tête, grille des 9 templates, bloc d'upsell PRO,
 * cartes logo + couleurs.
 */
export default function AppearanceLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Bloc d'upsell PRO : le squelette ignore le tier (la majorité des comptes est non-PRO). */}
        <Skeleton className="h-72 w-full rounded-xl lg:h-44" />
      </section>

      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

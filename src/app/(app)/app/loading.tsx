import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette miroir de l'éditeur « Ma carte » : toolbar sticky (desktop) /
 * recherche (mobile), en-tête d'identité compact, section Aujourd'hui, puis
 * catégories en rangées denses. Doit suivre le layout réel de MenuEditor.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="space-y-6">
        {/* Toolbar desktop : recherche + statut + Aperçu + Publier, chips en dessous. */}
        <div className="hidden space-y-2 rounded-xl border px-3 py-2.5 shadow-sm md:block">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
        {/* Recherche mobile */}
        <Skeleton className="h-9 w-full md:hidden" />

        <div className="space-y-8">
          {/* En-tête identité compact */}
          <div className="flex items-center gap-3 border-b pb-4">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-56" />
          </div>

          {/* Aujourd'hui */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Catégories en rangées denses */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

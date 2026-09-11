import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette miroir de « Ma carte » : en-tête d'identité (logo 40 px, nom, chips), puis la toolbar
 * sticky desktop (recherche + palette ⌘K + Aperçu) / la recherche mobile, la section Aujourd'hui
 * et les catégories en rangées denses. Doit suivre le layout réel de la page et de MenuEditor.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* En-tête d'identité : logo 40 px + nom, chips (template · lien) en dessous. */}
      <div className="mb-6 flex items-center gap-3 border-b pb-4">
        <Skeleton className="size-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            {/* Lien « version en ligne » : conditionnel (menu déjà publié, sous md). */}
            <Skeleton className="h-5 w-28 rounded-md md:hidden" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Toolbar desktop : recherche + palette ⌘K + Aperçu, chips en dessous. */}
        <div className="hidden space-y-2 rounded-xl border px-3 py-2.5 shadow-sm md:block">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <div className="ml-auto">
              <Skeleton className="h-8 w-24 rounded-full" />
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
                <Skeleton className="h-8 w-32 rounded-full" />
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

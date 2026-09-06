import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Squelette miroir de la page Traductions : en-tête + carte des langues (source + 4 cibles). */
export default function TranslationsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-[1.15rem] w-8 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

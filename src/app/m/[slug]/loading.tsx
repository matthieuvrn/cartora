import { Skeleton } from "@/components/ui/skeleton";

export default function PublicMenuLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      {/* Restaurant name */}
      <Skeleton className="mb-6 h-8 w-48" />

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i}>
            {/* Category heading */}
            <Skeleton className="mb-2 h-5 w-24" />
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

/**
 * Loading state for authenticated app routes.
 * Provides a skeleton UI while page content loads.
 */
export default function AppLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
      {/* Header skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-muted/60 animate-pulse rounded" />
      </div>
      
      {/* Content skeleton grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-6 space-y-4"
          >
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted/60 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-muted/60 animate-pulse rounded" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

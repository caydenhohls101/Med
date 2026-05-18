export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded-lg w-32" />
        <div className="h-9 bg-muted rounded-lg w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded-lg w-40" />
      <div className="rounded-xl border bg-card p-6 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
            <div className="h-4 bg-muted rounded w-16 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-muted rounded w-36" />
              <div className="h-3 bg-muted rounded w-48" />
            </div>
            <div className="h-6 bg-muted rounded w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

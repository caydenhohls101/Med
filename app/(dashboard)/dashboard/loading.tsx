export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded-lg w-72" />
        <div className="h-4 bg-muted rounded w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-2">
            <div className="h-9 bg-muted rounded w-12" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="h-6 bg-muted rounded w-48" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
            <div className="h-5 bg-muted rounded w-12 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-56" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
            <div className="h-6 bg-muted rounded w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

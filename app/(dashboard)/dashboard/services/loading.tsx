export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded-lg w-28" />
        <div className="h-9 bg-muted rounded-lg w-28" />
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="space-y-1.5">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-28" />
            </div>
            <div className="h-6 bg-muted rounded w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

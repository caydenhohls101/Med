export default function Loading() {
  return (
    <div className="flex" style={{ height: "calc(100vh - 56px)" }}>
      <div className="w-80 shrink-0 border-r bg-background flex flex-col animate-pulse">
        <div className="p-3 border-b">
          <div className="h-9 bg-muted rounded-lg" />
          <div className="h-3 bg-muted rounded w-24 mt-2 mx-1" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-4 bg-muted rounded w-36" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-muted animate-pulse" />
    </div>
  );
}

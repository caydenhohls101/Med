export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary mb-3">
            <span className="text-primary-foreground text-xl font-bold">M</span>
          </div>
          <a href="/" className="text-2xl font-bold hover:text-primary transition-colors">MediBook</a>
          <p className="text-sm text-muted-foreground mt-1">
            SA Medical Booking Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

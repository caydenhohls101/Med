"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <section className="bg-background font-sans min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div
          className="h-[250px] sm:h-[320px] bg-center bg-no-repeat bg-contain"
          style={{
            backgroundImage:
              "url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)",
          }}
          aria-hidden="true"
        >
          <h1 className="text-center text-7xl sm:text-8xl font-bold text-foreground pt-8">
            404
          </h1>
        </div>

        <div className="mt-[-40px] space-y-3">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
            Looks like you&apos;re lost
          </h3>
          <p className="text-muted-foreground">
            The page you are looking for is not available.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
            >
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

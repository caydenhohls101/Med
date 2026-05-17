"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signupPatient } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

function PatientForm() {
  const [state, action, pending] = useActionState(signupPatient, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Patient Account</CardTitle>
        <CardDescription>Book appointments at any listed practice</CardDescription>
      </CardHeader>
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" required placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" required placeholder="Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="jane@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input id="mobile" name="mobile" type="tel" required placeholder="0821234567" />
            <p className="text-xs text-muted-foreground">South African number (0xx or +27xx)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="Min. 8 characters" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create Account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function PatientSignupPage() {
  return (
    <Suspense>
      <PatientForm />
    </Suspense>
  );
}

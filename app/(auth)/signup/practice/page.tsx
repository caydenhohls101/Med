"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupPractice } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PROVINCES = [
  "Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape",
  "Free State","Limpopo","Mpumalanga","North West","Northern Cape",
];

export default function PracticeSignupPage() {
  const [state, action, pending] = useActionState(signupPractice, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Your Practice</CardTitle>
        <CardDescription>14-day free trial · No credit card required</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Details</p>
          <div className="space-y-1.5">
            <Label htmlFor="name">Your Full Name</Label>
            <Input id="name" name="name" required placeholder="Dr Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@practice.co.za" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} placeholder="Min. 8 chars" />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Practice Details</p>
          <div className="space-y-1.5">
            <Label htmlFor="practiceName">Practice Name</Label>
            <Input id="practiceName" name="practiceName" required placeholder="Smith Family Practice" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Practice Phone</Label>
            <Input id="phone" name="phone" type="tel" required placeholder="+27 11 123 4567" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Address (shown on map)</p>
          <div className="space-y-1.5">
            <Label htmlFor="addressLine1">Street Address</Label>
            <Input id="addressLine1" name="addressLine1" required placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="suburb">Suburb</Label>
              <Input id="suburb" name="suburb" required placeholder="Sandton" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required placeholder="Johannesburg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="province">Province</Label>
              <select
                id="province"
                name="province"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select…</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" required placeholder="2196" maxLength={4} pattern="\d{4}" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating practice…" : "Create Practice Account"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

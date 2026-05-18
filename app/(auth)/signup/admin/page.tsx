"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAdmin } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function AdminSignupPage() {
  const [state, action, pending] = useActionState(signupAdmin, null);

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <ShieldCheck className="w-10 h-10 text-amber-700 mb-1" />
        <CardTitle>Platform Admin Account</CardTitle>
        <CardDescription>
          For MediBook SA platform owners only. You need the admin access code to proceed.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Your Full Name</Label>
            <Input id="name" name="name" required placeholder="Dumel du Plessis" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@medibook.co.za" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="Min. 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminCode">Admin Access Code</Label>
            <Input
              id="adminCode"
              name="adminCode"
              type="password"
              required
              placeholder="Enter the platform admin code"
              className="border-amber-300 focus-visible:ring-amber-400"
            />
            <p className="text-xs text-muted-foreground">
              This code is set by the platform owner in the server configuration.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={pending}>
            {pending ? "Creating account…" : "Create Admin Account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Not an admin?{" "}
            <Link href="/signup" className="text-primary hover:underline">Back to signup</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

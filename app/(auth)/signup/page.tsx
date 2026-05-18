import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, ShieldCheck } from "lucide-react";

export default function SignupChoicePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Create an Account</h2>
      <p className="text-sm text-center text-muted-foreground">Choose the account type that applies to you</p>

      <div className="grid gap-3">
        {/* Patient */}
        <Link href="/signup/patient" className="block">
          <Card className="hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <CardHeader className="pb-2 pt-4">
              <User className="w-8 h-8 text-primary mb-1" />
              <CardTitle className="text-base">I&apos;m a Patient</CardTitle>
              <CardDescription>
                Find doctors near you and book appointments online.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 text-sm text-primary font-medium">
              Create patient account →
            </CardContent>
          </Card>
        </Link>

        {/* Practice owner */}
        <Link href="/signup/practice" className="block">
          <Card className="hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <CardHeader className="pb-2 pt-4">
              <Building2 className="w-8 h-8 text-primary mb-1" />
              <CardTitle className="text-base">I Run a Medical Practice</CardTitle>
              <CardDescription>
                List your practice, manage doctors, services, and accept online bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 text-sm text-primary font-medium">
              Set up your practice →
            </CardContent>
          </Card>
        </Link>

        {/* Platform admin */}
        <Link href="/signup/admin" className="block">
          <Card className="hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer border-amber-200">
            <CardHeader className="pb-2 pt-4">
              <ShieldCheck className="w-8 h-8 text-amber-700 mb-1" />
              <CardTitle className="text-base text-amber-800">MediBook Platform Admin</CardTitle>
              <CardDescription>
                For MediBook platform owners — manage the directory, find new practices, and grow the network.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 text-sm text-amber-700 font-medium">
              Requires admin access code →
            </CardContent>
          </Card>
        </Link>
      </div>

      <p className="text-sm text-center text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupChoicePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Create an Account</h2>
      <div className="grid gap-4">
        <Link href="/signup/practice" className="block">
          <Card className="hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="text-3xl mb-1">🏥</div>
              <CardTitle className="text-base">I Run a Medical Practice</CardTitle>
              <CardDescription>
                List your practice, manage doctors, services, and accept online bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary font-medium">
              Set up your practice →
            </CardContent>
          </Card>
        </Link>

        <Link href="/signup/patient" className="block">
          <Card className="hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="text-3xl mb-1">🧑‍⚕️</div>
              <CardTitle className="text-base">I&apos;m Looking for a Doctor</CardTitle>
              <CardDescription>
                Browse practices near you and book appointments online, 24/7.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary font-medium">
              Create patient account →
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

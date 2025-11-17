"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-lg p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">Kuwait Re Portal</h1>
          <p className="text-sm text-muted-foreground">
            Sign in securely with your corporate SSO account to access the dashboard.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Unable to sign you in ({error}). Please try again or contact support.
          </div>
        )}

        <form action="/api/auth/login" method="GET">
          <input type="hidden" name="next" value={params.get("next") ?? "/"} />
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            Continue with Single Sign-On
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="mailto:support@kuwaitre.com" className="text-primary hover:underline">
            Contact the administrator
          </Link>
        </p>
      </div>
    </div>
  );
}



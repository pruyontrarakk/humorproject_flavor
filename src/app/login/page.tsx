"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get("error");

  async function handleSignIn() {
    setLoading(true);
    const supabase = createClient();
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectTo = `${base}/auth/callback`;

    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (authError) {
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-950/90">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-800 dark:text-brand-200">Admin sign in</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-400">
            Admin access only
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Use your Google account. Access is limited to profiles where{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">is_superadmin</span> or{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">is_matrix_admin</span> is true.
          </p>
        </div>

        {error === "auth" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
            Sign-in failed. Please try again.
          </p>
        )}
        {error === "unauthorized" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            You don&apos;t have permission to access this app. Only approved admins can sign in.
          </p>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
        >
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

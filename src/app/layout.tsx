import type { Metadata } from "next";
import "./globals.css";
import { AuthNav } from "@/components/AuthNav";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export const metadata: Metadata = {
  title: "Humor Flavor Admin",
  description: "Admin tool for managing humor flavors and flavor steps."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-brand-800 dark:text-brand-200 sm:text-3xl">
                  Humor Flavor Admin
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Build and test prompt chains for humor flavor caption generation.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 sm:shrink-0">
              <ThemeSwitcher />
              <AuthNav />
            </div>
          </header>
          <main className="flex-1 pb-6">{children}</main>
          <footer className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-500">
            Powered by Supabase · Admin-only area
          </footer>
        </div>
      </body>
    </html>
  );
}

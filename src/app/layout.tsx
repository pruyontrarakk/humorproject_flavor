import type { Metadata } from "next";
import "./globals.css";
import { AuthNav } from "@/components/AuthNav";

export const metadata: Metadata = {
  title: "Humor Flavor Admin",
  description: "Admin tool for managing humor flavors and flavor steps."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-transparent text-black selection:bg-brand-primary selection:text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex w-1/4 justify-start">
              {/* RESERVED FOR NAVIGATION */}
            </div>

            <div className="flex flex-1 flex-col items-center text-center">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black sm:text-5xl">
                Flavor Admin
              </h1>
              <div className="mt-1 bg-black px-3 py-0.5 text-[0.6rem] font-bold tracking-[0.4em] text-white">
                PROMPT CHAIN ORCHESTRATOR
              </div>
            </div>

            <div className="flex w-1/4 justify-end text-right">
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

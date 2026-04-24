"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-black truncate max-w-[150px]" title={user.email ?? undefined}>
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="border-2 border-black bg-black px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black"
      >
        Sign out
      </button>
    </div>
  );
}

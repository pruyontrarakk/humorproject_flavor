import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuthResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Server-only: current session user must be superadmin or matrix admin.
 */
export async function requireAdminSupabase(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, status: 401, message: "Not signed in." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 403, message: error.message };
  }

  const allowed = Boolean(profile?.is_superadmin || profile?.is_matrix_admin);
  if (!allowed) {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  return { ok: true, userId: user.id, supabase };
}

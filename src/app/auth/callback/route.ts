import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin, is_matrix_admin")
    .eq("id", userId)
    .maybeSingle();

  const canAccess = Boolean(profile?.is_superadmin || profile?.is_matrix_admin);

  if (profileError || !canAccess) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}

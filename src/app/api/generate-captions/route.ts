import { NextResponse } from "next/server";
import { requireAdminSupabase } from "@/lib/auth/admin";

type StepRow = {
  humor_flavor_step_type_id: number | string;
  llm_system_prompt?: string | null;
  llm_user_prompt?: string | null;
  description?: string | null;
};

/**
 * Loads the humor flavor chain from Supabase and forwards it to your caption API.
 * Configure CAPTION_API_URL (full URL to POST). Optional CAPTION_API_KEY as Bearer token.
 */
export async function POST(request: Request) {
  const auth = await requireAdminSupabase();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { humorFlavorId?: number | string; imageUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const humorFlavorId = body.humorFlavorId;
  const imageUrl = body.imageUrl?.trim();

  if (humorFlavorId === undefined || humorFlavorId === null || humorFlavorId === "") {
    return NextResponse.json({ error: "humorFlavorId is required." }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const { data: steps, error: stepsError } = await auth.supabase
    .from("humor_flavor_steps")
    .select(
      "id, humor_flavor_id, humor_flavor_step_type_id, description, llm_system_prompt, llm_user_prompt"
    )
    .eq("humor_flavor_id", humorFlavorId)
    .order("humor_flavor_step_type_id", { ascending: true });

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  const captionApiUrl =
    process.env.CAPTION_API_URL ?? process.env.ALMOST_CRACKD_CAPTION_URL ?? "";

  if (!captionApiUrl) {
    return NextResponse.json(
      {
        error:
          "Missing CAPTION_API_URL (or ALMOST_CRACKD_CAPTION_URL) in server environment. Add it to .env.local."
      },
      { status: 500 }
    );
  }

  const payload = {
    image_url: imageUrl,
    humor_flavor_id: humorFlavorId,
    steps: (steps ?? []).map((s: StepRow) => ({
      humor_flavor_step_type_id: s.humor_flavor_step_type_id,
      description: s.description ?? null,
      llm_system_prompt: s.llm_system_prompt ?? null,
      llm_user_prompt: s.llm_user_prompt ?? null
    }))
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const key = process.env.CAPTION_API_KEY ?? process.env.ALMOST_CRACKD_API_KEY;
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(captionApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const text = await upstream.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw text
  }

  return NextResponse.json(
    {
      ok: upstream.ok,
      status: upstream.status,
      humor_flavor_id: humorFlavorId,
      step_count: (steps ?? []).length,
      upstream: parsed
    },
    { status: upstream.ok ? 200 : 502 }
  );
}

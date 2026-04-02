import { NextResponse } from "next/server";
import { requireAdminSupabase } from "@/lib/auth/admin";

type StepRow = {
  humor_flavor_step_type_id: number | string;
  llm_input_type_id?: number | string | null;
  llm_output_type_id?: number | string | null;
  llm_model_id?: number | string | null;
  llm_system_prompt?: string | null;
  llm_user_prompt?: string | null;
  description?: string | null;
};

/** Same as `humorproject` upload flow: POST + `{ imageId }` + Supabase JWT. */
const DEFAULT_ALMOST_CRACKD_PIPELINE_CAPTIONS_URL =
  "https://api.almostcrackd.ai/pipeline/generate-captions";

function isPipelineGenerateCaptionsUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path.endsWith("/pipeline/generate-captions");
  } catch {
    return url.trim().includes("/pipeline/generate-captions");
  }
}

/**
 * Forwards caption requests to your API.
 *
 * - **Almost Crack’d pipeline** (default URL or any URL ending in `/pipeline/generate-captions`):
 *   `POST` with `{ imageId }` and `Authorization: Bearer <Supabase access_token>` — matches
 *   `humorproject/app/upload/page.tsx`.
 *
 * - **Custom course API** (any other `CAPTION_API_URL`): `POST` JSON
 *   `{ image_url, humor_flavor_id, steps }` and optional `CAPTION_API_KEY` Bearer.
 */
export async function POST(request: Request) {
  const auth = await requireAdminSupabase();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: {
    humorFlavorId?: number | string;
    imageUrl?: string;
    imageId?: number | string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const captionApiUrl = (
    process.env.CAPTION_API_URL ||
    process.env.ALMOST_CRACKD_CAPTION_URL ||
    DEFAULT_ALMOST_CRACKD_PIPELINE_CAPTIONS_URL
  ).trim();

  const pipelineMode = isPipelineGenerateCaptionsUrl(captionApiUrl);

  if (pipelineMode) {
    let imageId =
      body.imageId === undefined || body.imageId === null ? "" : String(body.imageId).trim();

    if (!imageId && body.imageUrl?.trim()) {
      const { data: row } = await auth.supabase
        .from("images")
        .select("id")
        .eq("url", body.imageUrl.trim())
        .maybeSingle();
      if (row?.id != null && String(row.id).trim() !== "") {
        imageId = String(row.id).trim();
      }
    }

    if (!imageId) {
      return NextResponse.json(
        {
          error:
            "imageId is required (images.id — same id the pipeline returns after upload). Send it from the picker, or ensure imageUrl matches a row in images."
        },
        { status: 400 }
      );
    }

    const {
      data: { session }
    } = await auth.supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "No Supabase session token available for Almost Crack’d API. Sign in again and retry."
        },
        { status: 401 }
      );
    }

    const pipelinePayload = { imageId };

    let upstream: Response;
    try {
      upstream = await fetch(captionApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pipelinePayload)
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
        mode: "pipeline",
        caption_api_url: captionApiUrl,
        ok: upstream.ok,
        status: upstream.status,
        image_id: imageId,
        humor_flavor_id: body.humorFlavorId ?? null,
        note:
          "Almost Crack’d pipeline uses imageId only; it does not read humor_flavor_id from this request.",
        upstream: parsed
      },
      { status: upstream.ok ? 200 : 502 }
    );
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
      "id, humor_flavor_id, humor_flavor_step_type_id, llm_input_type_id, llm_output_type_id, llm_model_id, description, llm_system_prompt, llm_user_prompt"
    )
    .eq("humor_flavor_id", humorFlavorId)
    .order("order_by", { ascending: true })
    .order("humor_flavor_step_type_id", { ascending: true });

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  const payload = {
    image_url: imageUrl,
    humor_flavor_id: humorFlavorId,
    steps: (steps ?? []).map((s: StepRow) => ({
      humor_flavor_step_type_id: s.humor_flavor_step_type_id,
      llm_input_type_id: s.llm_input_type_id ?? null,
      llm_output_type_id: s.llm_output_type_id ?? null,
      llm_model_id: s.llm_model_id ?? null,
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
      mode: "custom",
      ok: upstream.ok,
      status: upstream.status,
      humor_flavor_id: humorFlavorId,
      step_count: (steps ?? []).length,
      upstream: parsed
    },
    { status: upstream.ok ? 200 : 502 }
  );
}

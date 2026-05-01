"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ImageRow = {
  id: string;
  url?: string | null;
  created_datetime_utc?: string | null;
};

type HumorFlavor = {
  id: number | string;
  description?: string | null;
  slug?: string | null;
};

function extractCaptionsFromGenerateResponse(json: unknown): { id?: string; content?: string }[] {
  if (!json || typeof json !== "object") return [];
  const upstream = (json as Record<string, unknown>).upstream;
  if (!Array.isArray(upstream)) return [];
  return upstream.map((item, i) => {
    if (!item || typeof item !== "object") return { id: `row-${i}`, content: undefined };
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : undefined;
    const content = typeof row.content === "string" ? row.content : undefined;
    return { id, content };
  });
}

export default function TestCaptionsPage() {
  const params = useParams();
  const flavorId = String(params.flavorId ?? "");

  const supabase = useMemo(() => createClient(), []);

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genPreviewImageUrl, setGenPreviewImageUrl] = useState<string | null>(null);
  const [genCaptionRows, setGenCaptionRows] = useState<{ id?: string; content?: string }[]>([]);

  const loadFlavor = useCallback(async () => {
    if (!flavorId) return;
    const { data } = await supabase.from("humor_flavors").select("*").eq("id", flavorId).maybeSingle();
    if (data) setFlavor(data as HumorFlavor);
  }, [flavorId, supabase]);

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    setImagesError(null);
    const { data, error } = await supabase
      .from("images")
      .select("id, url, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false })
      .limit(40);
    if (error) {
      setImagesError(error.message);
      setImages([]);
    } else {
      setImages((data as ImageRow[]) ?? []);
    }
    setImagesLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFlavor();
    void loadImages();
  }, [loadFlavor, loadImages]);

  async function handleGenerate() {
    setGenError(null);
    setGenPreviewImageUrl(null);
    setGenCaptionRows([]);

    const sid = selectedImageId.trim();
    if (!sid) {
      setGenError("Pick a test image first.");
      return;
    }
    const img = images.find(i => String(i.id) === sid);
    const url = img?.url?.trim();
    if (!img || !url) {
      setGenError("Selected image has no URL.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humorFlavorId: flavorId, imageUrl: url, imageId: String(img.id) })
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json.error ?? JSON.stringify(json));
        return;
      }
      setGenPreviewImageUrl(url);
      setGenCaptionRows(extractCaptionsFromGenerateResponse(json));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setGenerating(false);
    }
  }

  const genCaptionsWithText = genCaptionRows.filter(c => c.content?.trim());
  const flavorLabel = flavor
    ? String(flavor.description || flavor.slug || flavor.id)
    : flavorId;

  return (
    <div className="space-y-5">
      {/* Full-page loading overlay */}
      {generating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin border-4 border-black border-t-transparent" />
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-black">
              Generating captions…
            </p>
            <p className="max-w-xs text-center text-xs text-slate-500">
              Running the prompt chain for{" "}
              <span className="font-semibold text-black">{flavorLabel}</span>
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="card overflow-hidden">
        <div className="border-b-2 border-black bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-slate-400">
                Test captions
              </p>
              <h2 className="mt-0.5 text-lg font-black uppercase tracking-tight text-black">
                {flavorLabel}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={generating || !selectedImageId}
                onClick={handleGenerate}
                className="btn-primary"
              >
                Generate captions
              </button>
              <Link
                href={`/flavor/${flavorId}`}
                className="inline-flex items-center gap-1 border-2 border-red-800 bg-white px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-red-800 transition hover:bg-red-800 hover:text-white"
              >
                ← Back to flavor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Image picker */}
      <section className="card overflow-hidden">
        <div className="border-b-2 border-black px-4 py-3">
          <h2 className="section-title">Pick a test image</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          {imagesLoading && <p className="text-sm text-slate-500">Loading images…</p>}
          {imagesError && (
            <p className="border-2 border-black bg-black px-3 py-2 text-xs font-bold text-white">
              {imagesError}
            </p>
          )}
          {!imagesLoading && images.length === 0 && (
            <p className="text-sm text-slate-500">No images found in the images table.</p>
          )}

          {images.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {images.slice(0, 20).map(img => (
                  <button
                    key={img.id}
                    type="button"
                    className={[
                      "overflow-hidden border-2 bg-slate-100 p-0 transition",
                      selectedImageId === String(img.id)
                        ? "border-black ring-2 ring-black ring-offset-1"
                        : "border-transparent hover:border-black"
                    ].join(" ")}
                    onClick={() => setSelectedImageId(String(img.id))}
                    title={img.url ?? ""}
                  >
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" src={img.url} width={88} height={88} className="h-[88px] w-[88px] object-cover" />
                    ) : (
                      <span className="flex h-[88px] w-[88px] items-center justify-center text-xs text-slate-400">
                        no url
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-1 block text-[0.65rem] font-black uppercase tracking-widest text-slate-400">
                  Or select by id
                </span>
                <select
                  className="input"
                  value={selectedImageId}
                  onChange={e => setSelectedImageId(e.target.value)}
                >
                  <option value="">— Pick an image —</option>
                  {images.map(img => (
                    <option key={img.id} value={String(img.id)}>
                      {String(img.id).slice(0, 8)}… {img.url ? img.url.slice(0, 52) + "…" : "(no url)"}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {genError && (
            <p className="border-2 border-black bg-black px-3 py-2 text-xs font-bold text-white">
              {genError}
            </p>
          )}
        </div>
      </section>

      {/* Results */}
      {genPreviewImageUrl && (
        <section className="card overflow-hidden">
          <div className="border-b-2 border-black px-4 py-3">
            <h2 className="section-title">Results</h2>
            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
              {genCaptionsWithText.length} caption{genCaptionsWithText.length !== 1 ? "s" : ""} generated
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              <div className="shrink-0 md:w-[min(100%,280px)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={genPreviewImageUrl}
                  alt="Test image"
                  className="w-full border-2 border-black object-contain"
                  style={{ maxHeight: "min(360px, 50vh)" }}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {genCaptionsWithText.length === 0 ? (
                  <p className="border-2 border-black px-4 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                    No caption text returned
                  </p>
                ) : (
                  genCaptionsWithText.map((caption, i) => (
                    <div
                      key={caption.id ?? i}
                      className="border-2 border-black px-4 py-3 text-sm leading-relaxed text-black"
                    >
                      {caption.content}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
